import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  stats: vi.fn(),
  last: vi.fn(),
  trigger: vi.fn(),
  drift: vi.fn(),
  from: vi.fn(),
  history: vi.fn(),
  recent: vi.fn(),
  select: vi.fn(),
  gte: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: m.warn },
}));
vi.mock('@/lib/services/building-surveyor/YOLOCorrectionService', () => ({
  YOLOCorrectionService: { getCorrectionStats: m.stats },
}));
vi.mock('@/lib/services/building-surveyor/YOLORetrainingService', () => ({
  YOLORetrainingService: { getLastJob: m.last, triggerRetraining: m.trigger },
}));
vi.mock('@/lib/services/building-surveyor/DriftMonitorService', () => ({
  DriftMonitorService: {
    detectDrift: m.drift,
    detectAndAdjustWeights: vi.fn(),
  },
}));
vi.mock('@/lib/services/building-surveyor/ModelEvaluationService', () => ({
  ModelEvaluationService: { getHistoricalMetrics: m.history },
}));
import { ModelRetrainingService } from '@/lib/services/building-surveyor/ModelRetrainingService';
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-25T05:00:00Z'));
  m.stats.mockResolvedValue({ approved: 0 });
  m.last.mockResolvedValue(null);
  m.trigger.mockResolvedValue({ id: 'training' });
  m.drift.mockResolvedValue({ driftScore: 0 });
  m.history.mockResolvedValue([]);
  m.recent.mockResolvedValue({ data: [], error: null });
  const q: any = {};
  for (const key of ['select', 'gte', 'update', 'eq']) q[key] = vi.fn(() => q);
  q.limit = m.recent;
  q.insert = vi.fn(async () => ({ error: null }));
  q.then = (f: Function) =>
    Promise.resolve({ count: 0, error: null }).then(f as any);
  // Model the deployed assessment projection, not an unrestricted fluent mock.
  const assessments: any = { limit: m.recent };
  assessments.select = m.select.mockImplementation((columns: string) => {
    const knownColumns = new Set(['id', 'created_at']);
    if (columns.split(',').some((column) => !knownColumns.has(column.trim()))) {
      throw { code: '42703', message: 'Unknown assessment column' };
    }
    return assessments;
  });
  assessments.gte = m.gte.mockReturnValue(assessments);
  m.from.mockImplementation((table) =>
    table === 'building_assessments' ? assessments : q
  );
});
afterEach(() => vi.useRealTimers());
it('waits for approved corrections instead of triggering an empty training run or claiming drift without a baseline', async () => {
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.retrainingTriggered).toBe(false);
  expect(result.checkResult.awaitingTrainingData).toBe(true);
  expect(result.alerts).toEqual([
    expect.objectContaining({
      type: 'AWAITING_TRAINING_DATA',
      severity: 'info',
    }),
  ]);
  expect(m.trigger).not.toHaveBeenCalled();
  expect(m.drift).not.toHaveBeenCalled();
});
it('allows training once enough approved corrections exist', async () => {
  m.stats.mockResolvedValue({ approved: 50 });
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.retrainingTriggered).toBe(true);
  expect(m.trigger).toHaveBeenCalledTimes(1);
});
it('reports a real trigger failure for admin review', async () => {
  m.stats.mockResolvedValue({ approved: 50 });
  m.trigger.mockRejectedValue(new Error('trainer unavailable'));
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.retrainingTriggered).toBe(false);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({ type: 'RETRAINING_FAILED', severity: 'critical' })
  );
});

function withSamples(count: number) {
  m.recent.mockResolvedValue({
    data: Array.from({ length: count }, (_, id) => ({ id: String(id) })),
    error: null,
  });
}

function withScores(current: number, baseline: number) {
  m.history.mockResolvedValue([
    { test_metrics: { f1_score: current } },
    { test_metrics: { f1_score: baseline } },
  ]);
}

it('evaluates degradation at 100 recent samples using only deployed columns', async () => {
  withSamples(100);
  withScores(0.72, 0.9);
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(m.select).toHaveBeenCalledWith('id');
  expect(m.gte).toHaveBeenCalledWith('created_at', '2026-10-18T05:00:00.000Z');
  expect(m.recent).toHaveBeenCalledWith(100);
  expect(m.history).toHaveBeenCalledWith('yolo', 2);
  expect(result.checkResult.metrics.performanceDegradation).toBeCloseTo(0.2);
  expect(result.checkResult.metrics.recentModelAccuracy).toBe(0.72);
  expect(result.checkResult.performanceCheckFailed).toBe(false);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({ type: 'PERFORMANCE_DEGRADATION' })
  );
  expect(m.trigger).not.toHaveBeenCalled(); // Corrections gate still applies.
});

it.each([0, 99])(
  'treats %i samples as insufficient data, not a query failure',
  async (count) => {
    withSamples(count);
    const result = await ModelRetrainingService.runRetrainingCycle();
    expect(result.checkResult.performanceCheckFailed).toBe(false);
    expect(m.history).not.toHaveBeenCalled();
    expect(m.warn).not.toHaveBeenCalled();
  }
);

it('surfaces returned database errors without logging database payloads', async () => {
  m.recent.mockResolvedValue({
    data: null,
    error: {
      code: '42703',
      message: 'private query details',
      details: 'private values',
    },
  });
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.checkResult.performanceCheckFailed).toBe(true);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({
      type: 'PERFORMANCE_CHECK_UNAVAILABLE',
      severity: 'warning',
    })
  );
  expect(result.alerts).not.toContainEqual(
    expect.objectContaining({ type: 'NO_RETRAINING_NEEDED' })
  );
  expect(m.warn).toHaveBeenCalledWith('Performance check failed', {
    service: 'ModelRetrainingService',
    code: '42703',
  });
  expect(m.history).not.toHaveBeenCalled();
  expect(m.trigger).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain('private');
});

it('surfaces a rejected assessment request without claiming a healthy check', async () => {
  m.recent.mockRejectedValue(new Error('private transport details'));
  const result = await ModelRetrainingService.manualTrigger({ force: false });
  expect(result.checkResult?.performanceCheckFailed).toBe(true);
  expect(m.warn).toHaveBeenCalledWith('Performance check failed', {
    service: 'ModelRetrainingService',
    code: undefined,
  });
  expect(m.trigger).not.toHaveBeenCalled();
});

it('preserves independent correction-based training when performance lookup fails', async () => {
  m.stats.mockResolvedValue({ approved: 50 });
  m.recent.mockResolvedValue({ data: null, error: { code: '42501' } });
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.retrainingTriggered).toBe(true);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({ type: 'PERFORMANCE_CHECK_UNAVAILABLE' })
  );
  expect(m.trigger).toHaveBeenCalledTimes(1);
});

it('surfaces historical metrics transport failures too', async () => {
  withSamples(100);
  m.history.mockRejectedValue(new Error('history unavailable'));
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.checkResult.performanceCheckFailed).toBe(true);
  expect(result.alerts).toContainEqual(
    expect.objectContaining({ type: 'PERFORMANCE_CHECK_UNAVAILABLE' })
  );
});

it.each([0, NaN, Infinity])(
  'does not invent degradation from invalid baseline %s',
  async (baseline) => {
    withSamples(100);
    withScores(0.72, baseline);
    const result = await ModelRetrainingService.runRetrainingCycle();
    expect(result.checkResult.metrics.performanceDegradation).toBeUndefined();
    expect(result.alerts).not.toContainEqual(
      expect.objectContaining({ type: 'PERFORMANCE_DEGRADATION' })
    );
  }
);

it('does not flag stable historical performance as degradation', async () => {
  withSamples(100);
  withScores(0.9, 0.9);
  const result = await ModelRetrainingService.runRetrainingCycle();
  expect(result.checkResult.metrics.performanceDegradation).toBe(0);
  expect(result.alerts).not.toContainEqual(
    expect.objectContaining({ type: 'PERFORMANCE_DEGRADATION' })
  );
});
