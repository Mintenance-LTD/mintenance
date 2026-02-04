import { logger } from '../logger';
/**
 * Conformal Prediction Service
 * Provides mathematically guaranteed confidence intervals for damage predictions
 * 
 * Note: This service requires a Supabase client to be injected via setSupabaseClient()
 * before use, as the shared package doesn't have direct database access.
 */
// Supabase client type - injected at runtime
// select() return type is unknown; use typed await via assertion when destructuring
interface SupabaseClient {
  from(table: string): {
    select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): unknown;
    insert(data: Record<string, unknown>): unknown;
    update(data: Record<string, unknown>): unknown;
    upsert(data: Record<string, unknown>): unknown;
  };
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: Record<string, unknown>; error: Error | unknown }>;
}
let _supabaseClient: SupabaseClient | null = null;
/**
 * Inject the Supabase client for this service
 * Must be called before using any database operations
 */
export function setSupabaseClient(client: SupabaseClient): void {
  _supabaseClient = client;
}
function getSupabase(): SupabaseClient {
  if (!_supabaseClient) {
    throw new Error(
      'ConformalPrediction: Supabase client not initialized. ' +
      'Call setSupabaseClient() before using database operations.'
    );
  }
  return _supabaseClient;
}
// ============================================================================
// Types and Interfaces
// ============================================================================
export type PropertyAgeCategory = 'victorian' | 'post_war' | 'modern' | 'unknown';
export type SeverityLevel = 'early' | 'midway' | 'full';
export type DamageType = string; // Various damage types from assessments
export interface PredictionScores {
  early: number;
  midway: number;
  full: number;
}
export interface CalibrationSet {
  id: string;
  version: number;
  set_name: string;
  set_type: 'full' | 'stratified' | 'damage_specific';
  stratum?: string;
  sample_count: number;
  min_confidence: number;
  max_confidence: number;
  mean_confidence: number;
  std_confidence: number;
  empirical_coverage?: number;
  target_coverage: number;
  calibration_error?: number;
  created_at: string;
  valid_until: string;
  is_active: boolean;
}
export interface CalibrationSample {
  id: string;
  calibration_set_id: string;
  assessment_id?: string;
  features: Record<string, unknown>;
  property_age_category: PropertyAgeCategory;
  damage_category: string;
  predicted_severity: SeverityLevel;
  predicted_confidence: number;
  prediction_scores: PredictionScores;
  true_severity: SeverityLevel;
  true_damage_type: string;
  ground_truth_source: 'expert_validation' | 'repair_outcome' | 'contractor_feedback';
  nonconformity_score: number;
}
export interface ConformalPredictionInterval {
  confidence_level: number;
  prediction_set: SeverityLevel[];
  threshold_used: number;
  calibration_set_id?: string;
  stratum?: string;
  interval_size: number;
}
export interface CalibrationMetrics {
  total_predictions: number;
  correct_predictions: number;
  empirical_coverage: number;
  target_coverage: number;
  avg_confidence: number;
  calibration_error: number;
}
// ============================================================================
// Conformal Prediction Service
// ============================================================================
export class ConformalPredictionService {
  private static instance: ConformalPredictionService;
  private constructor() { }
  public static getInstance(): ConformalPredictionService {
    if (!ConformalPredictionService.instance) {
      ConformalPredictionService.instance = new ConformalPredictionService();
    }
    return ConformalPredictionService.instance;
  }
  /**
   * Get conformal prediction interval with guaranteed coverage
   */
  async getPredictionInterval(
    predictionScores: PredictionScores,
    propertyAgeCategory: PropertyAgeCategory,
    damageType: string,
    confidenceLevel: number = 0.95
  ): Promise<ConformalPredictionInterval> {
    const { data, error } = await getSupabase().rpc('get_conformal_prediction_interval', {
      p_prediction_scores: predictionScores,
      p_property_age_category: propertyAgeCategory,
      p_damage_type: damageType,
      p_confidence_level: confidenceLevel
    });
    if (error) {
      logger.error('Error getting prediction interval:', error, { service: 'general' });
      // Fallback to simple threshold-based interval
      return this.getFallbackInterval(predictionScores, confidenceLevel);
    }
    return (data as unknown) as ConformalPredictionInterval;
  }
  /**
   * Calculate nonconformity score for a prediction
   */
  async calculateNonconformityScore(
    predictionScores: PredictionScores,
    trueClass: SeverityLevel,
    scoreType: 'hinge' | 'margin' | 'inverse_probability' = 'hinge'
  ): Promise<number> {
    const { data, error } = await getSupabase().rpc('calculate_nonconformity_score', {
      predicted_scores: predictionScores,
      true_class: trueClass,
      score_type: scoreType
    });
    if (error) {
      logger.error('Error calculating nonconformity score:', error, { service: 'general' });
      return this.calculateLocalNonconformityScore(predictionScores, trueClass, scoreType);
    }
    return (data as unknown) as number;
  }
  /**
   * Get active calibration sets
   */
  async getActiveCalibrationSets(): Promise<CalibrationSet[]> {
    // @ts-expect-error TS2571 - Supabase chain returns unknown; we assert Promise shape for typed destructuring
    const { data, error } = await (getSupabase()
      .from('conformal_calibration_sets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: CalibrationSet[] | null; error: Error | null }>);
    if (error) {
      logger.error('Error fetching calibration sets:', error, { service: 'general' });
      return [];
    }
    return (data ?? []) as CalibrationSet[];
  }
  /**
   * Get calibration summary with performance metrics
   */
  async getCalibrationSummary(): Promise<any[]> {
    // @ts-expect-error TS2571 - Supabase chain returns unknown; we assert Promise shape for typed destructuring
    const { data, error } = await (getSupabase()
      .from('v_calibration_summary')
      .select('*')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: unknown[] | null; error: Error | null }>);
    if (error) {
      logger.error('Error fetching calibration summary:', error, { service: 'general' });
      return [];
    }
    return (data ?? []) as any[];
  }
  /**
   * Build a new calibration set (admin only)
   */
  async buildCalibrationSet(
    setName: string,
    setType: 'full' | 'stratified' | 'damage_specific' = 'full',
    stratum?: string,
    minSamples: number = 500,
    validationSplit: number = 0.2
  ): Promise<string | null> {
    const { data, error } = await getSupabase().rpc('build_calibration_set', {
      p_set_name: setName,
      p_set_type: setType,
      p_stratum: stratum,
      p_min_samples: minSamples,
      p_validation_split: validationSplit
    });
    if (error) {
      logger.error('Error building calibration set:', error, { service: 'general' });
      return null;
    }
    return (data as unknown) as string;
  }
  /**
   * Trigger recalibration (admin only)
   */
  async recalibrateModels(force: boolean = false): Promise<void> {
    const { error } = await getSupabase().rpc('recalibrate_conformal_models', {
      p_force: force
    });
    if (error) {
      logger.error('Error recalibrating models:', error, { service: 'general' });
      throw error;
    }
  }
  /**
   * Get performance metrics for a calibration set
   */
  async getPerformanceMetrics(
    calibrationSetId: string,
    daysBack: number = 7
  ): Promise<CalibrationMetrics | null> {
    // @ts-expect-error TS2571 - Supabase chain returns unknown; we assert Promise shape for typed destructuring
    const { data, error } = await (getSupabase()
      .from('conformal_performance_metrics')
      .select('*')
      .eq('calibration_set_id', calibrationSetId)
      .gte('evaluation_end', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('evaluation_end', { ascending: false })
      .limit(1)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);
    if (error || data == null) {
      if (error) logger.error('Error fetching performance metrics:', error, { service: 'general' });
      return null;
    }
    const row = data;
    return {
      total_predictions: (row['predictions_made'] as number) ?? 0,
      correct_predictions: (row['correct_predictions'] as number) ?? 0,
      empirical_coverage: (row['empirical_coverage'] as number) ?? 0,
      target_coverage: 0.95,
      avg_confidence: (row['avg_interval_size'] as number) ?? 0,
      calibration_error: Math.abs(((row['empirical_coverage'] as number) ?? 0) - 0.95)
    };
  }
  /**
   * Check if a prediction is within the confidence interval
   */
  isPredictionInInterval(
    actualSeverity: SeverityLevel,
    predictionInterval: ConformalPredictionInterval
  ): boolean {
    return predictionInterval.prediction_set.includes(actualSeverity);
  }
  /**
   * Get adaptive confidence level based on context
   */
  getAdaptiveConfidenceLevel(
    urgency: string,
    isCriticalInfrastructure: boolean = false
  ): number {
    // Higher confidence for more critical scenarios
    if (isCriticalInfrastructure) {
      return 0.99; // 99% confidence for critical infrastructure
    }
    switch (urgency) {
      case 'immediate':
        return 0.99;
      case 'urgent':
        return 0.95;
      case 'soon':
        return 0.90;
      case 'planned':
        return 0.85;
      case 'monitor':
      default:
        return 0.80;
    }
  }
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  /**
   * Fallback interval calculation when database is unavailable
   */
  private getFallbackInterval(
    predictionScores: PredictionScores,
    confidenceLevel: number
  ): ConformalPredictionInterval {
    const sortedScores = Object.entries(predictionScores)
      .sort(([, a], [, b]) => b - a);
    let cumulativeScore = 0;
    const predictionSet: SeverityLevel[] = [];
    for (const [severity, score] of sortedScores) {
      predictionSet.push(severity as SeverityLevel);
      cumulativeScore += score;
      if (cumulativeScore >= confidenceLevel) {
        break;
      }
    }
    return {
      confidence_level: confidenceLevel,
      prediction_set: predictionSet,
      threshold_used: 1 - confidenceLevel, // Simple threshold
      interval_size: predictionSet.length
    };
  }
  /**
   * Local calculation of nonconformity score
   */
  private calculateLocalNonconformityScore(
    predictionScores: PredictionScores,
    trueClass: SeverityLevel,
    scoreType: string
  ): number {
    const trueScore = predictionScores[trueClass] || 0;
    const scores = Object.values(predictionScores);
    const otherScores = Object.entries(predictionScores)
      .filter(([key]) => key !== trueClass)
      .map(([, value]) => value);
    switch (scoreType) {
      case 'hinge': {
        const maxOtherScore = Math.max(...otherScores, 0);
        return Math.max(0, 1 - (trueScore - maxOtherScore));
      }
      case 'margin': {
        const maxOtherScore = Math.max(...otherScores, 0);
        return Math.max(0, maxOtherScore - trueScore);
      }
      case 'inverse_probability':
      default:
        return Math.max(0, 1 - trueScore);
    }
  }
  /**
   * Classify property age based on construction year
   */
  classifyPropertyAge(constructionYear?: number): PropertyAgeCategory {
    if (!constructionYear) return 'unknown';
    if (constructionYear < 1900) return 'victorian';
    if (constructionYear >= 1900 && constructionYear < 1970) return 'post_war';
    return 'modern';
  }
  /**
   * Build Mondrian stratum identifier
   */
  buildStratumIdentifier(
    propertyAgeCategory: PropertyAgeCategory,
    damageType: string
  ): string {
    return `${propertyAgeCategory}_${damageType.toLowerCase().replace(/\s+/g, '_')}`;
  }
  /**
   * Calculate interval efficiency (smaller is better)
   */
  calculateIntervalEfficiency(interval: ConformalPredictionInterval): number {
    return interval.interval_size / 3; // Normalized by total classes
  }
  /**
   * Check if recalibration is needed
   */
  async isRecalibrationNeeded(calibrationSetId: string): Promise<boolean> {
    // @ts-expect-error TS2571 - Supabase chain returns unknown; we assert Promise shape for typed destructuring
    const { data, error } = await (getSupabase()
      .from('conformal_calibration_sets')
      .select('created_at, sample_count, valid_until')
      .eq('id', calibrationSetId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);
    if (error || !data) return true;
    const validUntil = data['valid_until'] as string | undefined;
    const createdAt = data['created_at'] as string | undefined;
    const sampleCount = (data['sample_count'] as number) ?? 0;
    if (validUntil && new Date(validUntil) < new Date()) return true;
    // @ts-expect-error TS2571 - Supabase chain returns unknown; we assert Promise shape for typed destructuring
    const { count } = await (getSupabase()
      .from('building_assessment_outcomes')
      .select('*', { count: 'exact', head: true })
      .gte('learned_at', createdAt ?? '') as unknown as Promise<{ count: number | null }>);
    return (count ?? 0) > sampleCount * 0.2;
  }
}
// ============================================================================
// Export singleton instance
// ============================================================================
export const conformalPrediction = ConformalPredictionService.getInstance();