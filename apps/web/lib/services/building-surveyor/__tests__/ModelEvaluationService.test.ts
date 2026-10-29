import path from 'path';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { ModelEvaluationService } from '../ModelEvaluationService';
import type { EvaluationOptions } from '../model-evaluation/types';

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: vi.fn() },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));
vi.mock('child_process', () => {
  const mocked = { execFileSync: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('fs', async () => {
  const mocked = {
    ...await vi.importActual<typeof import('fs')>('fs'),
    readFileSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../model-evaluation/metrics-math', async () => ({
  ...await vi.importActual<typeof import('../model-evaluation/metrics-math')>('../model-evaluation/metrics-math'),
  getModelSizeMB: vi.fn(() => 12),
}));

describe('ModelEvaluationService.evaluateModel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      mAP50: 0.8, mAP50_95: 0.7, precision: 0.8, recall: 0.6, accuracy: 0.9,
    }));
  });

  it('passes default evaluation arguments separately and preserves returned metrics', async () => {
    const metrics = await ModelEvaluationService.evaluateModel('models/model.pt');
    expect(execFileSync).toHaveBeenCalledExactlyOnceWith('python', [
      path.join(process.cwd(), 'scripts', 'evaluate-yolo-model.py'),
      '--model', 'models/model.pt', '--dataset', 'datasets/test',
      '--conf', '0.25', '--iou', '0.45', '--max-det', '300',
      '--device', 'cpu', '--batch', '1', '--output-json', 'evaluation-model.json',
    ], { shell: false, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    expect(readFileSync).toHaveBeenCalledWith('evaluation-model.json', 'utf-8');
    expect(metrics.model_version).toBe('model');
    expect(metrics.evaluation_type).toBe('test');
    expect(metrics.test_metrics.mAP50).toBe(0.8);
    expect(metrics.test_metrics.f1_score).toBeCloseTo(0.685714);
    expect(metrics.validation_metrics.val_accuracy).toBe(0.9);
  });

  it.each([
    'path with spaces',
    'path; echo INJECTED',
    'path$(echo INJECTED)',
    'path`echo INJECTED`',
    'path" & echo INJECTED & "',
    'path\n--verbose',
  ])('keeps %j as literal argument data', async (value) => {
    const modelPath = `models/${value}.pt`;
    await ModelEvaluationService.evaluateModel(modelPath, {
      test_dataset_path: `datasets/${value}`,
      // Exercise untrusted runtime input even though callers normally use the union.
      device: value as EvaluationOptions['device'],
      confidence_threshold: 0.4, iou_threshold: 0.5,
      max_detections: 100, batch_size: 2, verbose: true,
    });
    expect(execFileSync).toHaveBeenCalledExactlyOnceWith('python', [
      path.join(process.cwd(), 'scripts', 'evaluate-yolo-model.py'),
      '--model', modelPath, '--dataset', `datasets/${value}`,
      '--conf', '0.4', '--iou', '0.5', '--max-det', '100',
      '--device', value, '--batch', '2', '--output-json', `evaluation-${value}.json`,
      '--verbose',
    ], { shell: false, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  });

  it('propagates process failures without reading a stale evaluation result', async () => {
    const failure = new Error('Python evaluation failed');
    vi.mocked(execFileSync).mockImplementationOnce(() => { throw failure; });
    await expect(ModelEvaluationService.evaluateModel('model.pt')).rejects.toBe(failure);
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('propagates invalid evaluation output', async () => {
    vi.mocked(readFileSync).mockReturnValueOnce('not JSON');
    await expect(ModelEvaluationService.evaluateModel('model.pt')).rejects.toThrow(SyntaxError);
  });
});
