// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { CostControlService } from '../CostControlService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the private static state of CostControlService between tests */
function resetServiceState() {
  const svc = CostControlService as any;
  svc.currentDaySpend = 0;
  svc.currentMonthSpend = 0;
  svc.lastResetDay = '';
  svc.lastResetMonth = '';
  svc.initialized = false;
}

function mockDbSpend(dailyCosts: number[], monthlyCosts: number[]) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    // Calls 1 = daily, 2 = monthly (from resetCountersIfNeeded)
    const costs = callCount === 1 ? dailyCosts : monthlyCosts;
    return {
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({
            data: costs.map((c) => ({ cost: c })),
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CostControlService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServiceState();
    delete process.env.AI_DAILY_BUDGET;
    delete process.env.AI_MONTHLY_BUDGET;
    delete process.env.AI_MAX_COST_PER_REQUEST;
    delete process.env.AI_ALERT_THRESHOLD;
    delete process.env.AI_EMERGENCY_STOP;
  });

  describe('checkBudget', () => {
    it('should allow request within budget', async () => {
      mockDbSpend([5, 10], [50, 100]);

      const result = await CostControlService.checkBudget({
        service: 'test',
        model: 'gpt-4o',
        estimatedCost: 1.0,
      });

      expect(result.allowed).toBe(true);
      expect(result.dailyBudgetRemaining).toBeGreaterThan(0);
    });

    it('should reject request exceeding per-request limit', async () => {
      mockDbSpend([], []);

      const result = await CostControlService.checkBudget({
        service: 'test',
        model: 'gpt-4o',
        estimatedCost: 10, // Default max is $5
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-request limit');
    });

    it('should reject request when daily budget would be exceeded', async () => {
      // Daily spend already at $99 with $100 budget
      mockDbSpend([99], [99]);

      const result = await CostControlService.checkBudget({
        service: 'test',
        model: 'gpt-4o',
        estimatedCost: 2.0, // 99 + 2 > 100
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily budget would be exceeded');
    });

    it('should reject request when monthly budget would be exceeded', async () => {
      // Monthly spend at $1999 with $2000 budget
      mockDbSpend([10], [1999]);

      const result = await CostControlService.checkBudget({
        service: 'test',
        model: 'gpt-4o',
        estimatedCost: 2.0, // 1999 + 2 > 2000
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly budget would be exceeded');
    });

    it('should allow request on budget check error (fail open)', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('DB down');
      });

      const result = await CostControlService.checkBudget({
        service: 'test',
        model: 'gpt-4o',
        estimatedCost: 1.0,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for gpt-4o with tokens', () => {
      const cost = CostControlService.estimateCost('gpt-4o', {
        inputTokens: 1000,
        outputTokens: 500,
      });

      // gpt-4o: input $0.005/1K, output $0.015/1K
      // 1000/1000 * 0.005 + 500/1000 * 0.015 = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 4);
    });

    it('should estimate cost for image-based models', () => {
      const cost = CostControlService.estimateCost('google-vision', {
        images: 5,
      });

      // google-vision: $0.0015/image * 5 = 0.0075
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it('should return 0 for unknown model', () => {
      const cost = CostControlService.estimateCost('unknown-model', {
        inputTokens: 1000,
      });

      expect(cost).toBe(0);
    });

    it('should handle missing token params', () => {
      const cost = CostControlService.estimateCost('gpt-4o', {});

      expect(cost).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should call DB insert with correct params', async () => {
      // First hydrate from DB so the service is initialized
      mockDbSpend([0], [0]);
      await CostControlService.checkBudget({
        service: 'init',
        model: 'gpt-4o',
        estimatedCost: 0.01,
      });

      // Now set up mock for the insert call
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await CostControlService.recordUsage('test-service', 'gpt-4o', 0.5, {
        tokens: 1000,
        user_id: 'user-1',
        success: true,
      });

      expect(mockFrom).toHaveBeenCalledWith('ai_service_costs');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          model: 'gpt-4o',
          cost: 0.5,
          tokens: 1000,
          user_id: 'user-1',
          success: true,
        })
      );
    });
  });

  describe('emergencyStop', () => {
    it('should set emergency stop flag', async () => {
      expect(await CostControlService.isEmergencyStopped()).toBe(false);

      await CostControlService.emergencyStop();

      expect(await CostControlService.isEmergencyStopped()).toBe(true);
    });
  });

  describe('getBudgetStatus', () => {
    it('should return current budget status with percentages', async () => {
      mockDbSpend([25, 25], [500, 500]);

      const status = await CostControlService.getBudgetStatus();

      expect(status.daily.budget).toBe(100);
      expect(status.daily.spent).toBe(50);
      expect(status.daily.remaining).toBe(50);
      expect(status.daily.percentage).toBe(50);

      expect(status.monthly.budget).toBe(2000);
      expect(status.monthly.spent).toBe(1000);
      expect(status.monthly.remaining).toBe(1000);
      expect(status.monthly.percentage).toBe(50);
    });

    it('should include alerts when approaching thresholds', async () => {
      // 85% of daily budget
      mockDbSpend([85], [85]);

      const status = await CostControlService.getBudgetStatus();

      expect(status.alerts.length).toBeGreaterThan(0);
      expect(status.alerts[0]).toContain('Daily spend');
    });
  });
});
