/**
 * Feature Extractor A/B Testing Service
 * 
 * Compares learned feature extraction vs handcrafted features
 * Tracks accuracy, performance, and learning progress over time
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { LearnedFeatureExtractor } from './LearnedFeatureExtractor';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
  Phase1BuildingAssessment,
} from './types';

export interface ABTestResult {
  assessmentId: string;
  timestamp: Date;
  variant: 'learned' | 'handcrafted';
  features: number[];
  assessmentAccuracy?: {
    damageTypeCorrect: boolean;
    severityCorrect: boolean;
    urgencyCorrect: boolean;
    confidenceError: number;
    costError: number;
  };
  performance: {
    extractionTimeMs: number;
    memoryUsageMB?: number;
  };
  humanValidation?: {
    validatedAt: Date;
    accuracy: number;
  };
}

export interface ABTestMetrics {
  variant: 'learned' | 'handcrafted';
  totalAssessments: number;
  averageAccuracy: number;
  averageExtractionTime: number;
  learningProgress?: {
    averageError: number;
    updateCount: number;
    errorTrend: number[]; // Error over time
  };
}

/**
 * A/B Testing Service for Feature Extractors
 * 
 * Randomly assigns assessments to learned or handcrafted features
 * Tracks performance and accuracy metrics for comparison
 */
export class FeatureExtractorABTest {
  private static readonly TABLE_NAME = 'feature_extractor_ab_tests';
  private static readonly AGENT_NAME = 'building-surveyor';
  private static learnedExtractor: LearnedFeatureExtractor | null = null;
  private static splitRatio: number = 0.5; // 50/50 split

  /**
   * Initialize learned feature extractor for A/B testing
   */
  static async initialize(): Promise<void> {
    try {
      this.learnedExtractor = new LearnedFeatureExtractor(
        this.AGENT_NAME,
        {
          inputDim: 50,
          outputDim: 40,
          hiddenDims: [64, 48],
          learningRate: 0.001,
          regularization: 0.0001,
        }
      );
      await this.learnedExtractor.loadState();
      
      logger.info('Feature extractor A/B test initialized', {
        service: 'FeatureExtractorABTest',
        splitRatio: this.splitRatio,
      });
    } catch (error) {
      logger.error('Failed to initialize A/B test', error, {
        service: 'FeatureExtractorABTest',
      });
    }
  }

  /**
   * Assign variant (learned or handcrafted) for an assessment
   * Uses consistent hashing based on assessment ID for stable assignment
   */
  static assignVariant(assessmentId: string): 'learned' | 'handcrafted' {
    // Use consistent hashing for stable assignment
    const hash = this.hashString(assessmentId);
    return hash < this.splitRatio ? 'learned' : 'handcrafted';
  }

  /**
   * Extract features using assigned variant
   */
  static async extractFeatures(
    assessmentId: string,
    imageUrls: string[],
    context?: AssessmentContext,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<{ features: number[]; variant: 'learned' | 'handcrafted'; extractionTimeMs: number }> {
    const variant = this.assignVariant(assessmentId);
    const startTime = Date.now();

    let features: number[];

    if (variant === 'learned' && this.learnedExtractor) {
      try {
        features = await this.learnedExtractor.extractFeatures(
          imageUrls,
          context,
          roboflowDetections,
          visionSummary
        );
      } catch (error) {
        logger.warn('Learned extraction failed, falling back to handcrafted', {
          service: 'FeatureExtractorABTest',
          assessmentId,
          error: error instanceof Error ? error.message : 'unknown',
        });
        // Fallback to handcrafted
        features = await this.extractHandcraftedFeatures(
          imageUrls,
          context,
          roboflowDetections,
          visionSummary
        );
      }
    } else {
      features = await this.extractHandcraftedFeatures(
        imageUrls,
        context,
        roboflowDetections,
        visionSummary
      );
    }

    const extractionTimeMs = Date.now() - startTime;

    return { features, variant, extractionTimeMs };
  }

  /**
   * Record A/B test result
   */
  static async recordResult(
    assessmentId: string,
    variant: 'learned' | 'handcrafted',
    features: number[],
    extractionTimeMs: number,
    assessment?: Phase1BuildingAssessment
  ): Promise<void> {
    try {
      const result: ABTestResult = {
        assessmentId,
        timestamp: new Date(),
        variant,
        features,
        performance: {
          extractionTimeMs,
        },
      };

      if (assessment) {
        // Store assessment for later accuracy calculation
        result.assessmentAccuracy = {
          damageTypeCorrect: true, // Will be updated on validation
          severityCorrect: true,
          urgencyCorrect: true,
          confidenceError: 0,
          costError: 0,
        };
      }

      await serverSupabase
        .from(this.TABLE_NAME)
        .insert({
          assessment_id: assessmentId,
          variant: variant,
          features_jsonb: features,
          extraction_time_ms: extractionTimeMs,
          assessment_data_jsonb: assessment || null,
          created_at: new Date().toISOString(),
        });

      logger.debug('A/B test result recorded', {
        service: 'FeatureExtractorABTest',
        assessmentId,
        variant,
        extractionTimeMs,
      });
    } catch (error) {
      logger.error('Failed to record A/B test result', error, {
        service: 'FeatureExtractorABTest',
        assessmentId,
      });
    }
  }

  /**
   * Update result with human validation
   */
  static async updateWithValidation(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ): Promise<void> {
    try {
      // Get original result
      const { data: result, error: fetchError } = await serverSupabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('assessment_id', assessmentId)
        .single();

      if (fetchError || !result) {
        logger.warn('A/B test result not found for validation update', {
          service: 'FeatureExtractorABTest',
          assessmentId,
        });
        return;
      }

      const originalAssessment = result.assessment_data_jsonb as Phase1BuildingAssessment | null;
      if (!originalAssessment) {
        return;
      }

      // Calculate accuracy metrics
      const accuracy = {
        damageTypeCorrect: originalAssessment.damageAssessment.damageType ===
          humanValidatedAssessment.damageAssessment.damageType,
        severityCorrect: originalAssessment.damageAssessment.severity ===
          humanValidatedAssessment.damageAssessment.severity,
        urgencyCorrect: originalAssessment.urgency.urgency ===
          humanValidatedAssessment.urgency.urgency,
        confidenceError: Math.abs(
          originalAssessment.damageAssessment.confidence -
          humanValidatedAssessment.damageAssessment.confidence
        ) / 100,
        costError: originalAssessment.contractorAdvice?.estimatedCost?.recommended &&
          humanValidatedAssessment.contractorAdvice?.estimatedCost?.recommended
          ? Math.abs(
              (humanValidatedAssessment.contractorAdvice.estimatedCost.recommended -
               originalAssessment.contractorAdvice.estimatedCost.recommended) /
              originalAssessment.contractorAdvice.estimatedCost.recommended
            )
          : 0,
      };

      const overallAccuracy = (
        (accuracy.damageTypeCorrect ? 1 : 0) * 0.3 +
        (accuracy.severityCorrect ? 1 : 0) * 0.25 +
        (accuracy.urgencyCorrect ? 1 : 0) * 0.15 +
        (1 - Math.min(1, accuracy.confidenceError)) * 0.1 +
        (1 - Math.min(1, accuracy.costError)) * 0.2
      );

      // Update result
      await serverSupabase
        .from(this.TABLE_NAME)
        .update({
          accuracy_jsonb: accuracy,
          overall_accuracy: overallAccuracy,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('assessment_id', assessmentId);

      logger.info('A/B test result updated with validation', {
        service: 'FeatureExtractorABTest',
        assessmentId,
        variant: result.variant,
        overallAccuracy,
      });
    } catch (error) {
      logger.error('Failed to update A/B test result with validation', error, {
        service: 'FeatureExtractorABTest',
        assessmentId,
      });
    }
  }

  /**
   * Get A/B test metrics for comparison
   */
  static async getMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ learned: ABTestMetrics; handcrafted: ABTestMetrics }> {
    try {
      let query = serverSupabase
        .from(this.TABLE_NAME)
        .select('*')
        .not('overall_accuracy', 'is', null); // Only validated results

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: results, error } = await query;

      if (error || !results) {
        throw new Error(`Failed to fetch A/B test results: ${error?.message}`);
      }

      const learnedResults = results.filter(r => r.variant === 'learned');
      const handcraftedResults = results.filter(r => r.variant === 'handcrafted');

      const learnedMetrics = this.calculateMetrics('learned', learnedResults);
      const handcraftedMetrics = this.calculateMetrics('handcrafted', handcraftedResults);

      // Add learning progress for learned variant
      if (this.learnedExtractor) {
        learnedMetrics.learningProgress = {
          averageError: this.learnedExtractor.getAverageError(),
          updateCount: this.learnedExtractor.getState().updateCount,
          errorTrend: [], // Could be enhanced to track over time
        };
      }

      return { learned: learnedMetrics, handcrafted: handcraftedMetrics };
    } catch (error) {
      logger.error('Failed to get A/B test metrics', error, {
        service: 'FeatureExtractorABTest',
      });
      throw error;
    }
  }

  /**
   * Calculate metrics for a variant
   */
  private static calculateMetrics(
    variant: 'learned' | 'handcrafted',
    results: any[]
  ): ABTestMetrics {
    if (results.length === 0) {
      return {
        variant,
        totalAssessments: 0,
        averageAccuracy: 0,
        averageExtractionTime: 0,
      };
    }

    const totalAssessments = results.length;
    const averageAccuracy = results.reduce(
      (sum, r) => sum + (r.overall_accuracy || 0),
      0
    ) / totalAssessments;
    const averageExtractionTime = results.reduce(
      (sum, r) => sum + (r.extraction_time_ms || 0),
      0
    ) / totalAssessments;

    return {
      variant,
      totalAssessments,
      averageAccuracy,
      averageExtractionTime,
    };
  }

  /**
   * Extract handcrafted features (simplified version)
   * In production, this would call BuildingSurveyorService.extractDetectionFeaturesHandcrafted
   */
  private static async extractHandcraftedFeatures(
    imageUrls: string[],
    context?: AssessmentContext,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<number[]> {
    // This is a placeholder - in production, import and call the actual method
    // For now, return a simple feature vector
    const features: number[] = [];
    
    // Property context
    features.push(context?.propertyType === 'residential' ? 1.0 : 0.0);
    features.push(context?.propertyType === 'commercial' ? 1.0 : 0.0);
    features.push((context?.ageOfProperty || 0) / 200);
    
    // Detection counts
    const detectionCount = roboflowDetections?.length || 0;
    features.push(detectionCount / 50);
    
    // Vision summary
    if (visionSummary) {
      features.push(visionSummary.confidence / 100);
      features.push(Math.min(1.0, visionSummary.labels.length / 20));
    } else {
      features.push(0, 0);
    }
    
    // Pad to 40 dimensions
    while (features.length < 40) {
      features.push(0);
    }
    
    return features.slice(0, 40);
  }

  /**
   * Hash string to number between 0 and 1
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  }
}

