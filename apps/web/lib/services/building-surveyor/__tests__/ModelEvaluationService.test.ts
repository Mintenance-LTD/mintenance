import path from 'path';
import { execFileSync } from 'child_process';
import { existsSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
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
vi.mock('../model-evaluation/metrics-math', async () => ({
  ...await vi.importActual<typeof import('../model-evaluation/metrics-math')>('../model-evaluation/metrics-math'),
  getModelSizeMB: vi.fn(() => 12),
}));

describe('ModelEvaluationService.evaluateModel', () => {
  let outputs: string[];
  beforeEach(() => {
    vi.resetAllMocks();
    outputs = [];
    vi.mocked(execFileSync).mockImplementation((_command, args) => {
      const output = (args as string[])[(args as string[]).indexOf('--output-json') + 1];
      outputs.push(output);
      expect(path.basename(output)).toBe('evaluation.json');
      expect(path.dirname(path.dirname(output))).toBe(tmpdir());
      expect(path.basename(path.dirname(output))).toMatch(/^mintenance-evaluation-[a-zA-Z0-9]+$/);
      if (process.platform !== 'win32') expect(statSync(path.dirname(output)).mode & 0o777).toBe(0o700);
      writeFileSync(output, JSON.stringify({
        mAP50: 0.8, mAP50_95: 0.7, precision: 0.8, recall: 0.6, accuracy: 0.9,
      }));
      return '';
    });
  });

  afterEach(() => {
    for (const output of outputs) {
      expect(existsSync(output)).toBe(false);
      expect(existsSync(path.dirname(output))).toBe(false);
    }
    vi.restoreAllMocks();
  });

  it('passes default evaluation arguments separately and preserves returned metrics', async () => {
    const metrics = await ModelEvaluationService.evaluateModel('models/model.pt');
    expect(execFileSync).toHaveBeenCalledExactlyOnceWith('python', [
      path.join(process.cwd(), 'scripts', 'evaluate-yolo-model.py'),
      '--model', 'models/model.pt', '--dataset', 'datasets/test',
      '--conf', '0.25', '--iou', '0.45', '--max-det', '300',
      '--device', 'cpu', '--batch', '1', '--output-json', outputs[0],
    ], { shell: false, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
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
      '--device', value, '--batch', '2', '--output-json', outputs[0],
      '--verbose',
    ], { shell: false, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  });

  it('propagates process failures without reading a stale evaluation result', async () => {
    const failure = new Error('Python evaluation failed');
    vi.mocked(execFileSync).mockImplementationOnce((_command, args) => {
      const output = (args as string[])[(args as string[]).indexOf('--output-json') + 1];
      outputs.push(output);
      writeFileSync(output, '{partial');
      throw failure;
    });
    await expect(ModelEvaluationService.evaluateModel('model.pt')).rejects.toBe(failure);
  });

  it('propagates invalid evaluation output', async () => {
    vi.mocked(execFileSync).mockImplementationOnce((_command, args) => {
      const output = (args as string[])[(args as string[]).indexOf('--output-json') + 1];
      outputs.push(output);
      writeFileSync(output, 'not JSON');
      return '';
    });
    await expect(ModelEvaluationService.evaluateModel('model.pt')).rejects.toThrow(SyntaxError);
  });

  it('fails when Python succeeds without producing a result and cleans up', async () => {
    vi.mocked(execFileSync).mockImplementationOnce((_command, args) => {
      outputs.push((args as string[])[(args as string[]).indexOf('--output-json') + 1]);
      return '';
    });
    await expect(ModelEvaluationService.evaluateModel('model.pt')).rejects.toThrow('Evaluation result file was not created');
  });

  it('uses distinct output directories for repeated same-name evaluations', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    await ModelEvaluationService.evaluateModel('first/model.pt');
    await ModelEvaluationService.evaluateModel('second/model.pt');
    expect(outputs).toHaveLength(2);
    expect(outputs[0]).not.toBe(outputs[1]);
  });
});
