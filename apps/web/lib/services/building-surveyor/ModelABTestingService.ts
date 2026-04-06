/**
 * A/B Testing Service for Model Deployment
 *
 * Manages controlled rollout of new models with:
 * - Traffic splitting
 * - Performance monitoring
 * - Automatic rollback on degradation
 * - Statistical significance testing
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { ABTestConfig, ABTestResult, ModelAssignment } from './ab-testing/types';
import { calculateVariantMetrics, createInconclusiveResult } from './ab-testing/metrics';
import { calculateStatisticalSignificance } from './ab-testing/statistics';
import { generateABTestRecommendation } from './ab-testing/recommendations';

// Re-export types for backward compatibility
export type { ABTestConfig, ABTestResult, ModelAssignment } from './ab-testing/types';

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ModelABTestingService {
  private static readonly MIN_SAMPLES_FOR_DECISION = 100;

  /**
   * Create a new A/B test
   */
  static async createABTest(config: Omit<ABTestConfig, 'test_id' | 'created_at' | 'status'>): Promise<ABTestConfig> {
    try {
      const supabase = serverSupabase;

      const test: ABTestConfig = {
        ...config,
        test_id: `ab_test_${Date.now()}`,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      // Validate traffic split
      const totalTraffic = config.traffic_split.control_percentage + config.traffic_split.treatment_percentage;
      if (totalTraffic > 100) {
        throw new Error('Traffic split cannot exceed 100%');
      }

      // Store in database
      const { error } = await supabase
        .from('model_ab_tests')
        .insert({
          test_id: test.test_id,
          config_jsonb: test,
          status: test.status,
          created_at: test.created_at
        });

      if (error) throw error;

      logger.info('A/B test created', {
        testId: test.test_id,
        controlModel: test.control_model.version,
        treatmentModel: test.treatment_model.version
      });

      return test;

    } catch (error) {
      logger.error('Failed to create A/B test', { error });
      throw error;
    }
  }

  /**
   * Start an A/B test
   */
  static async startTest(testId: string): Promise<void> {
    try {
      const supabase = serverSupabase;

      // Update test status
      const { error } = await supabase
        .from('model_ab_tests')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('test_id', testId);

      if (error) throw error;

      logger.info('A/B test started', { testId });

      // Initialize monitoring
      this.startMonitoring(testId);

    } catch (error) {
      logger.error('Failed to start A/B test', { error, testId });
      throw error;
    }
  }

  /**
   * Assign a user/session to a model variant
   */
  static async assignModel(
    testId: string,
    sessionId: string,
    userId?: string
  ): Promise<ModelAssignment> {
    try {
      const supabase = serverSupabase;

      // Get test configuration
      const { data: testData, error: testError } = await supabase
        .from('model_ab_tests')
        .select('config_jsonb')
        .eq('test_id', testId)
        .eq('status', 'running')
        .single();

      if (testError || !testData) {
        throw new Error('A/B test not found or not running');
      }

      const config = testData.config_jsonb as ABTestConfig;

      // Check for existing assignment (sticky sessions)
      const { data: existing } = await supabase
        .from('model_assignments')
        .select('assigned_model')
        .eq('test_id', testId)
        .eq('session_id', sessionId)
        .single();

      if (existing) {
        return {
          session_id: sessionId,
          user_id: userId,
          assigned_model: existing.assigned_model,
          assignment_timestamp: new Date().toISOString(),
          assignment_method: 'sticky'
        };
      }

      // Perform random assignment based on traffic split
      const randomValue = Math.random() * 100;
      const assignedModel = randomValue < config.traffic_split.control_percentage
        ? 'control'
        : 'treatment';

      // Store assignment
      const assignment: ModelAssignment = {
        session_id: sessionId,
        user_id: userId,
        assigned_model: assignedModel,
        assignment_timestamp: new Date().toISOString(),
        assignment_method: 'random'
      };

      await supabase
        .from('model_assignments')
        .insert({
          test_id: testId,
          ...assignment
        });

      logger.info('Model assigned', {
        testId,
        sessionId,
        assignedModel
      });

      return assignment;

    } catch (error) {
      logger.error('Failed to assign model', { error, testId, sessionId });
      // Default to control on error
      return {
        session_id: sessionId,
        user_id: userId,
        assigned_model: 'control',
        assignment_timestamp: new Date().toISOString(),
        assignment_method: 'random'
      };
    }
  }

  /**
   * Record inference result for monitoring
   */
  static async recordInference(
    testId: string,
    sessionId: string,
    model: 'control' | 'treatment',
    metrics: {
      latency_ms: number;
      success: boolean;
      detections_count: number;
      confidence_scores: number[];
    }
  ): Promise<void> {
    try {
      const supabase = serverSupabase;

      await supabase
        .from('model_inference_logs')
        .insert({
          test_id: testId,
          session_id: sessionId,
          model_variant: model,
          latency_ms: metrics.latency_ms,
          success: metrics.success,
          detections_count: metrics.detections_count,
          avg_confidence: metrics.confidence_scores.length > 0
            ? metrics.confidence_scores.reduce((a, b) => a + b, 0) / metrics.confidence_scores.length
            : 0,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      // Log but don't throw - inference logging shouldn't break the main flow
      logger.warn('Failed to record inference', { error, testId, sessionId });
    }
  }

  /**
   * Analyze A/B test results
   */
  static async analyzeResults(testId: string): Promise<ABTestResult> {
    try {
      const supabase = serverSupabase;

      // Get test configuration
      const { data: testData } = await supabase
        .from('model_ab_tests')
        .select('config_jsonb')
        .eq('test_id', testId)
        .single();

      const config = testData?.config_jsonb as ABTestConfig;

      // Get inference logs for both variants
      const { data: inferences } = await supabase
        .from('model_inference_logs')
        .select('*')
        .eq('test_id', testId);

      if (!inferences || inferences.length === 0) {
        return createInconclusiveResult(testId, 'No data collected yet');
      }

      // Separate by variant
      const controlData = inferences.filter((i: Record<string, unknown>) => i.model_variant === 'control');
      const treatmentData = inferences.filter((i: Record<string, unknown>) => i.model_variant === 'treatment');

      // Calculate metrics for each variant
      const controlMetrics = calculateVariantMetrics(controlData);
      const treatmentMetrics = calculateVariantMetrics(treatmentData);

      // Perform statistical analysis
      const significance = calculateStatisticalSignificance(
        controlMetrics,
        treatmentMetrics,
        controlData.length,
        treatmentData.length
      );

      // Generate recommendation
      const recommendation = generateABTestRecommendation(
        config,
        controlMetrics,
        treatmentMetrics,
        significance,
        controlData.length,
        treatmentData.length
      );

      const result: ABTestResult = {
        test_id: testId,
        timestamp: new Date().toISOString(),
        control_samples: controlData.length,
        treatment_samples: treatmentData.length,
        control_metrics: controlMetrics,
        treatment_metrics: treatmentMetrics,
        statistical_significance: significance,
        recommendation: recommendation.decision,
        confidence: recommendation.confidence,
        reasons: recommendation.reasons
      };

      logger.info('A/B test analysis complete', {
        testId,
        recommendation: result.recommendation,
        samples: { control: controlData.length, treatment: treatmentData.length }
      });

      return result;

    } catch (error) {
      logger.error('Failed to analyze A/B test', { error, testId });
      throw error;
    }
  }

  /**
   * Check if test should be auto-completed
   */
  static async checkAutoComplete(testId: string): Promise<boolean> {
    try {
      const result = await this.analyzeResults(testId);
      const supabase = serverSupabase;

      // Get test config
      const { data: testData } = await supabase
        .from('model_ab_tests')
        .select('config_jsonb')
        .eq('test_id', testId)
        .single();

      const config = testData?.config_jsonb as ABTestConfig;

      // Check completion criteria
      const hasEnoughSamples =
        result.control_samples >= config.minimum_sample_size &&
        result.treatment_samples >= config.minimum_sample_size;

      const hasStatisticalSignificance =
        result.statistical_significance.p_value < (1 - config.confidence_level);

      const shouldComplete = hasEnoughSamples && (
        hasStatisticalSignificance ||
        result.recommendation === 'deploy_treatment' ||
        result.recommendation === 'keep_control'
      );

      if (shouldComplete) {
        // Auto-deploy or rollback based on configuration
        if (result.recommendation === 'deploy_treatment' && config.auto_deploy_on_success) {
          await this.deployTreatment(testId);
        } else if (result.recommendation === 'keep_control' && config.auto_rollback_on_failure) {
          await this.rollbackToControl(testId);
        }

        // Mark test as completed
        await supabase
          .from('model_ab_tests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('test_id', testId);

        logger.info('A/B test auto-completed', {
          testId,
          recommendation: result.recommendation
        });

        return true;
      }

      return false;

    } catch (error) {
      logger.error('Failed to check auto-complete', { error, testId });
      return false;
    }
  }

  /**
   * Deploy the treatment model (winner)
   */
  static async deployTreatment(testId: string): Promise<void> {
    try {
      const supabase = serverSupabase;

      // Get test configuration
      const { data: testData } = await supabase
        .from('model_ab_tests')
        .select('config_jsonb')
        .eq('test_id', testId)
        .single();

      const config = testData?.config_jsonb as ABTestConfig;

      // Update active model version
      await supabase
        .from('yolo_models')
        .update({ is_active: false })
        .eq('is_active', true);

      await supabase
        .from('yolo_models')
        .update({ is_active: true })
        .eq('version', config.treatment_model.version);

      logger.info('Treatment model deployed', {
        testId,
        modelVersion: config.treatment_model.version
      });

    } catch (error) {
      logger.error('Failed to deploy treatment', { error, testId });
      throw error;
    }
  }

  /**
   * Rollback to control model
   */
  static async rollbackToControl(testId: string): Promise<void> {
    try {
      const supabase = serverSupabase;

      // Update test status
      await supabase
        .from('model_ab_tests')
        .update({
          status: 'rolled_back',
          completed_at: new Date().toISOString()
        })
        .eq('test_id', testId);

      logger.info('Rolled back to control model', { testId });

    } catch (error) {
      logger.error('Failed to rollback', { error, testId });
      throw error;
    }
  }

  private static async startMonitoring(testId: string): Promise<void> {
    // Set up periodic monitoring
    const checkInterval = setInterval(async () => {
      try {
        const shouldComplete = await this.checkAutoComplete(testId);
        if (shouldComplete) {
          clearInterval(checkInterval);
        }
      } catch (error) {
        logger.error('Monitoring check failed', { error, testId });
      }
    }, 60 * 60 * 1000);  // Check every hour

    // Store interval ID for cleanup if needed
    // In production, this would be stored in a more persistent way
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick function to get the model version for a session
 */
export async function getModelForSession(
  testId: string,
  sessionId: string,
  userId?: string
): Promise<'control' | 'treatment'> {
  const assignment = await ModelABTestingService.assignModel(testId, sessionId, userId);
  return assignment.assigned_model;
}

/**
 * Record model performance for A/B testing
 */
export async function recordModelPerformance(
  testId: string,
  sessionId: string,
  model: 'control' | 'treatment',
  latencyMs: number,
  success: boolean,
  detections: unknown[]
): Promise<void> {
  await ModelABTestingService.recordInference(testId, sessionId, model, {
    latency_ms: latencyMs,
    success,
    detections_count: detections.length,
    confidence_scores: detections.map((d) => ((d as Record<string, unknown>).confidence as number) || 0)
  });
}
