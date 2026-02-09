import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// Import after mocks
import {
  requiresMFA,
  userHasMFAEnabled,
  HighRiskOperation,
} from '../high-risk-checks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a universal chainable Supabase mock.
 * Every chain method returns itself; terminal calls resolve with the provided value.
 */
function chainable(terminalValue: Record<string, unknown>) {
  const chain: Record<string, any> = {};

  // Make it thenable so `await chain.method()` works
  const terminalMock = vi.fn().mockResolvedValue(terminalValue);

  // All methods return the chain (fluent), but also act as promises
  for (const m of ['select', 'eq', 'neq', 'gte', 'gt', 'lt', 'lte', 'limit', 'order', 'single', 'maybeSingle']) {
    if (m === 'single' || m === 'maybeSingle') {
      chain[m] = terminalMock;
    } else {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
  }

  // When the chain itself is awaited (e.g. after .gte()), resolve with terminal
  chain.then = (resolve: (v: any) => void) => resolve(terminalValue);

  return chain;
}

/**
 * Set up default "no issues" mocks for all helper DB queries.
 *
 * - payment_failures: count=0 (no recent failures)
 * - escrow_transactions: count=1 (not first-time user, no velocity issue)
 *   and data=[] for average amount queries
 */
function setupDefaultMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'payment_failures') {
      return chainable({ count: 0, error: null });
    }
    if (table === 'escrow_transactions') {
      // count=1: isFirstTimeTransaction sees count>0 (not first time)
      // count=1: detectUnusualPattern sees count<=3 (not unusual velocity)
      // data=[]: detectUnusualPattern average calc has no history
      return chainable({ count: 1, data: [], error: null });
    }
    // Default for any other table
    return chainable({ data: null, error: null });
  });
}

function mockSupabaseChain(returnValue: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  for (const m of ['select', 'eq', 'gte', 'lt', 'limit', 'single']) {
    if (m === 'single') {
      chain[m] = vi.fn().mockResolvedValue(returnValue);
    } else {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('requiresMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('Rule 1: Escrow releases over threshold', () => {
    it('should require MFA for escrow release > $5,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        6000,
        'user-1'
      );

      expect(result.required).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reason).toContain('Escrow release amount');
    });

    it('should NOT require MFA for escrow release < $5,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        4000,
        'user-1'
      );

      expect(result.required).toBe(false);
    });
  });

  describe('Rule 2: Refunds over threshold', () => {
    it('should require MFA for refund > $1,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.REFUND,
        1500,
        'user-1'
      );

      expect(result.required).toBe(true);
      expect(result.reason).toContain('Refund amount');
    });

    it('should NOT require MFA for refund < $1,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.REFUND,
        500,
        'user-1'
      );

      expect(result.required).toBe(false);
    });
  });

  describe('Rule 3: Account changes always require MFA', () => {
    const accountOperations = [
      HighRiskOperation.PAYOUT_CHANGE,
      HighRiskOperation.BANK_ACCOUNT_CHANGE,
      HighRiskOperation.PAYMENT_METHOD_CHANGE,
    ];

    accountOperations.forEach((operation) => {
      it(`should require MFA for ${operation} regardless of amount`, async () => {
        const result = await requiresMFA(operation, null, 'user-1');

        expect(result.required).toBe(true);
        expect(result.reason).toContain('Account or payout changes');
        expect(result.riskScore).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('Rule 4: Large payments', () => {
    it('should require MFA for payment > $10,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.LARGE_PAYMENT,
        15000,
        'user-1'
      );

      expect(result.required).toBe(true);
      expect(result.reason).toContain('unusually large');
    });

    it('should NOT require MFA for payment < $10,000', async () => {
      const result = await requiresMFA(
        HighRiskOperation.LARGE_PAYMENT,
        5000,
        'user-1'
      );

      expect(result.required).toBe(false);
    });
  });

  describe('Rule 5: Recent payment failures', () => {
    it('should require MFA when user has 2+ recent failures', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'payment_failures') {
          return chainable({ count: 3, error: null });
        }
        return chainable({ count: 1, data: [], error: null });
      });

      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        100,
        'user-1'
      );

      expect(result.required).toBe(true);
      expect(result.reason).toContain('recent payment failures detected');
    });
  });

  describe('Rule 6: First-time large transaction', () => {
    it('should require MFA for first-time user with amount > $2,000', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'payment_failures') {
          return chainable({ count: 0, error: null });
        }
        // count=0: isFirstTimeTransaction returns true (first time)
        return chainable({ count: 0, data: [], error: null });
      });

      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        3000,
        'user-1'
      );

      expect(result.required).toBe(true);
      expect(result.reason).toContain('First-time transaction');
    });
  });

  describe('Risk score capping', () => {
    it('should cap risk score at 100', async () => {
      const result = await requiresMFA(
        HighRiskOperation.PAYOUT_CHANGE,
        null,
        'user-1'
      );

      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Error handling', () => {
    it('should return valid result when helper DB queries fail', async () => {
      // Helper functions catch their own errors and return defaults.
      // The outer function should still return a valid MFARequirement.
      mockFrom.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // With null amount and a non-account-change operation,
      // no rule triggers, so required should be false (helpers return defaults)
      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        100,
        'user-1'
      );

      // Function should still return a valid MFARequirement (not throw)
      expect(result).toHaveProperty('required');
      expect(result).toHaveProperty('operation', HighRiskOperation.ESCROW_RELEASE);
      expect(result).toHaveProperty('riskScore');
    });
  });

  describe('Metadata tracking', () => {
    it('should include amount threshold in metadata', async () => {
      const result = await requiresMFA(
        HighRiskOperation.ESCROW_RELEASE,
        6000,
        'user-1'
      );

      expect(result.metadata?.amountThreshold).toBe(5000);
    });

    it('should include operation type in result', async () => {
      const result = await requiresMFA(
        HighRiskOperation.REFUND,
        500,
        'user-1'
      );

      expect(result.operation).toBe(HighRiskOperation.REFUND);
    });
  });
});

describe('userHasMFAEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when MFA is enabled', async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({ data: { mfa_enabled: true }, error: null })
    );

    const result = await userHasMFAEnabled('user-1');
    expect(result).toBe(true);
  });

  it('should return false when MFA is disabled', async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({ data: { mfa_enabled: false }, error: null })
    );

    const result = await userHasMFAEnabled('user-1');
    expect(result).toBe(false);
  });

  it('should return false when user not found', async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({ data: null, error: { message: 'Not found' } })
    );

    const result = await userHasMFAEnabled('nonexistent');
    expect(result).toBe(false);
  });

  it('should return false on database error', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('DB error');
    });

    const result = await userHasMFAEnabled('user-1');
    expect(result).toBe(false);
  });
});
