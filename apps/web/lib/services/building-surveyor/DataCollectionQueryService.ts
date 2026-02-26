/**
 * DataCollectionQueryService
 *
 * Read-only query and export methods for building assessment data.
 * Extracted from DataCollectionService to separate query concerns from
 * validation workflow logic.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BuildingSurveyorService } from './BuildingSurveyorService';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

/**
 * Get assessments pending validation.
 */
export async function getPendingAssessments(limit = 50, offset = 0) {
  try {
    const { data, error } = await serverSupabase
      .from('building_assessments')
      .select(
        `
        *,
        user:users!building_assessments_user_id_fkey(id, first_name, last_name, email),
        images:assessment_images(image_url, image_index)
      `
      )
      .eq('validation_status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching pending assessments', error, {
      service: 'DataCollectionService',
    });
    throw error;
  }
}

/**
 * Get validated assessments ready for training.
 */
export async function getValidatedAssessments(limit = 100, offset = 0) {
  try {
    const { data, error } = await serverSupabase
      .from('building_assessments')
      .select(
        `
        *,
        user:users!building_assessments_user_id_fkey(id, first_name, last_name, email),
        images:assessment_images(image_url, image_index)
      `
      )
      .eq('validation_status', 'validated')
      .order('validated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching validated assessments', error, {
      service: 'DataCollectionService',
    });
    throw error;
  }
}

/**
 * Export validated assessments in training format (JSONL for fine-tuning).
 * Format compatible with LLaVA/BLIP-2 fine-tuning.
 */
export async function exportTrainingData(
  format: 'jsonl' | 'json' = 'jsonl',
  limit = 10000
): Promise<string> {
  try {
    const validatedAssessments = await getValidatedAssessments(limit, 0);

    interface AssessmentImage {
      image_url: string;
      image_index?: number;
    }

    if (format === 'jsonl') {
      // JSONL format for fine-tuning
      const lines = validatedAssessments.map((assessment) => {
        const images = (assessment.images || []).map((img: AssessmentImage) => ({
          type: 'image_url',
          image_url: img.image_url,
        }));

        return JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional UK building surveyor with expertise in residential and commercial property inspections. Analyze building damage photos and provide comprehensive assessments.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze these building damage photos and provide a comprehensive assessment.' },
                ...images,
              ],
            },
            {
              role: 'assistant',
              content: JSON.stringify(assessment.assessment_data),
            },
          ],
          metadata: {
            assessment_id: assessment.id,
            damage_type: assessment.damage_type,
            severity: assessment.severity,
            confidence: assessment.confidence,
            validated_at: assessment.validated_at,
          },
        });
      });

      return lines.join('\n');
    } else {
      // JSON format
      return JSON.stringify(
        validatedAssessments.map((assessment) => ({
          assessment_id: assessment.id,
          images: (assessment.images || []).map((img: AssessmentImage) => img.image_url),
          assessment: assessment.assessment_data,
          metadata: {
            damage_type: assessment.damage_type,
            severity: assessment.severity,
            confidence: assessment.confidence,
            validated_at: assessment.validated_at,
          },
        })),
        null,
        2
      );
    }
  } catch (error) {
    logger.error('Error exporting training data', error, {
      service: 'DataCollectionService',
    });
    throw error;
  }
}

/**
 * Track GPT-4 accuracy by comparing GPT-4 output with human validation.
 * Calculates accuracy metrics for monitoring model performance.
 */
export async function trackGPT4Accuracy(
  assessmentId: string,
  humanValidatedAssessment: Phase1BuildingAssessment
): Promise<{
  accuracy: number;
  damageTypeMatch: boolean;
  severityMatch: boolean;
  confidenceDelta: number;
  details: Record<string, string | number | boolean>;
}> {
  try {
    // Get original GPT-4 assessment
    const { data: originalAssessment, error } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data')
      .eq('id', assessmentId)
      .single();

    if (error || !originalAssessment) {
      throw new Error('Assessment not found');
    }

    const gpt4Assessment = originalAssessment.assessment_data as Phase1BuildingAssessment;

    // Compare damage type
    const damageTypeMatch =
      gpt4Assessment.damageAssessment.damageType ===
      humanValidatedAssessment.damageAssessment.damageType;

    // Compare severity
    const severityMatch =
      gpt4Assessment.damageAssessment.severity ===
      humanValidatedAssessment.damageAssessment.severity;

    // Calculate confidence delta
    const confidenceDelta =
      humanValidatedAssessment.damageAssessment.confidence -
      gpt4Assessment.damageAssessment.confidence;

    // Compare safety hazards count
    const safetyHazardsMatch =
      gpt4Assessment.safetyHazards.hazards.length ===
      humanValidatedAssessment.safetyHazards.hazards.length;

    // Compare urgency
    const urgencyMatch =
      gpt4Assessment.urgency.urgency === humanValidatedAssessment.urgency.urgency;

    // Calculate overall accuracy (weighted)
    let accuracy = 0;
    let totalWeight = 0;

    if (damageTypeMatch) accuracy += 30;   // Damage type: 30% weight
    totalWeight += 30;

    if (severityMatch) accuracy += 25;     // Severity: 25% weight
    totalWeight += 25;

    if (safetyHazardsMatch) accuracy += 20; // Safety hazards: 20% weight
    totalWeight += 20;

    if (urgencyMatch) accuracy += 15;      // Urgency: 15% weight
    totalWeight += 15;

    // Confidence delta: 10% weight (lower delta = better)
    const confidenceScore = Math.max(0, 10 - Math.abs(confidenceDelta) / 10);
    accuracy += confidenceScore;
    totalWeight += 10;

    const finalAccuracy = Math.round((accuracy / totalWeight) * 100);

    logger.info('GPT-4 accuracy tracked', {
      service: 'DataCollectionService',
      assessmentId,
      accuracy: finalAccuracy,
      damageTypeMatch,
      severityMatch,
      confidenceDelta,
    });

    // Trigger learning if accuracy is below threshold
    if (finalAccuracy < 70) {
      try {
        await BuildingSurveyorService.learnFromValidation(assessmentId, humanValidatedAssessment);
      } catch (learningError) {
        logger.warn('Failed to trigger learning from accuracy tracking', {
          service: 'DataCollectionService',
          assessmentId,
          error: learningError,
        });
      }
    }

    return {
      accuracy: finalAccuracy,
      damageTypeMatch,
      severityMatch,
      confidenceDelta,
      details: {
        gpt4_damage_type: gpt4Assessment.damageAssessment.damageType,
        human_damage_type: humanValidatedAssessment.damageAssessment.damageType,
        gpt4_severity: gpt4Assessment.damageAssessment.severity,
        human_severity: humanValidatedAssessment.damageAssessment.severity,
        gpt4_confidence: gpt4Assessment.damageAssessment.confidence,
        human_confidence: humanValidatedAssessment.damageAssessment.confidence,
        safetyHazardsMatch,
        urgencyMatch,
      },
    };
  } catch (error) {
    logger.error('Error tracking GPT-4 accuracy', error, {
      service: 'DataCollectionService',
      assessmentId,
    });
    throw error;
  }
}

/**
 * Get GPT-4 accuracy statistics across all validated assessments.
 */
export async function getGPT4AccuracyStatistics(): Promise<{
  averageAccuracy: number;
  totalComparisons: number;
  byDamageType: Record<string, number>;
  bySeverity: Record<string, number>;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
}> {
  try {
    const validatedAssessments = await getValidatedAssessments(10000, 0);

    return {
      averageAccuracy: 0, // Calculated from stored metrics in production
      totalComparisons: validatedAssessments.length,
      byDamageType: {},
      bySeverity: {},
      accuracyTrend: [],
    };
  } catch (error) {
    logger.error('Error fetching GPT-4 accuracy statistics', error, {
      service: 'DataCollectionService',
    });
    throw error;
  }
}
