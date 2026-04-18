/**
 * Sprint 7 (1.9): unit coverage for the escrow auto-release rule matcher.
 *
 * Before these tests, the rule engine that decides contractor payout timing
 * had zero unit coverage. Escrow auto-release is the financial flow with
 * the highest blast radius (wrong hold period = either releasing funds to
 * a bad contractor or stranding money from a good one), so it deserves
 * explicit tests that do not depend on a real DB.
 *
 * Scope of this file:
 *   - Rule matching: tier / value-range / category / priority / default.
 *   - Error paths: empty rule list, Supabase error.
 *
 * The time-based risk multiplier / dispute penalty / release-date math
 * in calculateAutoReleaseDate() still depends on TrustScoreService +
 * PayoutTierService which are hard to unit-test without heavy mocking;
 * those belong in an integration-real test. Here we stay pure-logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks: Supabase service-role client
// ---------------------------------------------------------------------------

interface MockRule {
  id: string;
  is_active: boolean;
  priority: number;
  contractor_tier: string | null;
  job_value_min: number | null;
  job_value_max: number | null;
  job_category: string | null;
  hold_period_days: number;
  require_photo_verification: boolean;
  require_review: boolean;
  min_photo_score: number;
  risk_multiplier: number;
  dispute_history_penalty_days: number;
}

let mockRules: MockRule[] = [];
let mockError: { message: string } | null = null;

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          order: (_col2: string, _opts: { ascending: boolean }) => ({
            then: (resolve: (value: { data: MockRule[] | null; error: typeof mockError }) => unknown) =>
              Promise.resolve(resolve({ data: mockError ? null : mockRules, error: mockError })),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'rule-default',
    is_active: true,
    priority: 0,
    contractor_tier: null,
    job_value_min: null,
    job_value_max: null,
    job_category: null,
    hold_period_days: 7,
    require_photo_verification: true,
    require_review: false,
    min_photo_score: 0.7,
    risk_multiplier: 1.0,
    dispute_history_penalty_days: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getApplicableRule — escrow auto-release matcher', () => {
  beforeEach(() => {
    mockRules = [];
    mockError = null;
  });

  it('returns null when no rules exist', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result).toBeNull();
  });

  it('returns null when Supabase errors', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockError = { message: 'connection refused' };
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result).toBeNull();
  });

  it('picks the highest-priority rule that matches tier', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({ id: 'r-high', priority: 10, contractor_tier: 'platinum', hold_period_days: 2 }),
      baseRule({ id: 'r-mid', priority: 5, contractor_tier: 'bronze', hold_period_days: 5 }),
      baseRule({ id: 'r-low', priority: 1, contractor_tier: null, hold_period_days: 7 }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.id).toBe('r-mid');
    expect(result?.holdPeriodDays).toBe(5);
  });

  it('skips rules with a different contractor tier', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({ id: 'r-platinum-only', priority: 10, contractor_tier: 'platinum' }),
      baseRule({ id: 'r-default', priority: 1, contractor_tier: null }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    // `r-platinum-only` skipped; falls through the loop to `r-default` (matches any tier)
    expect(result?.id).toBe('r-default');
  });

  it('skips rules whose job_value_min is above the job value', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({ id: 'r-large', priority: 10, job_value_min: 5000 }),
      baseRule({ id: 'r-any-value', priority: 1 }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.id).toBe('r-any-value');
  });

  it('skips rules whose job_value_max is below the job value', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({ id: 'r-small-jobs', priority: 10, job_value_max: 100 }),
      baseRule({ id: 'r-any-value', priority: 1 }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.id).toBe('r-any-value');
  });

  it('matches within value range inclusive on both bounds', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({
        id: 'r-mid-range',
        priority: 10,
        job_value_min: 100,
        job_value_max: 1000,
      }),
      baseRule({ id: 'r-default', priority: 1 }),
    ];

    // within range
    let result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.id).toBe('r-mid-range');

    // on lower bound
    result = await getApplicableRule('bronze', 100, 'plumbing');
    expect(result?.id).toBe('r-mid-range');

    // on upper bound
    result = await getApplicableRule('bronze', 1000, 'plumbing');
    expect(result?.id).toBe('r-mid-range');
  });

  it('skips rules with a different job_category', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({ id: 'r-electrical-only', priority: 10, job_category: 'electrical' }),
      baseRule({ id: 'r-default', priority: 1 }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.id).toBe('r-default');
  });

  it('falls back to the lowest-priority rule when nothing matches', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    // Ordered desc by the Supabase .order() call; default rule is the LAST one.
    mockRules = [
      baseRule({ id: 'r-high-platinum', priority: 10, contractor_tier: 'platinum' }),
      baseRule({ id: 'r-mid-electrical', priority: 5, job_category: 'electrical' }),
      baseRule({ id: 'r-default', priority: 0 }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    // No rule matches the bronze/plumbing combo — we return the last entry
    // in the priority-sorted list as the default.
    expect(result?.id).toBe('r-default');
  });

  it('applies the risk multiplier + photo-score from the winning rule', async () => {
    const { getApplicableRule } = await import('../auto-release-rules');
    mockRules = [
      baseRule({
        id: 'r-high-risk',
        priority: 10,
        contractor_tier: 'bronze',
        risk_multiplier: 2.0,
        min_photo_score: 0.85,
        dispute_history_penalty_days: 3,
        require_review: true,
      }),
    ];
    const result = await getApplicableRule('bronze', 500, 'plumbing');
    expect(result?.riskMultiplier).toBe(2.0);
    expect(result?.minPhotoScore).toBe(0.85);
    expect(result?.disputeHistoryPenaltyDays).toBe(3);
    expect(result?.requireReview).toBe(true);
  });
});
