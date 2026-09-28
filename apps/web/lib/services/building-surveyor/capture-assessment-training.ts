import { logger } from '@mintenance/shared';
import { KnowledgeDistillationService } from './KnowledgeDistillationService';
import { StudentShadowService } from './distillation/StudentShadowService';
import { PromptBuilder } from './orchestration/PromptBuilder';
import { getConfig } from './config/BuildingSurveyorConfig';
import type { GeneratorMessage } from './generator/AssessmentGenerator';
import type { AssessmentContext, Phase1BuildingAssessment } from './types';

/** Run within after() so capture can finish after the response is sent. */
export async function captureAssessmentTraining(
  assessmentId: string,
  assessment: Phase1BuildingAssessment,
  imageUrls: string[],
  context?: AssessmentContext
): Promise<void> {
  // A student result is not a teacher label and must not supervise itself.
  if (assessment.modelMetadata?.provider !== 'openai') return;
  try {
    await KnowledgeDistillationService.recordGPT4Output(
      assessmentId,
      assessment,
      imageUrls,
      context ? { ...context } : undefined
    );
  } catch (error) {
    logger.warn('Teacher label capture failed', { assessmentId, error });
  }
  const config = getConfig();
  if (process.env.MINT_AI_VLM_ENDPOINT && config.openaiApiKey) {
    const messages = PromptBuilder.buildMessages(
      imageUrls,
      context,
      [],
      null
    ) as GeneratorMessage[];
    await StudentShadowService.runShadowComparison(
      assessmentId,
      imageUrls,
      assessment,
      messages,
      config.openaiApiKey
    );
  }
}
