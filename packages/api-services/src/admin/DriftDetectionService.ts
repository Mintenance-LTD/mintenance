import { logger } from '@mintenance/shared';

/**
 * Drift Detection Service - Detect model and data drift
 */
// Temporary types
interface DriftMetrics {
  overall: {
    status: 'stable' | 'warning' | 'critical';
    score: number;
    lastChecked: string;
  };
  dataDrift: {
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    features: {
      name: string;
      driftScore: number;
      threshold: number;
      status: 'stable' | 'drifting';
      statistics: {
        baseline: { mean: number; std: number; min: number; max: number };
        current: { mean: number; std: number; min: number; max: number };
      };
    }[];
  };
  conceptDrift: {
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    performanceChange: number;
    accuracyTrend: number[];
    alertThreshold: number;
  };
  predictionDrift: {
    detected: boolean;
    distributionChange: number;
    classBalance: {
      baseline: Record<string, number>;
      current: Record<string, number>;
    };
  };
}
interface DriftAnalysis {
  modelId: string;
  timeRange: string;
  drift: DriftMetrics;
  recommendations: string[];
  historicalDrift: {
    timestamp: string;
    dataDrift: number;
    conceptDrift: number;
    predictionDrift: number;
  }[];
  affectedFeatures: {
    feature: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
  retrainingRequired: boolean;
  estimatedPerformanceImpact: number;
}
export class DriftDetectionService {
  private supabase: any;
  private driftThresholds = {
    data: { low: 0.1, medium: 0.3, high: 0.5 },
    concept: { low: 0.05, medium: 0.1, high: 0.15 },
    prediction: { low: 0.15, medium: 0.25, high: 0.4 }
  };
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Get current drift metrics
   */
  async getDriftMetrics(): Promise<DriftMetrics> {
    try {
      // Get latest drift calculations
      const { data: latestDrift } = await this.supabase
        .from('ml_drift_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!latestDrift) {
        return this.getDefaultDriftMetrics();
      }
      // Calculate data drift
      const dataDrift = await this.calculateDataDrift(latestDrift.model_id);
      // Calculate concept drift
      const conceptDrift = await this.calculateConceptDrift(latestDrift.model_id);
      // Calculate prediction drift
      const predictionDrift = await this.calculatePredictionDrift(latestDrift.model_id);
      // Determine overall status
      const overallScore = this.calculateOverallDriftScore(dataDrift, conceptDrift, predictionDrift);
      const overallStatus = this.determineOverallStatus(overallScore);
      return {
        overall: {
          status: overallStatus,
          score: overallScore,
          lastChecked: new Date().toISOString()
        },
        dataDrift,
        conceptDrift,
        predictionDrift
      };
    } catch (error) {
      logger.error('Error getting drift metrics:', error);
      return this.getDefaultDriftMetrics();
    }
  }
  /**
   * Analyze drift for a specific model and time range
   */
  async analyzeDrift(params: {
    modelId?: string;
    timeRange: string;
  }): Promise<DriftAnalysis> {
    try {
      // Get model ID (use production model if not specified)
      let modelId = params.modelId;
      if (!modelId) {
        const { data: prodModel } = await this.supabase
          .from('ml_models')
          .select('id')
          .eq('status', 'production')
          .single();
        modelId = prodModel?.id;
      }
      if (!modelId) {
        throw new Error('No model found for drift analysis');
      }
      // Get drift metrics
      const drift = await this.getDriftMetrics();
      // Get historical drift data
      const startDate = this.parseTimeRange(params.timeRange);
      const { data: history } = await this.supabase
        .from('ml_drift_history')
        .select('timestamp, data_drift, concept_drift, prediction_drift')
        .eq('model_id', modelId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
      // Identify affected features
      const affectedFeatures = drift.dataDrift.features
        .filter(f => f.status === 'drifting')
        .map(f => ({
          feature: f.name,
          impact: this.determineImpact(f.driftScore),
          recommendation: this.getFeatureRecommendation(f)
        }));
      // Generate recommendations
      const recommendations = this.generateRecommendations(drift, affectedFeatures);
      // Determine if retraining is required
      const retrainingRequired = this.shouldRetrain(drift);
      // Estimate performance impact
      const estimatedPerformanceImpact = this.estimatePerformanceImpact(drift);
      return {
        modelId,
        timeRange: params.timeRange,
        drift,
        recommendations,
        historicalDrift: history || [],
        affectedFeatures,
        retrainingRequired,
        estimatedPerformanceImpact
      };
    } catch (error) {
      logger.error('Error analyzing drift:', error);
      throw error;
    }
  }
  // ============= Private Helper Methods =============
  private async calculateDataDrift(modelId: string) {
    try {
      // Get feature distributions
      const { data: features } = await this.supabase
        .from('ml_feature_distributions')
        .select('*')
        .eq('model_id', modelId);
      if (!features || features.length === 0) {
        return {
          detected: false,
          severity: 'low' as const,
          features: []
        };
      }
      // Calculate drift for each feature
      const featureDrifts = features.map((f: any) => {
        const driftScore = this.calculateKLDivergence(
          f.baseline_distribution,
          f.current_distribution
        );
        return {
          name: f.feature_name,
          driftScore,
          threshold: this.driftThresholds.data.medium,
          status: driftScore > this.driftThresholds.data.medium ? 'drifting' as const : 'stable' as const,
          statistics: {
            baseline: f.baseline_stats || { mean: 0, std: 0, min: 0, max: 0 },
            current: f.current_stats || { mean: 0, std: 0, min: 0, max: 0 }
          }
        };
      });
      // Determine overall data drift
      const driftingFeatures = featureDrifts.filter((f: any) => f.status === 'drifting');
      const detected = driftingFeatures.length > 0;
      const avgDriftScore = featureDrifts.reduce((sum: number, f: any) => sum + f.driftScore, 0) / featureDrifts.length;
      const severity = avgDriftScore > this.driftThresholds.data.high ? 'high' :
                      avgDriftScore > this.driftThresholds.data.medium ? 'medium' : 'low';
      return {
        detected,
        severity: severity as 'low' | 'medium' | 'high',
        features: featureDrifts
      };
    } catch (error) {
      logger.error('Error calculating data drift:', error);
      return {
        detected: false,
        severity: 'low' as const,
        features: []
      };
    }
  }
  private async calculateConceptDrift(modelId: string) {
    try {
      // Get performance metrics over time
      const { data: metrics } = await this.supabase
        .from('ml_model_performance_history')
        .select('accuracy')
        .eq('model_id', modelId)
        .order('timestamp', { ascending: false })
        .limit(30);
      if (!metrics || metrics.length < 10) {
        return {
          detected: false,
          severity: 'low' as const,
          performanceChange: 0,
          accuracyTrend: [],
          alertThreshold: this.driftThresholds.concept.medium
        };
      }
      // Calculate performance change
      const recentAccuracy = metrics.slice(0, 10).reduce((sum: number, m: any) => sum + m.accuracy, 0) / 10;
      const baselineAccuracy = metrics.slice(-10).reduce((sum: number, m: any) => sum + m.accuracy, 0) / 10;
      const performanceChange = baselineAccuracy - recentAccuracy;
      const detected = performanceChange > this.driftThresholds.concept.medium;
      const severity = performanceChange > this.driftThresholds.concept.high ? 'high' :
                      performanceChange > this.driftThresholds.concept.medium ? 'medium' : 'low';
      return {
        detected,
        severity: severity as 'low' | 'medium' | 'high',
        performanceChange,
        accuracyTrend: metrics.map((m: any) => m.accuracy),
        alertThreshold: this.driftThresholds.concept.medium
      };
    } catch (error) {
      logger.error('Error calculating concept drift:', error);
      return {
        detected: false,
        severity: 'low' as const,
        performanceChange: 0,
        accuracyTrend: [],
        alertThreshold: this.driftThresholds.concept.medium
      };
    }
  }
  private async calculatePredictionDrift(modelId: string) {
    try {
      // Get prediction distributions
      const { data: baseline } = await this.supabase
        .from('ml_prediction_baseline')
        .select('class_distribution')
        .eq('model_id', modelId)
        .single();
      const { data: current } = await this.supabase
        .from('ml_prediction_current')
        .select('class_distribution')
        .eq('model_id', modelId)
        .single();
      if (!baseline || !current) {
        return {
          detected: false,
          distributionChange: 0,
          classBalance: {
            baseline: {},
            current: {}
          }
        };
      }
      // Calculate distribution change
      const distributionChange = this.calculateJSDivergence(
        baseline.class_distribution,
        current.class_distribution
      );
      const detected = distributionChange > this.driftThresholds.prediction.medium;
      return {
        detected,
        distributionChange,
        classBalance: {
          baseline: baseline.class_distribution,
          current: current.class_distribution
        }
      };
    } catch (error) {
      logger.error('Error calculating prediction drift:', error);
      return {
        detected: false,
        distributionChange: 0,
        classBalance: {
          baseline: {},
          current: {}
        }
      };
    }
  }
  private calculateKLDivergence(baseline: any, current: any): number {
    // Simplified KL divergence calculation
    if (!baseline || !current) return 0;
    let klDiv = 0;
    const epsilon = 1e-10;
    for (const key in baseline) {
      const p = baseline[key] || epsilon;
      const q = current[key] || epsilon;
      klDiv += p * Math.log(p / q);
    }
    return klDiv;
  }
  private calculateJSDivergence(baseline: any, current: any): number {
    // Jensen-Shannon divergence (symmetric version of KL divergence)
    if (!baseline || !current) return 0;
    const m: Record<string, unknown> = {};
    for (const key in baseline) {
      m[key] = (baseline[key] + (current[key] || 0)) / 2;
    }
    const klBaseline = this.calculateKLDivergence(baseline, m);
    const klCurrent = this.calculateKLDivergence(current, m);
    return (klBaseline + klCurrent) / 2;
  }
  private calculateOverallDriftScore(
    dataDrift: any,
    conceptDrift: any,
    predictionDrift: any
  ): number {
    // Weighted average of different drift types
    const weights = {
      data: 0.3,
      concept: 0.5,
      prediction: 0.2
    };
    const dataDriftScore = dataDrift.detected ?
      (dataDrift.severity === 'high' ? 1 : dataDrift.severity === 'medium' ? 0.5 : 0.2) : 0;
    const conceptDriftScore = conceptDrift.detected ?
      (conceptDrift.severity === 'high' ? 1 : conceptDrift.severity === 'medium' ? 0.5 : 0.2) : 0;
    const predictionDriftScore = predictionDrift.detected ? 0.5 : 0;
    return (
      dataDriftScore * weights.data +
      conceptDriftScore * weights.concept +
      predictionDriftScore * weights.prediction
    );
  }
  private determineOverallStatus(score: number): 'stable' | 'warning' | 'critical' {
    if (score > 0.7) return 'critical';
    if (score > 0.3) return 'warning';
    return 'stable';
  }
  private determineImpact(driftScore: number): 'low' | 'medium' | 'high' {
    if (driftScore > this.driftThresholds.data.high) return 'high';
    if (driftScore > this.driftThresholds.data.medium) return 'medium';
    return 'low';
  }
  private getFeatureRecommendation(feature: any): string {
    if (feature.driftScore > this.driftThresholds.data.high) {
      return `Critical drift detected. Consider removing or re-engineering feature "${feature.name}"`;
    }
    if (feature.driftScore > this.driftThresholds.data.medium) {
      return `Moderate drift detected. Monitor feature "${feature.name}" closely`;
    }
    return `Minor drift detected in feature "${feature.name}"`;
  }
  private generateRecommendations(drift: DriftMetrics, affectedFeatures: any[]): string[] {
    const recommendations: string[] = [];
    if (drift.conceptDrift.detected) {
      if (drift.conceptDrift.severity === 'high') {
        recommendations.push('Immediate model retraining recommended due to significant concept drift');
      } else {
        recommendations.push('Schedule model retraining within the next week');
      }
    }
    if (drift.dataDrift.detected) {
      if (drift.dataDrift.severity === 'high') {
        recommendations.push('Review data pipeline for potential issues or changes');
        recommendations.push('Consider updating feature engineering pipeline');
      } else {
        recommendations.push('Monitor data distribution changes closely');
      }
    }
    if (drift.predictionDrift.detected) {
      recommendations.push('Review model calibration and adjust decision thresholds if needed');
    }
    if (affectedFeatures.length > 5) {
      recommendations.push(`${affectedFeatures.length} features showing drift - comprehensive feature review recommended`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Model performance stable - continue monitoring');
    }
    return recommendations;
  }
  private shouldRetrain(drift: DriftMetrics): boolean {
    return (
      drift.conceptDrift.severity === 'high' ||
      drift.dataDrift.severity === 'high' ||
      (drift.conceptDrift.detected && drift.dataDrift.detected)
    );
  }
  private estimatePerformanceImpact(drift: DriftMetrics): number {
    // Estimate performance degradation based on drift
    let impact = 0;
    if (drift.conceptDrift.detected) {
      impact += drift.conceptDrift.performanceChange;
    }
    if (drift.dataDrift.detected) {
      const avgFeatureDrift = drift.dataDrift.features.reduce((sum, f) => sum + f.driftScore, 0) /
                              (drift.dataDrift.features.length || 1);
      impact += avgFeatureDrift * 0.1; // Estimate 10% impact per unit of drift
    }
    if (drift.predictionDrift.detected) {
      impact += drift.predictionDrift.distributionChange * 0.05;
    }
    return Math.min(impact, 1); // Cap at 100% impact
  }
  private parseTimeRange(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/(\d+)([dhm])/);
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - num * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - num * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  private getDefaultDriftMetrics(): DriftMetrics {
    return {
      overall: {
        status: 'stable',
        score: 0,
        lastChecked: new Date().toISOString()
      },
      dataDrift: {
        detected: false,
        severity: 'low',
        features: []
      },
      conceptDrift: {
        detected: false,
        severity: 'low',
        performanceChange: 0,
        accuracyTrend: [],
        alertThreshold: 0.1
      },
      predictionDrift: {
        detected: false,
        distributionChange: 0,
        classBalance: {
          baseline: {},
          current: {}
        }
      }
    };
  }
}