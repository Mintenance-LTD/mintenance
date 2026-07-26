/**
 * Tests for the Landlord-tier gates on:
 *   PATCH /api/properties/[id]/recurring-maintenance   (toggle schedule active)
 *   PATCH /api/properties/[id]/report-token            (toggle tenant link active)
 *
 * Regression (2026-07-26 property audit): only the POST handlers on these two
 * routes called requireLandlordTier. A landlord who downgraded to Free could
 * therefore keep re-arming existing auto-create schedules and re-activating
 * old tenant reporting links through PATCH forever — the paid feature never
 * actually switched off.
 *
 * The fix gates the RE-ACTIVATION direction only. Deactivating (is_active:
 * false) and deleting must stay available to every tier, otherwise a
 * downgraded user is trapped with automation they can no longer stop. These
 * tests pin both halves of that contract.
 *
 * `hasFeatureAccess` is mocked rather than exercised for real: the tier->
 * feature matrix in lib/feature-access-config.ts is a separate concern (and is
 * currently being reworked by the tiered-pricing change), whereas what these
 * tests must prove is that the ROUTE consults the gate on re-activation and
 * skips it otherwise.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  verifyAdminRoleFromDatabase: vi.fn(),
  hasValidStepUp: vi.fn(),
  getEffectiveHomeownerTier: vi.fn(),
  hasFeatureAccess: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
  checkApiRateLimit: vi.fn(),
}));

vi.mock('@/lib/admin-verification', () => ({
  verifyAdminRoleFromDatabase: mocks.verifyAdminRoleFromDatabase,
}));

vi.mock('@/lib/auth/mfa-step-up', () => ({
  hasValidStepUp: mocks.hasValidStepUp,
}));

vi.mock('@/lib/subscription/early-access', () => ({
  getEffectiveHomeownerTier: mocks.getEffectiveHomeownerTier,
}));

vi.mock('@/lib/feature-access-config', () => ({
  hasFeatureAccess: mocks.hasFeatureAccess,
}));

vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROPERTY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const adminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'admin' as const,
  first_name: 'Test',
  last_name: 'Admin',
};

/** Supabase query-builder stub: every builder method returns itself. */
function createChainMock(terminals: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'is',
    'in',
    'or',
    'order',
    'limit',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  const result = terminals.result ?? { data: null, error: null };
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  // Some chains are awaited directly (no terminal call).
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function request(method: string, body?: unknown, query = ''): NextRequest {
  return new NextRequest(
    new URL(
      `/api/properties/${PROPERTY_ID}/x${query}`,
      'http://localhost:3000'
    ),
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'x-csrf-token': 'test-csrf-token',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  );
}

function segmentData() {
  return { params: Promise.resolve({ id: PROPERTY_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 29,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.verifyAdminRoleFromDatabase.mockResolvedValue(true);
  mocks.hasValidStepUp.mockResolvedValue(true);

  // Default: a paid landlord who owns the property.
  mocks.getEffectiveHomeownerTier.mockResolvedValue('landlord');
  mocks.hasFeatureAccess.mockReturnValue(true);

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'properties') {
      return createChainMock({
        result: {
          data: { id: PROPERTY_ID, owner_id: 'homeowner-1' },
          error: null,
        },
      });
    }
    // recurring_schedules / anonymous_report_tokens updates
    return createChainMock({
      result: { data: { id: 'row-1', is_active: true }, error: null },
    });
  });
});

// ---------------------------------------------------------------------------
// Recurring maintenance
// ---------------------------------------------------------------------------
describe('PATCH /api/properties/[id]/recurring-maintenance — tier gate', () => {
  async function patchSchedule(is_active: boolean) {
    const { PATCH } =
      await import('@/app/api/properties/[id]/recurring-maintenance/route');
    return PATCH(
      request('PATCH', { scheduleId: 'sched-1', is_active }),
      segmentData()
    );
  }

  it('blocks a downgraded (Free) landlord from re-arming a schedule', async () => {
    mocks.getEffectiveHomeownerTier.mockResolvedValue('free');
    mocks.hasFeatureAccess.mockReturnValue(false);

    const res = await patchSchedule(true);

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.requiresSubscription).toBe(true);
    expect(body.feature).toBe('HOMEOWNER_RECURRING_MAINTENANCE');
  });

  it('still lets a Free-tier user switch a schedule OFF', async () => {
    mocks.getEffectiveHomeownerTier.mockResolvedValue('free');
    mocks.hasFeatureAccess.mockReturnValue(false);

    const res = await patchSchedule(false);

    expect(res.status).toBe(200);
    // The gate must not even be consulted when deactivating.
    expect(mocks.hasFeatureAccess).not.toHaveBeenCalled();
  });

  it('allows a Landlord-tier user to re-arm a schedule', async () => {
    const res = await patchSchedule(true);

    expect(res.status).toBe(200);
    expect(mocks.hasFeatureAccess).toHaveBeenCalledWith(
      'HOMEOWNER_RECURRING_MAINTENANCE',
      'homeowner',
      'landlord'
    );
  });

  it('bypasses the gate entirely for admins', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(adminUser);

    const res = await patchSchedule(true);

    expect(res.status).toBe(200);
    expect(mocks.getEffectiveHomeownerTier).not.toHaveBeenCalled();
  });

  it('leaves DELETE ungated so a downgraded user can still clean up', async () => {
    mocks.getEffectiveHomeownerTier.mockResolvedValue('free');
    mocks.hasFeatureAccess.mockReturnValue(false);

    const { DELETE } =
      await import('@/app/api/properties/[id]/recurring-maintenance/route');
    // scheduleId travels as a query param on this handler, not in the body —
    // passing it in the body would 400 and the assertion would pass vacuously.
    const res = await DELETE(
      request('DELETE', undefined, '?scheduleId=sched-1'),
      segmentData()
    );

    expect(res.status).toBe(200);
    expect(mocks.hasFeatureAccess).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tenant reporting links
// ---------------------------------------------------------------------------
describe('PATCH /api/properties/[id]/report-token — tier gate', () => {
  async function patchToken(is_active: boolean) {
    const { PATCH } =
      await import('@/app/api/properties/[id]/report-token/route');
    return PATCH(
      request('PATCH', { token_id: 'token-1', is_active }),
      segmentData()
    );
  }

  it('blocks a downgraded (Free) landlord from re-activating a tenant link', async () => {
    mocks.getEffectiveHomeownerTier.mockResolvedValue('free');
    mocks.hasFeatureAccess.mockReturnValue(false);

    const res = await patchToken(true);

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.requiresSubscription).toBe(true);
    expect(body.feature).toBe('HOMEOWNER_TENANT_REPORTING');
  });

  it('still lets a Free-tier user take a live tenant link OFFLINE', async () => {
    mocks.getEffectiveHomeownerTier.mockResolvedValue('free');
    mocks.hasFeatureAccess.mockReturnValue(false);

    const res = await patchToken(false);

    expect(res.status).toBe(200);
    expect(mocks.hasFeatureAccess).not.toHaveBeenCalled();
  });

  it('allows a Landlord-tier user to re-activate a link', async () => {
    const res = await patchToken(true);

    expect(res.status).toBe(200);
    expect(mocks.hasFeatureAccess).toHaveBeenCalledWith(
      'HOMEOWNER_TENANT_REPORTING',
      'homeowner',
      'landlord'
    );
  });

  it('bypasses the gate entirely for admins', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(adminUser);

    const res = await patchToken(true);

    expect(res.status).toBe(200);
    expect(mocks.getEffectiveHomeownerTier).not.toHaveBeenCalled();
  });
});
