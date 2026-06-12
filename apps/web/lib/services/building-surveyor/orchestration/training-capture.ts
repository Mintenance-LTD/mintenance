/**
 * Non-blocking training-data capture for knowledge distillation.
 * Extracted from AssessmentOrchestrator.
 *
 * Records:
 *   - GPT-4 Vision outputs (for damage classifier training)
 *   - SAM3 segmentation masks (if available)
 *   - Student VLM shadow comparison (fire-and-forget, when endpoint configured)
 */
import { logger } from '@mintenance/shared';
import { KnowledgeDistillationService } from '../KnowledgeDistillationService';
import { SAM3Service } from '../SAM3Service';
import { StudentShadowService } from '../distillation/StudentShadowService';
import type { AssessmentContext, Phase1BuildingAssessment } from '../types';

export async function captureTrainingDataAsync(
  assessmentId: string | undefined,
  imageUrls: string[],
  assessment: Phase1BuildingAssessment,
  sam3Result: Awaited<ReturnType<typeof SAM3Service.segmentDamageTypes>> | null,
  context?: AssessmentContext,
  promptMessages?: Array<{ role: string; content: unknown }>,
  apiKey?: string
): Promise<void> {
  try {
    if (!assessmentId) {
      logger.debug('Skipping training data capture - no assessment ID', {
        service: 'AssessmentOrchestrator',
      });
      return;
    }

    await KnowledgeDistillationService.recordGPT4Output(
      assessmentId,
      assessment,
      imageUrls,
      context
        ? {
            location: context.location,
            propertyType: context.propertyType,
            ageOfProperty: context.ageOfProperty,
            propertyDetails: context.propertyDetails,
            region: context.region,
          }
        : undefined
    );

    if (sam3Result?.success) {
      for (let i = 0; i < imageUrls.length && i < 4; i++) {
        await KnowledgeDistillationService.recordSAM3Output(
          assessmentId,
          imageUrls[i],
          sam3Result,
          i
        );
      }
    }

    if (process.env.MINT_AI_VLM_ENDPOINT && promptMessages && apiKey) {
      StudentShadowService.runShadowComparison(
        assessmentId,
        imageUrls,
        assessment,
        promptMessages as import('../generator/AssessmentGenerator').GeneratorMessage[],
        apiKey
      ).catch((err) => {
        logger.warn('Shadow comparison failed (non-critical)', {
          service: 'AssessmentOrchestrator',
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    logger.debug('Training data captured successfully', {
      service: 'AssessmentOrchestrator',
      assessmentId,
      hasSAM3Data: !!sam3Result?.success,
    });
  } catch (error) {
    // Don't throw — this is non-critical background work
    logger.warn('Training data capture failed (non-critical)', {
      service: 'AssessmentOrchestrator',
      assessmentId,
      error,
    });
  }
}
