import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ModelEvaluationService } from '../ModelEvaluationService';
import { parseMetricsFromLogs } from '../model-evaluation/log-parser';
import { readEvaluationArtifact } from '../model-evaluation/artifact-reader';

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: vi.fn() } }));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

let root: string;
let output: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'mintenance-metrics-test-'));
  output = path.join(root, 'output');
  mkdirSync(output);
});
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

it('preserves metrics for ordinary version identifiers', async () => {
  writeFileSync(path.join(output, 'metrics-yolo-v1.2_2026.json'), JSON.stringify({
    test_metrics: { mAP50: 0.8, mAP50_95: 0.7, precision: 0.8, recall: 0.6 },
    validation_metrics: { val_loss: 0.2, val_accuracy: 0.9 }, dataset_version: 'fixture-v1',
  }));
  const result = await ModelEvaluationService.extractMetricsFromTraining('yolo-v1.2_2026', output);
  expect(result.model_version).toBe('yolo-v1.2_2026');
  expect(result.test_metrics.mAP50).toBe(0.8);
  expect(result.test_metrics.f1_score).toBeCloseTo(0.685714);
  expect(result.validation_metrics.val_loss).toBe(0.2);
  expect(result.dataset_version).toBe('fixture-v1');
});

it.each(['', '../outside', 'x/../../outside', '..\\outside', 'C:\\outside', '/outside', 'v1:stream', 'v1\0', 'v1\n', 'a'.repeat(129)])(
  'rejects invalid model version %j without falling back to logs', async (version) => {
    writeFileSync(path.join(output, 'training.log'), 'mAP50: 0.9');
    // A real sibling fixture would be read by the old x/../../ traversal.
    mkdirSync(path.join(output, 'metrics-x'));
    writeFileSync(path.join(root, 'outside.json'), '{"test_metrics":{"mAP50":0.99}}');
    await expect(ModelEvaluationService.extractMetricsFromTraining(version, output)).rejects.toThrow('Invalid model version');
  }
);

it('uses training logs only when the metrics file is absent', async () => {
  writeFileSync(path.join(output, 'training.log'), 'mAP50: 0.8\nmAP50-95: 0.7\nPrecision: 0.8\nRecall: 0.6');
  const result = await ModelEvaluationService.extractMetricsFromTraining('v1', output);
  expect(result.model_version).toBe('parsed-from-logs');
  expect(result.test_metrics.mAP50_95).toBe(0.7);
  expect(result.test_metrics.f1_score).toBeCloseTo(0.685714);
  writeFileSync(path.join(output, 'metrics-v1.json'), 'not JSON');
  await expect(ModelEvaluationService.extractMetricsFromTraining('v1', output)).rejects.toThrow(SyntaxError);
});

it('reports missing metrics and logs', async () => {
  await expect(ModelEvaluationService.extractMetricsFromTraining('v1', output)).rejects.toThrow('No metrics file or training logs found');
});

it.each(['metrics-v1.json', 'training.log'])('rejects a directory or junction at %s', async (filename) => {
  const artifact = path.join(output, filename);
  mkdirSync(artifact);
  expect(() => readEvaluationArtifact(output, filename)).toThrow('regular file');
  rmSync(artifact, { recursive: true });
  const outside = path.join(root, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, artifact, 'junction');
  expect(() => readEvaluationArtifact(output, filename)).toThrow('regular file');
});

it.skipIf(process.platform === 'win32').each(['metrics-v1.json', 'training.log'])(
  'rejects an external file symlink at %s rather than reading or falling back', async (filename) => {
    const outside = path.join(root, 'outside.txt');
    writeFileSync(outside, '{"test_metrics":{"mAP50":0.99}}');
    symlinkSync(outside, path.join(output, filename));
    if (filename === 'training.log') {
      await expect(parseMetricsFromLogs(output)).rejects.toThrow('regular file');
    } else {
      writeFileSync(path.join(output, 'training.log'), 'mAP50: 0.9');
      await expect(ModelEvaluationService.extractMetricsFromTraining('v1', output)).rejects.toThrow('regular file');
    }
  }
);
