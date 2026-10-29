import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), query: vi.fn(), memory: vi.fn(), initialize: vi.fn(), write: vi.fn(),
  teacher: vi.fn(), shadow: vi.fn(), features: vi.fn().mockResolvedValue(Array(40).fill(0)),
  loadFeatures: vi.fn(), quality: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('../../ml-engine/memory/MemoryManager', () => ({ memoryManager: {
  query: mocks.query, getMemorySystem: mocks.memory, getOrCreateMemorySystem: mocks.initialize,
  addContextFlow: mocks.write,
} }));
vi.mock('../KnowledgeDistillationService', () => ({ KnowledgeDistillationService: { recordGPT4Output: mocks.teacher } }));
vi.mock('../distillation/StudentShadowService', () => ({ StudentShadowService: { runShadowComparison: mocks.shadow } }));
vi.mock('../feature-extractor', () => ({ extractDetectionFeatures: mocks.features }));
vi.mock('../LearnedFeatureExtractor', () => ({ LearnedFeatureExtractor: class {
  loadState = mocks.loadFeatures;
} }));
vi.mock('../ImageQualityService', () => ({ ImageQualityService: {
  getAverageQualityMetrics: mocks.quality,
} }));
vi.mock('../scene_graph', () => ({ SceneGraphBuilder: { buildSceneGraph: () => ({ nodes: [] }) } }));
vi.mock('../scene_graph_features', () => ({ SceneGraphFeatureExtractor: { extractFeatures: () => ({ featureVector: Array(40).fill(0) }) } }));

import { runRetrieveMemoryTool } from '../tools/RetrieveMemoryTool';
import { queryMemoryAdjustments } from '../memory-query-handler';
import { computeMemoryAdjustments } from '../orchestration/memory-adjustments';
import { extractAllFeatures } from '../stages/extract-features';
import { learnFromRepairOutcome, learnFromProgression, learnFromValidation } from '../learning-handler';
import { initializeMemorySystem, triggerSelfModification, isLearnedFeaturesEnabled, getLearnedFeatureExtractor } from '../initialization/BuildingSurveyorInitializationService';
import { FeatureExtractionService } from '../orchestration/FeatureExtractionService';
import { captureAssessmentTraining } from '../capture-assessment-training';
import { captureTrainingDataAsync } from '../orchestration/training-capture';
import { exportTrainingData } from '../DataCollectionQueryService';
import { isAssessmentMemoryReuseAllowed } from '../training-reuse-policy';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.quality.mockResolvedValue({ lightingQuality: 1, imageClarity: 1 });
  mocks.features.mockResolvedValue(Array(40).fill(0));
  vi.stubEnv('USE_TITANS', 'true');
  vi.stubEnv('USE_LEARNED_FEATURES', 'true');
  vi.stubEnv('TRAINING_REUSE_ENABLED', 'true');
  vi.stubEnv('MINT_AI_VLM_ENDPOINT', 'https://unused.invalid');
});
afterEach(() => vi.unstubAllEnvs());

function noSecondaryAccess() {
  for (const fn of [mocks.from, mocks.query, mocks.memory, mocks.initialize, mocks.write,
    mocks.teacher, mocks.shadow, mocks.loadFeatures]) expect(fn).not.toHaveBeenCalled();
}

it('does not retrieve pilot or historical property/job assessments', async () => {
  const result = await runRetrieveMemoryTool({ jobId: 'job', propertyId: 'property', featureVector: Array(40).fill(1) });
  expect(result.result?.combined).toContain('disabled during beta');
  noSecondaryAccess();
});

it('returns neutral adjustments on both inference paths without querying memory', async () => {
  expect(await queryMemoryAdjustments(Array(40).fill(1), true)).toEqual([0, 0, 0, 0, 0]);
  expect(await computeMemoryAdjustments('building-surveyor', Array(40).fill(1), true)).toEqual([0, 0, 0, 0, 0]);
  noSecondaryAccess();
});

it('preserves photo-quality processing while bypassing stored memory', async () => {
  const result = await extractAllFeatures(['https://private.test/photo'], [], null, undefined);
  expect(result.memoryAdjustments).toEqual([0, 0, 0, 0, 0]);
  expect(result.imageQuality).toEqual({ lightingQuality: 1, imageClarity: 1 });
  expect(mocks.features).toHaveBeenCalledOnce();
  noSecondaryAccess();
});

it('does not learn from repairs, follow-ups or expert validation', async () => {
  await learnFromRepairOutcome('id', 'early', 100, 'monitor', true);
  await learnFromProgression('before', 'after', true);
  await learnFromValidation('id', {} as never);
  expect(mocks.features).not.toHaveBeenCalled();
  noSecondaryAccess();
});

it('does not load learned state or initialize adaptive learning even with flags enabled', async () => {
  await initializeMemorySystem();
  await triggerSelfModification(0.2);
  await FeatureExtractionService.initialize();
  expect(isAssessmentMemoryReuseAllowed()).toBe(false);
  expect(isLearnedFeaturesEnabled()).toBe(false);
  expect(getLearnedFeatureExtractor()).toBeNull();
  noSecondaryAccess();
});

it('skips background capture before teacher, shadow or prompt processing', async () => {
  await captureAssessmentTraining('id', { modelMetadata: { provider: 'openai' } } as never, ['https://private.test/photo']);
  await captureTrainingDataAsync('id', ['https://private.test/photo'], {} as never, null);
  noSecondaryAccess();
});

it('blocks legacy validated-assessment export before reading records', async () => {
  await expect(exportTrainingData()).rejects.toMatchObject({ statusCode: 503 });
  noSecondaryAccess();
});
