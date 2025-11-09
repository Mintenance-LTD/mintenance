import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

/**
 * Configuration for auto-validation thresholds
 * These can be adjusted based on model performance and data quality
 */
const AUTO_VALIDATION_CONFIG = {
  // Minimum confidence score to auto-validate (0-100)
  MIN_CONFIDENCE: 90,
  
  // Maximum insurance risk score to auto-validate (0-100)
  MAX_INSURANCE_RISK: 50,
  
  // Maximum safety score threshold (lower score = more hazards)
  MIN_SAFETY_SCORE: 70,
  
  // Edge case damage types that always require human review
  EDGE_CASE_DAMAGE_TYPES: [
    'unknown_damage',
    'structural_failure',
    'foundation_issue',
    'asbestos',
    'mold_toxicity',
    'lead_paint',
  ],
  
  // Enable/disable auto-validation (set via environment variable)
  ENABLED: process.env.BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED === 'true',
  
  // Minimum number of validated assessments before enabling auto-validation
  MIN_VALIDATED_COUNT: 100,
};

/**
 * Data Collection Service
 * 
 * Manages the collection and validation workflow for GPT-4 assessments
 * that will be used as training data for future proprietary models.
 * 
 * Implements hybrid self-training:
 * - Phase 1: 100% human validation (until MIN_VALIDATED_COUNT reached)
 * - Phase 2: Confidence-based auto-validation for high-confidence assessments
 * - Phase 3: Active learning (future enhancement)
 */
export class DataCollectionService {
  /**
   * Check if assessment meets criteria for auto-validation
   * Returns true if assessment can be auto-validated, false if human review needed
   */
  static async canAutoValidate(
    assessment: Phase1BuildingAssessment,
    assessmentId: string
  ): Promise<{ canAutoValidate: boolean; reason?: string }> {
    try {
      // Check if auto-validation is enabled
      if (!AUTO_VALIDATION_CONFIG.ENABLED) {
        return { canAutoValidate: false, reason: 'Auto-validation disabled' };
      }

      // Check if we have enough validated data to enable auto-validation
      const stats = await this.getStatistics();
      if (stats.validated < AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT) {
        return {
          canAutoValidate: false,
          reason: `Insufficient validated data (${stats.validated}/${AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT} required)`,
        };
      }

      // Check confidence threshold
      if (assessment.damageAssessment.confidence < AUTO_VALIDATION_CONFIG.MIN_CONFIDENCE) {
        return {
          canAutoValidate: false,
          reason: `Low confidence (${assessment.damageAssessment.confidence}% < ${AUTO_VALIDATION_CONFIG.MIN_CONFIDENCE}%)`,
        };
      }

      // Check for critical safety hazards
      if (assessment.safetyHazards.hasCriticalHazards) {
        return {
          canAutoValidate: false,
          reason: 'Critical safety hazards detected - requires human review',
        };
      }

      // Check safety score threshold
      if (assessment.safetyHazards.overallSafetyScore < AUTO_VALIDATION_CONFIG.MIN_SAFETY_SCORE) {
        return {
          canAutoValidate: false,
          reason: `Low safety score (${assessment.safetyHazards.overallSafetyScore} < ${AUTO_VALIDATION_CONFIG.MIN_SAFETY_SCORE})`,
        };
      }

      // Check insurance risk threshold
      if (assessment.insuranceRisk.riskScore > AUTO_VALIDATION_CONFIG.MAX_INSURANCE_RISK) {
        return {
          canAutoValidate: false,
          reason: `High insurance risk (${assessment.insuranceRisk.riskScore} > ${AUTO_VALIDATION_CONFIG.MAX_INSURANCE_RISK})`,
        };
      }

      // Check for edge case damage types
      const damageType = assessment.damageAssessment.damageType.toLowerCase();
      if (AUTO_VALIDATION_CONFIG.EDGE_CASE_DAMAGE_TYPES.some((edgeCase) => 
        damageType.includes(edgeCase.toLowerCase())
      )) {
        return {
          canAutoValidate: false,
          reason: `Edge case damage type (${assessment.damageAssessment.damageType}) - requires human review`,
        };
      }

      // Check for high urgency (immediate/urgent) - these should be reviewed
      if (assessment.urgency.urgency === 'immediate' || assessment.urgency.urgency === 'urgent') {
        return {
          canAutoValidate: false,
          reason: `High urgency (${assessment.urgency.urgency}) - requires human review`,
        };
      }

      // Check for compliance violations
      const hasViolations = assessment.compliance.complianceIssues.some(
        (issue) => issue.severity === 'violation'
      );
      if (hasViolations) {
        return {
          canAutoValidate: false,
          reason: 'Compliance violations detected - requires human review',
        };
      }

      // All checks passed - can auto-validate
      return { canAutoValidate: true };
    } catch (error) {
      logger.error('Error checking auto-validation criteria', error, {
        service: 'DataCollectionService',
        assessmentId,
      });
      // On error, default to requiring human review (safer)
      return { canAutoValidate: false, reason: 'Error checking criteria' };
    }
  }

  /**
   * Auto-validate assessment if it meets high-confidence criteria
   * Returns true if auto-validated, false if human review needed
   */
  static async autoValidateIfHighConfidence(
    assessment: Phase1BuildingAssessment,
    assessmentId: string
  ): Promise<{ autoValidated: boolean; reason?: string }> {
    try {
      const { canAutoValidate, reason } = await this.canAutoValidate(assessment, assessmentId);

      if (!canAutoValidate) {
        return { autoValidated: false, reason };
      }

      // Auto-validate the assessment
      // Use NULL for validated_by to indicate system auto-validation
      const { error } = await serverSupabase
        .from('building_assessments')
        .update({
          validation_status: 'validated',
          validated_by: null, // NULL indicates system auto-validation
          validated_at: new Date().toISOString(),
          validation_notes: `Auto-validated: High confidence (${assessment.damageAssessment.confidence}%), low risk assessment. Meets all auto-validation criteria.`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId);

      if (error) {
        throw error;
      }

      logger.info('Assessment auto-validated', {
        service: 'DataCollectionService',
        assessmentId,
        confidence: assessment.damageAssessment.confidence,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        reason: 'High confidence, low risk',
      });

      return { autoValidated: true };
    } catch (error) {
      logger.error('Error auto-validating assessment', error, {
        service: 'DataCollectionService',
        assessmentId,
      });
      return { autoValidated: false, reason: 'Error during auto-validation' };
    }
  }

  /**
   * Collect assessment for training data
   * Called automatically when assessment is created
   */
  static async collectAssessment(
    assessment: Phase1BuildingAssessment,
    imageUrls: string[],
    userId: string
  ): Promise<void> {
    try {
      // Assessment is already saved by the API endpoint
      // This service provides additional workflow management
      logger.info('Assessment collected for training data', {
        service: 'DataCollectionService',
        userId,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
      });
    } catch (error) {
      logger.error('Error collecting assessment', error, {
        service: 'DataCollectionService',
        userId,
      });
      // Don't throw - data collection is non-critical
    }
  }

  /**
   * Mark assessment as validated by admin
   */
  static async validateAssessment(
    assessmentId: string,
    validatedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('building_assessments')
        .update({
          validation_status: 'validated',
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          validation_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId);

      if (error) {
        throw error;
      }

      logger.info('Assessment validated', {
        service: 'DataCollectionService',
        assessmentId,
        validatedBy,
      });
    } catch (error) {
      logger.error('Error validating assessment', error, {
        service: 'DataCollectionService',
        assessmentId,
      });
      throw error;
    }
  }

  /**
   * Reject assessment (mark as invalid)
   */
  static async rejectAssessment(
    assessmentId: string,
    rejectedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('building_assessments')
        .update({
          validation_status: 'rejected',
          validated_by: rejectedBy,
          validated_at: new Date().toISOString(),
          validation_notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId);

      if (error) {
        throw error;
      }

      logger.info('Assessment rejected', {
        service: 'DataCollectionService',
        assessmentId,
        rejectedBy,
        reason,
      });
    } catch (error) {
      logger.error('Error rejecting assessment', error, {
        service: 'DataCollectionService',
        assessmentId,
      });
      throw error;
    }
  }

  /**
   * Get assessments pending validation
   */
  static async getPendingAssessments(limit = 50, offset = 0) {
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
   * Get validated assessments ready for training
   */
  static async getValidatedAssessments(limit = 100, offset = 0) {
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
   * Export validated assessments in training format (JSONL for fine-tuning)
   * Format compatible with LLaVA/BLIP-2 fine-tuning
   */
  static async exportTrainingData(
    format: 'jsonl' | 'json' = 'jsonl',
    limit = 10000
  ): Promise<string> {
    try {
      const validatedAssessments = await this.getValidatedAssessments(limit, 0);
      
      if (format === 'jsonl') {
        // JSONL format for fine-tuning
        const lines = validatedAssessments.map((assessment) => {
          const images = (assessment.images || []).map((img: any) => ({
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
            images: (assessment.images || []).map((img: any) => img.image_url),
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
   * Track GPT-4 accuracy by comparing GPT-4 output with human validation
   * Calculates accuracy metrics for monitoring model performance
   */
  static async trackGPT4Accuracy(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ): Promise<{
    accuracy: number;
    damageTypeMatch: boolean;
    severityMatch: boolean;
    confidenceDelta: number;
    details: Record<string, any>;
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

      // Damage type: 30% weight
      if (damageTypeMatch) accuracy += 30;
      totalWeight += 30;

      // Severity: 25% weight
      if (severityMatch) accuracy += 25;
      totalWeight += 25;

      // Safety hazards: 20% weight
      if (safetyHazardsMatch) accuracy += 20;
      totalWeight += 20;

      // Urgency: 15% weight
      if (urgencyMatch) accuracy += 15;
      totalWeight += 15;

      // Confidence delta: 10% weight (lower delta = better)
      const confidenceScore = Math.max(0, 10 - Math.abs(confidenceDelta) / 10);
      accuracy += confidenceScore;
      totalWeight += 10;

      const finalAccuracy = Math.round((accuracy / totalWeight) * 100);

      // Store accuracy metrics (could be stored in a separate table)
      logger.info('GPT-4 accuracy tracked', {
        service: 'DataCollectionService',
        assessmentId,
        accuracy: finalAccuracy,
        damageTypeMatch,
        severityMatch,
        confidenceDelta,
      });

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
   * Get GPT-4 accuracy statistics across all validated assessments
   */
  static async getGPT4AccuracyStatistics(): Promise<{
    averageAccuracy: number;
    totalComparisons: number;
    byDamageType: Record<string, number>;
    bySeverity: Record<string, number>;
    accuracyTrend: Array<{ date: string; accuracy: number }>;
  }> {
    try {
      // This would ideally query a metrics table
      // For now, we'll calculate from validated assessments
      const validatedAssessments = await this.getValidatedAssessments(10000, 0);

      // Note: This is a simplified version
      // In production, you'd want to store accuracy metrics in a separate table
      // when human validation occurs

      return {
        averageAccuracy: 0, // Would be calculated from stored metrics
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

  /**
   * Get assessment statistics
   */
  static async getStatistics() {
    try {
      const { data: stats, error } = await serverSupabase
        .from('building_assessments')
        .select('validation_status, severity, damage_type')
        .limit(10000); // Get all for stats

      if (error) {
        throw error;
      }

      const total = stats?.length || 0;
      const pending = stats?.filter((s) => s.validation_status === 'pending').length || 0;
      const validated = stats?.filter((s) => s.validation_status === 'validated').length || 0;
      const rejected = stats?.filter((s) => s.validation_status === 'rejected').length || 0;

      const bySeverity = {
        early: stats?.filter((s) => s.severity === 'early').length || 0,
        midway: stats?.filter((s) => s.severity === 'midway').length || 0,
        full: stats?.filter((s) => s.severity === 'full').length || 0,
      };

      const byDamageType: Record<string, number> = {};
      stats?.forEach((s) => {
        byDamageType[s.damage_type] = (byDamageType[s.damage_type] || 0) + 1;
      });

      return {
        total,
        pending,
        validated,
        rejected,
        bySeverity,
        byDamageType,
        autoValidationEnabled: AUTO_VALIDATION_CONFIG.ENABLED,
        minValidatedForAutoValidation: AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT,
        canAutoValidate: AUTO_VALIDATION_CONFIG.ENABLED && validated >= AUTO_VALIDATION_CONFIG.MIN_VALIDATED_COUNT,
      };
    } catch (error) {
      logger.error('Error fetching statistics', error, {
        service: 'DataCollectionService',
      });
      throw error;
    }
  }
}

