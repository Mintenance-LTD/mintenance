/**
 * Tests for FeatureAccessManager.
 *
 * 2026-05-22 Sprint 2.1 rewrite. The pre-existing test suite mocked
 * `supabase.from('contractor_subscriptions')` + `feature_usage` direct
 * reads, but the impl moved to `mobileApiClient.get('/api/subscriptions/
 * feature-access')` on 2026-05-01 (audit P0-1). The tests had been
 * silently broken in CI ever since.
 *
 * This rewrite:
 * - Mocks `mobileApiClient` via the existing manual mock at
 *   `apps/mobile/src/utils/__mocks__/mobileApiClient.ts`.
 * - Uses the canonical API response shape (role/tier/status/usage[]).
 * - Updates assertions for the new Sprint 1 tier limits: basic
 *   bid limit = 10 (was 20), CONTRACTOR_SOCIAL_FEED dropped,
 *   CONTRACTOR_ACTIVE_JOBS_LIMIT added.
 * - Covers initialize, hasAccess (boolean / numeric / unlimited /
 *   admin / homeowner roles), getRemainingUsage, trackUsage,
 *   getUpgradeTiers, clear, and the public helpers.
 */
import {
  FeatureAccessManager,
  featureAccess,
  canPerformAction,
  formatLimit,
  getCategoryColor,
  MOBILE_FEATURES,
  TIER_PRICING,
  type SubscriptionTier,
} from '../../utils/featureAccess';
import { mobileApiClient } from '../../utils/mobileApiClient';

// Auto-mock mobileApiClient (picks up __mocks__/mobileApiClient.ts).
jest.mock('../../utils/mobileApiClient');

jest.mock('@mintenance/shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

interface FeatureAccessResponse {
  role: 'homeowner' | 'contractor' | 'admin';
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  earlyAccess: boolean;
  usage: Array<{
    featureId: string;
    used: number;
    limit: number;
    resetDate: string;
  }>;
}

/**
 * Helper: build a feature-access API response with sensible defaults.
 * Per-test overrides via the partial param.
 */
function buildResponse(
  partial: Partial<FeatureAccessResponse> = {}
): FeatureAccessResponse {
  return {
    role: 'contractor',
    tier: 'basic',
    status: 'active',
    currentPeriodEnd: null,
    earlyAccess: false,
    usage: [],
    ...partial,
  };
}

/** Prime the mocked GET endpoint with a response. */
function primeAccessResponse(partial: Partial<FeatureAccessResponse> = {}) {
  mockedApiClient.get.mockResolvedValueOnce(buildResponse(partial));
}

describe('FeatureAccessManager', () => {
  let manager: FeatureAccessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = FeatureAccessManager.getInstance();
    manager.clear();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance across calls', () => {
      const a = FeatureAccessManager.getInstance();
      const b = FeatureAccessManager.getInstance();
      expect(a).toBe(b);
    });

    it('exposes the same instance via the `featureAccess` export', () => {
      expect(featureAccess).toBe(FeatureAccessManager.getInstance());
    });
  });

  describe('initialize()', () => {
    it('short-circuits for homeowner role without calling the API', async () => {
      await manager.initialize('homeowner-1', 'homeowner');
      expect(mockedApiClient.get).not.toHaveBeenCalled();
      // No subscription set; getTier returns default 'trial'.
      expect(manager.getTier()).toBe('trial');
    });

    it('maps server "basic" tier through unchanged', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('contractor-1', 'contractor');
      expect(manager.getTier()).toBe('basic');
    });

    it('maps server "professional"/"pro"/"business" all to mobile "professional"', async () => {
      primeAccessResponse({ tier: 'professional' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('professional');

      manager.clear();
      primeAccessResponse({ tier: 'pro' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('professional');

      manager.clear();
      primeAccessResponse({ tier: 'business' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('professional');
    });

    it('maps server "enterprise" through unchanged', async () => {
      primeAccessResponse({ tier: 'enterprise' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('enterprise');
    });

    it('maps server "free" to mobile "trial"', async () => {
      primeAccessResponse({ tier: 'free' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('trial');
    });

    it('stores usage entries from the response', async () => {
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 4,
            limit: 10,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      // Basic bid limit is 10 (Sprint 1). Used 4 -> remaining 6.
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(6);
    });

    it('falls back to "trial" tier on API error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network down'));
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('trial');
    });
  });

  describe('hasAccess() — contractor role', () => {
    it('grants boolean=true features (e.g. DISCOVERY_CARD on basic+)', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      expect(manager.hasAccess('CONTRACTOR_DISCOVERY_CARD', 'contractor')).toBe(
        true
      );
    });

    it('denies boolean=false features (e.g. DISCOVERY_CARD on trial)', async () => {
      primeAccessResponse({ tier: 'free' }); // mapped to trial
      await manager.initialize('c1', 'contractor');
      expect(manager.hasAccess('CONTRACTOR_DISCOVERY_CARD', 'contractor')).toBe(
        false
      );
    });

    it('grants when numeric limit not yet reached', async () => {
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 5,
            limit: 10,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      // 5 < 10 → access
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(
        true
      );
    });

    it('denies when numeric limit exceeded', async () => {
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 10,
            limit: 10,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      // 10 >= 10 → denied
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(
        false
      );
    });

    it("grants 'unlimited' tier regardless of usage", async () => {
      primeAccessResponse({
        tier: 'enterprise',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 9999,
            limit: 9999,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(
        true
      );
    });

    it('returns false for an unknown feature id', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      expect(manager.hasAccess('NOT_A_REAL_FEATURE', 'contractor')).toBe(false);
    });

    it('returns false when contractor never initialized', () => {
      // Fresh manager, no init.
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(
        false
      );
    });
  });

  describe('hasAccess() — admin + homeowner roles', () => {
    it('grants admin access to any feature without initialize', () => {
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'admin')).toBe(true);
      expect(manager.hasAccess('HOMEOWNER_POST_JOBS', 'admin')).toBe(true);
    });

    it('grants homeowner access only for homeowner=true features', () => {
      // HOMEOWNER_POST_JOBS has limits: { homeowner: true }
      expect(manager.hasAccess('HOMEOWNER_POST_JOBS', 'homeowner')).toBe(true);
      // CONTRACTOR_BID_LIMIT has no `homeowner` limit set -> falsy
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'homeowner')).toBe(
        false
      );
    });
  });

  describe('getRemainingUsage()', () => {
    it('subtracts used from the feature definition limit (not the API limit)', async () => {
      // Server claims limit_count: 20 but the feature def says basic = 10.
      // Impl reads the def, not the API — so remaining = 10 - 5 = 5.
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 5,
            limit: 20, // intentional drift; impl ignores this
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(5);
    });

    it("returns 'unlimited' for unlimited-tier features", async () => {
      primeAccessResponse({ tier: 'enterprise' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(
        'unlimited'
      );
    });

    it('returns 0 for boolean-limit features (no numeric remaining concept)', async () => {
      primeAccessResponse({ tier: 'professional' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getRemainingUsage('CONTRACTOR_DISCOVERY_CARD')).toBe(0);
    });

    it('returns 0 for unknown features', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getRemainingUsage('NOT_A_REAL_FEATURE')).toBe(0);
    });

    it('clamps to 0 when usage exceeds the limit', async () => {
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 25,
            limit: 10,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(0);
    });
  });

  describe('trackUsage()', () => {
    it('POSTs to the tracking endpoint and updates local cache', async () => {
      primeAccessResponse({
        tier: 'basic',
        usage: [
          {
            featureId: 'CONTRACTOR_BID_LIMIT',
            used: 4,
            limit: 10,
            resetDate: '2026-06-01',
          },
        ],
      });
      await manager.initialize('c1', 'contractor');

      mockedApiClient.post.mockResolvedValueOnce({});
      const ok = await manager.trackUsage('c1', 'CONTRACTOR_BID_LIMIT', 2);
      expect(ok).toBe(true);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/subscriptions/feature-access/track',
        { featureId: 'CONTRACTOR_BID_LIMIT', incrementBy: 2 }
      );
      // 4 + 2 = 6 used; basic limit 10 -> remaining 4.
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(4);
    });

    it('defaults incrementBy to 1', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      mockedApiClient.post.mockResolvedValueOnce({});
      await manager.trackUsage('c1', 'CONTRACTOR_BID_LIMIT');
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/subscriptions/feature-access/track',
        { featureId: 'CONTRACTOR_BID_LIMIT', incrementBy: 1 }
      );
    });

    it('returns false on API error and does not throw', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      mockedApiClient.post.mockRejectedValueOnce(new Error('500'));
      const ok = await manager.trackUsage('c1', 'CONTRACTOR_BID_LIMIT', 1);
      expect(ok).toBe(false);
    });
  });

  describe('getUpgradeTiers()', () => {
    it('lists tiers with strictly better numeric access', async () => {
      primeAccessResponse({ tier: 'basic' });
      await manager.initialize('c1', 'contractor');
      // CONTRACTOR_ACTIVE_JOBS_LIMIT: basic=3, professional='unlimited',
      // enterprise='unlimited'. Both pro and enterprise qualify.
      const upgrades = manager.getUpgradeTiers('CONTRACTOR_ACTIVE_JOBS_LIMIT');
      expect(upgrades).toContain('professional');
      expect(upgrades).toContain('enterprise');
    });

    it('returns [] for a feature already at unlimited on current tier', async () => {
      primeAccessResponse({ tier: 'enterprise' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getUpgradeTiers('CONTRACTOR_BID_LIMIT')).toEqual([]);
    });

    it('returns [] when manager has no subscription yet', () => {
      expect(manager.getUpgradeTiers('CONTRACTOR_BID_LIMIT')).toEqual([]);
    });
  });

  describe('clear()', () => {
    it('drops subscription + usage so subsequent reads return defaults', async () => {
      primeAccessResponse({ tier: 'professional' });
      await manager.initialize('c1', 'contractor');
      expect(manager.getTier()).toBe('professional');

      manager.clear();
      expect(manager.getTier()).toBe('trial');
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(
        false
      );
    });
  });

  describe('getFeature()', () => {
    it('returns the feature definition by id', () => {
      const feat = manager.getFeature('CONTRACTOR_BID_LIMIT');
      expect(feat).toBeDefined();
      expect(feat?.id).toBe('CONTRACTOR_BID_LIMIT');
    });

    it('returns undefined for an unknown id', () => {
      expect(manager.getFeature('NOPE')).toBeUndefined();
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('canPerformAction', () => {
    it('allows when manager.hasAccess is true', async () => {
      const m = FeatureAccessManager.getInstance();
      jest.spyOn(m, 'hasAccess').mockReturnValue(true);
      const result = await canPerformAction(
        'u1',
        'homeowner',
        'HOMEOWNER_POST_JOBS'
      );
      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('denies and uses the feature upgrade message when set', async () => {
      const m = FeatureAccessManager.getInstance();
      jest.spyOn(m, 'hasAccess').mockReturnValue(false);
      jest.spyOn(m, 'getFeature').mockReturnValue({
        id: 'CONTRACTOR_BID_LIMIT',
        name: 'Monthly Bids',
        description: 'Number of bids per month',
        category: 'Bidding',
        limits: {},
        upgradeMessage:
          "You've reached your monthly bid limit. Upgrade to submit more bids.",
      });
      const result = await canPerformAction(
        'u1',
        'contractor',
        'CONTRACTOR_BID_LIMIT'
      );
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('monthly bid limit');
    });

    it('falls back to a generic message when feature has no upgradeMessage', async () => {
      const m = FeatureAccessManager.getInstance();
      jest.spyOn(m, 'hasAccess').mockReturnValue(false);
      jest.spyOn(m, 'getFeature').mockReturnValue({
        id: 'X',
        name: 'X',
        description: '',
        category: '',
        limits: {},
      });
      const result = await canPerformAction('u1', 'contractor', 'X');
      expect(result.allowed).toBe(false);
      expect(result.message).toBe(
        'This feature is not available on your current plan.'
      );
    });
  });

  describe('formatLimit', () => {
    it('formats unlimited / number / true / false / undefined', () => {
      expect(formatLimit('unlimited')).toBe('Unlimited');
      expect(formatLimit(100)).toBe('100');
      expect(formatLimit(0)).toBe('0');
      expect(formatLimit(true)).toBe('Full Access');
      expect(formatLimit(false)).toBe('Not Available');
      expect(formatLimit(undefined)).toBe('Not Available');
    });
  });

  describe('getCategoryColor', () => {
    it('returns a string for any input and a stable default for unknowns', () => {
      const known = ['Job Management', 'Bidding', 'Communication'];
      const fallback = getCategoryColor('Unknown Category');
      for (const c of known) {
        expect(typeof getCategoryColor(c)).toBe('string');
      }
      expect(getCategoryColor('')).toBe(fallback);
    });
  });
});

describe('Static config', () => {
  describe('MOBILE_FEATURES', () => {
    it('exposes the homeowner core features', () => {
      for (const id of [
        'HOMEOWNER_POST_JOBS',
        'HOMEOWNER_MESSAGING',
        'HOMEOWNER_VIDEO_CALLS',
        'HOMEOWNER_AI_ASSESSMENT',
      ]) {
        expect(MOBILE_FEATURES[id]).toBeDefined();
      }
    });

    it('exposes the contractor core features incl. the new ACTIVE_JOBS_LIMIT', () => {
      for (const id of [
        'CONTRACTOR_BID_LIMIT',
        'CONTRACTOR_ACTIVE_JOBS_LIMIT', // Sprint 1 addition
        'CONTRACTOR_DISCOVERY_CARD',
        'CONTRACTOR_PORTFOLIO_PHOTOS',
        'CONTRACTOR_MESSAGING',
        'CONTRACTOR_VIDEO_CALLS',
      ]) {
        expect(MOBILE_FEATURES[id]).toBeDefined();
      }
    });

    it('does NOT expose the dropped social-feed feature', () => {
      // Sprint 1 dropped CONTRACTOR_SOCIAL_FEED — marketplace social
      // feeds don't drive value.
      expect(MOBILE_FEATURES.CONTRACTOR_SOCIAL_FEED).toBeUndefined();
    });

    it('uses the new bid limit on basic (10, was 20)', () => {
      const f = MOBILE_FEATURES.CONTRACTOR_BID_LIMIT;
      expect(f.limits.basic).toBe(10);
      expect(f.limits.professional).toBe('unlimited');
      expect(f.limits.enterprise).toBe('unlimited');
    });

    it('uses 3 / unlimited for the active-jobs cap', () => {
      const f = MOBILE_FEATURES.CONTRACTOR_ACTIVE_JOBS_LIMIT;
      expect(f.limits.basic).toBe(3);
      expect(f.limits.professional).toBe('unlimited');
      expect(f.limits.enterprise).toBe('unlimited');
    });
  });

  describe('TIER_PRICING', () => {
    it('lists the four tiers with the published prices', () => {
      expect(TIER_PRICING.trial.price).toBe(0);
      expect(TIER_PRICING.basic.price).toBe(0);
      expect(TIER_PRICING.professional.price).toBe(29);
      expect(TIER_PRICING.enterprise.price).toBe(99);
    });

    it("marks professional 'popular'", () => {
      expect((TIER_PRICING.professional as { popular?: boolean }).popular).toBe(
        true
      );
    });
  });
});
