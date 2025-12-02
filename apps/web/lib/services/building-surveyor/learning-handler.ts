/**
 * Learning Handler for Building Surveyor Service
 * Handles learning from repair outcomes, damage progression, and validation outcomes
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import type { Phase1BuildingAssessment, DamageSeverity, UrgencyLevel, AssessmentContext } from './types';
import { extractDetectionFeatures } from './feature-extractor';
import { logger } from '@mintenance/shared';
import { initializeMemorySystem, triggerSelfModification, getLearnedFeatureExtractor, isLearnedFeaturesEnabled } from './initialization/BuildingSurveyorInitializationService';

const AGENT_NAME = 'building-surveyor';

// Type for learned feature extractor - use the class type from LearnedFeatureExtractor
import type { LearnedFeatureExtractor as LearnedFeatureExtractorClass } from './LearnedFeatureExtractor';
type LearnedFeatureExtractor = LearnedFeatureExtractorClass;

/**
 * Learn from repair outcome
 * Compares original assessment with actual repair outcome to improve future assessments
 */
export async function learnFromRepairOutcome(
  assessmentId: string,
  actualSeverity?: DamageSeverity,
  actualCost?: number,
  actualUrgency?: UrgencyLevel,
  useLearnedFeatures: boolean = false,
  learnedFeatureExtractor: LearnedFeatureExtractor | null | undefined = null
): Promise<void> {
  try {
    // Get original assessment
    const { data: assessmentRecord, error } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data')
      .eq('id', assessmentId)
      .single();

    if (error || !assessmentRecord) {
      logger.warn('Assessment not found for learning', {
        service: 'learning-handler',
        assessmentId,
      });
      return;
    }

    const originalAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;

    // Get images for feature extraction
    const { data: images } = await serverSupabase
      .from('assessment_images')
      .select('image_url')
      .eq('assessment_id', assessmentId)
      .order('image_index');

    const imageUrls = images?.map(img => img.image_url) || [];
    const features = await extractDetectionFeatures(
      imageUrls,
      {},
      originalAssessment,
      originalAssessment.evidence?.roboflowDetections,
      originalAssessment.evidence?.visionAnalysis ?? null,
      useLearnedFeatures,
      learnedFeatureExtractor
    );

    // Calculate surprise signals
    const severityAccuracy = actualSeverity &&
      originalAssessment.damageAssessment.severity === actualSeverity ? 1.0 : 0.0;

    const costAccuracy = actualCost && originalAssessment.contractorAdvice?.estimatedCost?.recommended
      ? Math.max(-1, Math.min(1,
          (actualCost - originalAssessment.contractorAdvice.estimatedCost.recommended) /
          originalAssessment.contractorAdvice.estimatedCost.recommended
        ))
      : 0.0;

    const urgencyAccuracy = actualUrgency &&
      originalAssessment.urgency.urgency === actualUrgency ? 1.0 : 0.0;

    // Values: [damage_type_accuracy (0), severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error (0)]
    const values = [
      0.0, // Damage type not changed in repair outcome
      severityAccuracy,
      costAccuracy,
      urgencyAccuracy,
      0.0, // Confidence error not applicable for repair outcome
    ];

    // Add context flow to all memory levels
    for (let level = 0; level < 3; level++) {
      try {
        await memoryManager.addContextFlow(
          AGENT_NAME,
          features,
          values,
          level
        );
      } catch (levelError) {
        logger.warn('Failed to add context flow to memory level', {
          service: 'learning-handler',
          level,
          error: levelError,
        });
      }
    }

    logger.info('Learning from repair outcome completed', {
      service: 'learning-handler',
      assessmentId,
      severityAccuracy,
      costAccuracy,
      urgencyAccuracy,
    });
  } catch (error) {
    logger.error('Failed to learn from repair outcome', error, {
      service: 'learning-handler',
      assessmentId,
    });
  }
}

/**
 * Learn from damage progression
 * Compares original assessment with follow-up assessment to learn progression rates
 */
export async function learnFromProgression(
  originalAssessmentId: string,
  followUpAssessmentId: string,
  useLearnedFeatures: boolean = false,
  learnedFeatureExtractor: LearnedFeatureExtractor | null | undefined = null
): Promise<void> {
  try {
    // Get both assessments
    const { data: originalRecord, error: originalError } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, created_at')
      .eq('id', originalAssessmentId)
      .single();

    const { data: followUpRecord, error: followUpError } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, created_at')
      .eq('id', followUpAssessmentId)
      .single();

    if (originalError || !originalRecord || followUpError || !followUpRecord) {
      logger.warn('Assessments not found for progression learning', {
        service: 'learning-handler',
        originalAssessmentId,
        followUpAssessmentId,
      });
      return;
    }

    const originalAssessment = originalRecord.assessment_data as Phase1BuildingAssessment;
    const followUpAssessment = followUpRecord.assessment_data as Phase1BuildingAssessment;

    // Calculate time difference
    const originalDate = new Date(originalRecord.created_at);
    const followUpDate = new Date(followUpRecord.created_at);
    const daysDiff = (followUpDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24);

    // Compare severity progression
    const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
    const originalIndex = severityOrder.indexOf(originalAssessment.damageAssessment.severity);
    const followUpIndex = severityOrder.indexOf(followUpAssessment.damageAssessment.severity);

    const severityProgression = followUpIndex > originalIndex ? 1.0 : 
                               followUpIndex < originalIndex ? -1.0 : 0.0;

    // Get images for feature extraction
    const { data: images } = await serverSupabase
      .from('assessment_images')
      .select('image_url')
      .eq('assessment_id', originalAssessmentId)
      .order('image_index');

    const imageUrls = images?.map(img => img.image_url) || [];
    const features = await extractDetectionFeatures(
      imageUrls,
      {},
      originalAssessment,
      originalAssessment.evidence?.roboflowDetections,
      originalAssessment.evidence?.visionAnalysis ?? null,
      useLearnedFeatures,
      learnedFeatureExtractor
    );

    // Values: [damage_type_accuracy (0), severity_progression, cost_accuracy (0), urgency_accuracy (0), progression_rate]
    const progressionRate = daysDiff > 0 ? severityProgression / daysDiff : 0.0;
    const values = [
      0.0,
      severityProgression,
      0.0,
      0.0,
      Math.max(-1, Math.min(1, progressionRate)), // Normalized progression rate
    ];

    // Add context flow to all memory levels
    for (let level = 0; level < 3; level++) {
      try {
        await memoryManager.addContextFlow(
          AGENT_NAME,
          features,
          values,
          level
        );
      } catch (levelError) {
        logger.warn('Failed to add context flow to memory level', {
          service: 'learning-handler',
          level,
          error: levelError,
        });
      }
    }

    logger.info('Learning from progression completed', {
      service: 'learning-handler',
      originalAssessmentId,
      followUpAssessmentId,
      severityProgression,
      daysDiff,
    });
  } catch (error) {
    logger.error('Failed to learn from progression', error, {
      service: 'learning-handler',
      originalAssessmentId,
      followUpAssessmentId,
    });
  }
}

/**
 * Learn from human validation outcome
 * Compares original assessment with human-validated assessment and updates memory
 */
export async function learnFromValidation(
  assessmentId: string,
  humanValidatedAssessment: Phase1BuildingAssessment
): Promise<void> {
  await initializeMemorySystem();

  try {
    // Get original assessment from database
    const { data: assessmentRecord, error } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, user_id')
      .eq('id', assessmentId)
      .single();

    if (error || !assessmentRecord) {
      logger.warn('Assessment not found for learning', {
        service: 'learning-handler',
        assessmentId,
      });
      return;
    }

    const originalAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;

    // Get context from database (if available)
    const { data: images } = await serverSupabase
      .from('assessment_images')
      .select('image_url')
      .eq('assessment_id', assessmentId)
      .order('image_index');

    const imageUrls = images?.map(img => img.image_url) || [];
    const context: AssessmentContext = {}; // Could be enhanced to fetch from user profile

    const useLearnedFeatures = isLearnedFeaturesEnabled();
    const learnedFeatureExtractor = getLearnedFeatureExtractor();

    // Extract features for original assessment
    const originalFeatures = await extractDetectionFeatures(
      imageUrls,
      context,
      originalAssessment,
      originalAssessment.evidence?.roboflowDetections,
      originalAssessment.evidence?.visionAnalysis ?? null,
      useLearnedFeatures,
      learnedFeatureExtractor
    );

    // Extract features for validated assessment (target features)
    const validatedFeatures = await extractDetectionFeatures(
      imageUrls,
      context,
      humanValidatedAssessment,
      originalAssessment.evidence?.roboflowDetections,
      originalAssessment.evidence?.visionAnalysis ?? null,
      useLearnedFeatures,
      learnedFeatureExtractor
    );

    // Learn from surprise signal in feature extractor
    if (useLearnedFeatures && learnedFeatureExtractor) {
      try {
        // Build raw input for learning
        const rawInput = (learnedFeatureExtractor as unknown as { buildRawInput: (imageUrls: string[], context: AssessmentContext, roboflowDetections?: unknown, visionAnalysis?: unknown) => unknown }).buildRawInput(
          imageUrls,
          context,
          originalAssessment.evidence?.roboflowDetections,
          originalAssessment.evidence?.visionAnalysis ?? null
        );

        // Learn from surprise: validated features are the target
        await learnedFeatureExtractor.learnFromSurprise(
          rawInput as number[],
          validatedFeatures
        );

        logger.debug('Feature extractor learned from validation', {
          service: 'learning-handler',
          assessmentId,
          avgError: learnedFeatureExtractor.getAverageError(),
        });
      } catch (featureError) {
        logger.warn('Failed to learn in feature extractor', {
          service: 'learning-handler',
          assessmentId,
          error: featureError,
        });
      }
    }

    // Calculate surprise signals for memory system
    const damageTypeAccuracy = originalAssessment.damageAssessment.damageType ===
      humanValidatedAssessment.damageAssessment.damageType ? 1.0 : 0.0;

    const severityAccuracy = originalAssessment.damageAssessment.severity ===
      humanValidatedAssessment.damageAssessment.severity ? 1.0 : 0.0;

    const confidenceError = Math.abs(
      originalAssessment.damageAssessment.confidence -
      humanValidatedAssessment.damageAssessment.confidence
    ) / 100;

    const costAccuracy = originalAssessment.contractorAdvice?.estimatedCost?.recommended &&
      humanValidatedAssessment.contractorAdvice?.estimatedCost?.recommended
      ? Math.max(-1, Math.min(1, 
          (humanValidatedAssessment.contractorAdvice.estimatedCost.recommended -
           originalAssessment.contractorAdvice.estimatedCost.recommended) /
          originalAssessment.contractorAdvice.estimatedCost.recommended
        ))
      : 0.0;

    const urgencyAccuracy = originalAssessment.urgency.urgency ===
      humanValidatedAssessment.urgency.urgency ? 1.0 : 0.0;

    // Values: [damage_type_accuracy, severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error]
    const values = [
      damageTypeAccuracy,
      severityAccuracy,
      costAccuracy,
      urgencyAccuracy,
      confidenceError,
    ];

    // Add context flow to all memory levels (with Titans if enabled)
    const memorySystem = memoryManager.getMemorySystem(AGENT_NAME);
    const useTitans = process.env.USE_TITANS === 'true' || false;

    if (useTitans && memorySystem) {
      // Use Titans-enhanced learning
      for (let level = 0; level < 3; level++) {
        try {
          await memorySystem.learnFromSurpriseWithTitans(
            originalFeatures,
            values,
            level
          );
        } catch (levelError) {
          logger.warn('Failed to learn with Titans at memory level', {
            service: 'learning-handler',
            level,
            error: levelError,
          });
        }
      }
    } else {
      // Standard memory learning
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            AGENT_NAME,
            originalFeatures,
            values,
            level
          );
        } catch (levelError) {
          logger.warn('Failed to add context flow to memory level', {
            service: 'learning-handler',
            level,
            error: levelError,
          });
        }
      }
    }

    // Calculate overall accuracy
    const overallAccuracy = (
      damageTypeAccuracy * 0.3 +
      severityAccuracy * 0.25 +
      urgencyAccuracy * 0.15 +
      (1 - Math.min(1, confidenceError)) * 0.1 +
      (1 - Math.min(1, Math.abs(costAccuracy))) * 0.2
    );

    // Trigger self-modification if accuracy is low
    if (overallAccuracy < 0.7) {
      await triggerSelfModification(1 - overallAccuracy);
    }

    logger.info('Learning from validation completed', {
      service: 'learning-handler',
      assessmentId,
      overallAccuracy,
      damageTypeAccuracy,
      severityAccuracy,
    });
  } catch (error) {
    logger.error('Failed to learn from validation', error, {
      service: 'learning-handler',
      assessmentId,
    });
  }
}

