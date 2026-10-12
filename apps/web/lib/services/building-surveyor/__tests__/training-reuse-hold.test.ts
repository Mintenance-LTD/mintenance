import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), model: vi.fn(), examples: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('../generator/AssessmentGenerator', () => ({ callMintAiVLM: mocks.model }));
import { KnowledgeDistillationService } from '../KnowledgeDistillationService';
import { createTrainingJob, checkAndTriggerTraining } from '../KnowledgeDistillationJobService';
import { trainDamageClassifier, trainStudentVLM } from '../KnowledgeDistillationTrainingService';
import { StudentShadowService } from '../distillation/StudentShadowService';
import { ExperienceBufferService } from '../distillation/ExperienceBufferService';
import { TrainingDataExporter } from '../distillation/TrainingDataExporter';
import { YOLOTrainingDataService } from '../YOLOTrainingDataService';
import { YOLOTrainingDataEnhanced } from '../YOLOTrainingDataEnhanced';
import { YOLOCorrectionService } from '../YOLOCorrectionService';
import { SAM3TrainingDataService } from '../SAM3TrainingDataService';
import { exportEnhancedTrainingData } from '../sam3-training/training-data-exporter';
import { exportCurriculumData } from '../yolo-training-enhanced/curriculum-exporter';
import { isTrainingReuseAllowed } from '../training-reuse-policy';

beforeEach(() => { vi.clearAllMocks(); });
const denied = [
  ['teacher labels', () => KnowledgeDistillationService.recordGPT4Output('assessment', {} as never, ['https://private.test/image'])],
  ['training jobs', () => createTrainingJob({} as never)],
  ['classifier training', () => trainDamageClassifier('existing-job')],
  ['student training', () => trainStudentVLM({ existingJobId: 'existing-job' })],
  ['VLM export', () => TrainingDataExporter.exportToQwenFormat()],
  ['YOLO export', () => YOLOTrainingDataService.exportCorrectionsToYOLO()],
  ['enhanced export', () => YOLOTrainingDataEnhanced.exportEnhancedTrainingData()],
  ['SAM export', () => exportEnhancedTrainingData({} as never)],
  ['curriculum export', () => exportCurriculumData()],
  ['corrections', () => YOLOCorrectionService.submitCorrection({} as never)],
  ['SAM labels', () => SAM3TrainingDataService.storeSAM3Mask({} as never)],
  ['pseudo labels', () => SAM3TrainingDataService.generatePseudoLabels(['https://private.test/image'])],
] as const;
it.each(denied)('blocks %s before reading data, fetching images or writing exports', async (_name, run) => {
  await expect(run()).rejects.toMatchObject({ statusCode: 503 });
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.model).not.toHaveBeenCalled();
});
it('skips noncritical background capture without failing an operational assessment', async () => {
  await expect(StudentShadowService.runShadowComparison('id', [], {} as never, [], 'unused')).resolves.toBeUndefined();
  await expect(KnowledgeDistillationService.recordSAM2TemporalData('id', { trajectories: [] })).resolves.toBe(0);
  await expect(ExperienceBufferService.recordExperience({} as never, undefined, [], '', '', {} as never, null)).resolves.toBeNull();
  await expect(checkAndTriggerTraining('damage_classifier')).resolves.toBeUndefined();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.model).not.toHaveBeenCalled();
});
it('does not permit an environment flag to replace individual consent', () => {
  vi.stubEnv('TRAINING_REUSE_ENABLED', 'true');
  expect(isTrainingReuseAllowed()).toBe(false);
  vi.unstubAllEnvs();
});
