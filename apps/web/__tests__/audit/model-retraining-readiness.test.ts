import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  stats: vi.fn(),
  last: vi.fn(),
  trigger: vi.fn(),
  drift: vi.fn(),
  from: vi.fn(),
  history: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
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
  vi.clearAllMocks();
  m.stats.mockResolvedValue({ approved: 0 });
  m.last.mockResolvedValue(null);
  m.trigger.mockResolvedValue({ id: 'training' });
  const q: any = {};
  for (const key of ['select', 'gte', 'update', 'eq']) q[key] = vi.fn(() => q);
  q.limit = vi.fn(async () => ({ data: [] }));
  q.insert = vi.fn(async () => ({ error: null }));
  q.then = (f: Function) =>
    Promise.resolve({ count: 0, error: null }).then(f as any);
  m.from.mockReturnValue(q);
});
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
