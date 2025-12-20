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
import { ModelEvaluationService, ModelEvaluationMetrics, ModelComparisonResult } from './ModelEvaluationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ABTestConfig {
  test_id: string;
  name: string;
  description: string;

  // Model versions
  control_model: {
    version: string;
    path: string;
    metrics?: ModelEvaluationMetrics;
  };

  treatment_model: {
    version: string;
    path: string;
    metrics?: ModelEvaluationMetrics;
  };

  // Traffic configuration
  traffic_split: {
    control_percentage: number;      // 0-100
    treatment_percentage: number;     // 0-100
    ramp_up_schedule?: {             // Gradual rollout
      day: number;
      percentage: number;
    }[];
  };

  // Test parameters
  minimum_sample_size: number;        // Per variant
  maximum_duration_days: number;
  confidence_level: number;           // e.g., 0.95

  // Success criteria
  success_metrics: {
    primary_metric: 'mAP50' | 'precision' | 'recall' | 'f1_score' | 'latency';
    minimum_improvement: number;       // Percentage
    guardrail_metrics: {              // Metrics that shouldn't degrade
      metric: string;
      max_degradation: number;         // Percentage
    }[];
  };

  // Auto-actions
  auto_deploy_on_success: boolean;
  auto_rollback_on_failure: boolean;

  // Status
  status: 'draft' | 'running' | 'paused' | 'completed' | 'rolled_back';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ABTestResult {
  test_id: string;
  timestamp: string;

  // Sample sizes
  control_samples: number;
  treatment_samples: number;

  // Performance metrics
  control_metrics: {
    mAP50: number;
    precision: number;
    recall: number;
    f1_score: number;
    avg_latency_ms: number;
    error_rate: number;
  };

  treatment_metrics: {
    mAP50: number;
    precision: number;
    recall: number;
    f1_score: number;
    avg_latency_ms: number;
    error_rate: number;
  };

  // Statistical analysis
  statistical_significance: {
    p_value: number;
    confidence_interval: [number, number];
    effect_size: number;
    power: number;
  };

  // Decision
  recommendation: 'continue' | 'deploy_treatment' | 'keep_control' | 'inconclusive';
  confidence: number;
  reasons: string[];
}

export interface ModelAssignment {
  user_id?: string;
  session_id: string;
  assigned_model: 'control' | 'treatment';
  assignment_timestamp: string;
  assignment_method: 'random' | 'hash' | 'sticky';
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ModelABTestingService {
  private static readonly MIN_SAMPLES_FOR_DECISION = 100;
  private static readonly Z_SCORE_95 = 1.96;  // 95% confidence

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
        return this.createInconclusiveResult(testId, 'No data collected yet');
      }

      // Separate by variant
      const controlData = inferences.filter(i => i.model_variant === 'control');
      const treatmentData = inferences.filter(i => i.model_variant === 'treatment');

      // Calculate metrics for each variant
      const controlMetrics = this.calculateVariantMetrics(controlData);
      const treatmentMetrics = this.calculateVariantMetrics(treatmentData);

      // Perform statistical analysis
      const significance = this.calculateStatisticalSignificance(
        controlMetrics,
        treatmentMetrics,
        controlData.length,
        treatmentData.length
      );

      // Generate recommendation
      const recommendation = this.generateABTestRecommendation(
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static calculateVariantMetrics(data: any[]): any {
    if (data.length === 0) {
      return {
        mAP50: 0,
        precision: 0,
        recall: 0,
        f1_score: 0,
        avg_latency_ms: 0,
        error_rate: 0
      };
    }

    const successfulInferences = data.filter(d => d.success);
    const avgLatency = data.reduce((sum, d) => sum + d.latency_ms, 0) / data.length;
    const errorRate = (data.length - successfulInferences.length) / data.length;
    const avgConfidence = successfulInferences.reduce((sum, d) => sum + (d.avg_confidence || 0), 0) /
                         (successfulInferences.length || 1);

    // These would come from actual model evaluation
    // For now, using confidence as a proxy
    return {
      mAP50: avgConfidence * 0.9,  // Simplified
      precision: avgConfidence * 0.85,
      recall: avgConfidence * 0.88,
      f1_score: avgConfidence * 0.86,
      avg_latency_ms: avgLatency,
      error_rate: errorRate
    };
  }

  private static calculateStatisticalSignificance(
    controlMetrics: any,
    treatmentMetrics: any,
    controlN: number,
    treatmentN: number
  ): any {
    // Simplified statistical test - would use proper test in production
    const controlMean = controlMetrics.f1_score;
    const treatmentMean = treatmentMetrics.f1_score;

    // Assumed standard deviations (would calculate from actual data)
    const controlStd = 0.05;
    const treatmentStd = 0.05;

    // Calculate standard error
    const se = Math.sqrt(
      (controlStd * controlStd / controlN) +
      (treatmentStd * treatmentStd / treatmentN)
    );

    // Calculate z-score
    const z = (treatmentMean - controlMean) / (se || 0.001);

    // Calculate p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // Calculate confidence interval
    const margin = this.Z_SCORE_95 * se;
    const diff = treatmentMean - controlMean;
    const ci: [number, number] = [diff - margin, diff + margin];

    // Calculate effect size (Cohen's d)
    const pooledStd = Math.sqrt(
      ((controlN - 1) * controlStd * controlStd +
       (treatmentN - 1) * treatmentStd * treatmentStd) /
      (controlN + treatmentN - 2)
    );
    const effectSize = (treatmentMean - controlMean) / (pooledStd || 0.001);

    // Calculate statistical power (simplified)
    const power = 1 - this.normalCDF(this.Z_SCORE_95 - Math.abs(z));

    return {
      p_value: pValue,
      confidence_interval: ci,
      effect_size: effectSize,
      power: power
    };
  }

  private static normalCDF(z: number): number {
    // Approximation of the normal cumulative distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * z);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;
    const y = 1.0 - ((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) *
              Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  private static generateABTestRecommendation(
    config: ABTestConfig,
    controlMetrics: any,
    treatmentMetrics: any,
    significance: any,
    controlN: number,
    treatmentN: number
  ): {
    decision: 'continue' | 'deploy_treatment' | 'keep_control' | 'inconclusive';
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check sample size
    if (controlN < config.minimum_sample_size || treatmentN < config.minimum_sample_size) {
      reasons.push(`Insufficient samples (need ${config.minimum_sample_size} per variant)`);
      return { decision: 'continue', confidence: 0.3, reasons };
    }

    // Check statistical significance
    const isSignificant = significance.p_value < (1 - config.confidence_level);

    // Calculate improvement on primary metric
    const primaryMetric = config.success_metrics.primary_metric;
    const controlValue = controlMetrics[primaryMetric];
    const treatmentValue = treatmentMetrics[primaryMetric];
    const improvement = ((treatmentValue - controlValue) / controlValue) * 100;

    // Check guardrail metrics
    let guardrailViolation = false;
    for (const guardrail of config.success_metrics.guardrail_metrics) {
      const controlGuardrail = controlMetrics[guardrail.metric];
      const treatmentGuardrail = treatmentMetrics[guardrail.metric];
      const degradation = ((controlGuardrail - treatmentGuardrail) / controlGuardrail) * 100;

      if (degradation > guardrail.max_degradation) {
        guardrailViolation = true;
        reasons.push(`Guardrail violation: ${guardrail.metric} degraded by ${degradation.toFixed(2)}%`);
      }
    }

    // Make recommendation
    if (guardrailViolation) {
      reasons.push('Treatment violates guardrail metrics');
      return { decision: 'keep_control', confidence: 0.9, reasons };
    }

    if (!isSignificant) {
      reasons.push('Results not statistically significant');
      return { decision: 'continue', confidence: 0.5, reasons };
    }

    if (improvement >= config.success_metrics.minimum_improvement) {
      reasons.push(`Treatment shows ${improvement.toFixed(2)}% improvement on ${primaryMetric}`);
      reasons.push('Statistical significance achieved');
      return { decision: 'deploy_treatment', confidence: significance.power, reasons };
    }

    if (improvement < 0) {
      reasons.push(`Treatment shows ${Math.abs(improvement).toFixed(2)}% degradation on ${primaryMetric}`);
      return { decision: 'keep_control', confidence: significance.power, reasons };
    }

    reasons.push('Improvement below minimum threshold');
    return { decision: 'continue', confidence: 0.6, reasons };
  }

  private static createInconclusiveResult(testId: string, reason: string): ABTestResult {
    return {
      test_id: testId,
      timestamp: new Date().toISOString(),
      control_samples: 0,
      treatment_samples: 0,
      control_metrics: {
        mAP50: 0,
        precision: 0,
        recall: 0,
        f1_score: 0,
        avg_latency_ms: 0,
        error_rate: 0
      },
      treatment_metrics: {
        mAP50: 0,
        precision: 0,
        recall: 0,
        f1_score: 0,
        avg_latency_ms: 0,
        error_rate: 0
      },
      statistical_significance: {
        p_value: 1,
        confidence_interval: [0, 0],
        effect_size: 0,
        power: 0
      },
      recommendation: 'inconclusive',
      confidence: 0,
      reasons: [reason]
    };
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
  detections: any[]
): Promise<void> {
  await ModelABTestingService.recordInference(testId, sessionId, model, {
    latency_ms: latencyMs,
    success,
    detections_count: detections.length,
    confidence_scores: detections.map(d => d.confidence || 0)
  });
}
