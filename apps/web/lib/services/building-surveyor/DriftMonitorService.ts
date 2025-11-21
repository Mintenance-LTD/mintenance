/**
 * Drift Monitor Service
 * 
 * Monitors distribution drift (e.g., seasonality, materials) and adjusts
 * Bayesian fusion weights accordingly.
 * 
 * Based on paper methodology:
 * - Detects covariate shift (seasonality, new materials)
 * - Adjusts weights for Bayesian fusion
 * - Updates correlation matrix Σ based on drift patterns
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DetectorFusionService } from './DetectorFusionService';

/**
 * Drift detection result
 */
export interface DriftDetectionResult {
  hasDrift: boolean;
  driftType: 'seasonal' | 'material' | 'temporal' | 'none';
  driftScore: number; // 0-1, higher = more drift
  affectedFeatures: string[];
  recommendedWeightAdjustments: {
    yolo: number;
    maskrcnn: number;
    sam: number;
  };
  recommendedCorrelationAdjustments?: number[][];
}

/**
 * Temporal window for drift detection
 */
interface DriftWindow {
  startDate: string;
  endDate: string;
  sampleCount: number;
}

/**
 * Drift Monitor Service
 * 
 * Monitors distribution changes and adjusts fusion weights dynamically.
 */
export class DriftMonitorService {
  private static readonly WINDOW_SIZE_DAYS = 30; // 30-day sliding window
  private static readonly MIN_SAMPLES = 50; // Minimum samples for drift detection
  private static readonly DRIFT_THRESHOLD = 0.2; // Threshold for significant drift

  /**
   * Detect distribution drift and recommend weight adjustments
   * 
   * @param context - Assessment context (property type, region, season)
   * @param recentAssessments - Recent assessment data for comparison
   * @returns Drift detection result with weight adjustments
   */
  static async detectDrift(params: {
    propertyType?: string;
    region?: string;
    season?: string; // 'spring', 'summer', 'fall', 'winter'
    materialTypes?: string[]; // Detected material types
  }): Promise<DriftDetectionResult> {
    try {
      // 1. Get historical distribution for comparison
      const historicalWindow = await this.getHistoricalWindow(params);

      // 2. Get recent distribution
      const recentWindow = await this.getRecentWindow(params);

      // 3. Compare distributions
      const driftScore = this.compareDistributions(historicalWindow, recentWindow);

      // 4. Determine drift type
      const driftType = this.determineDriftType(params, driftScore);

      // 5. Calculate weight adjustments if drift detected
      const hasDrift = driftScore > this.DRIFT_THRESHOLD;
      const recommendedWeightAdjustments = hasDrift
        ? this.calculateWeightAdjustments(driftType, driftScore, params)
        : {
            yolo: 0,
            maskrcnn: 0,
            sam: 0,
          };

      logger.debug('Drift detection completed', {
        service: 'DriftMonitorService',
        hasDrift,
        driftType,
        driftScore,
        adjustments: recommendedWeightAdjustments,
      });

      return {
        hasDrift,
        driftType,
        driftScore,
        affectedFeatures: this.getAffectedFeatures(driftType),
        recommendedWeightAdjustments,
      };
    } catch (error) {
      logger.error('Failed to detect drift, returning no drift', {
        service: 'DriftMonitorService',
        error,
      });

      // Return no drift on error (conservative)
      return {
        hasDrift: false,
        driftType: 'none',
        driftScore: 0,
        affectedFeatures: [],
        recommendedWeightAdjustments: {
          yolo: 0,
          maskrcnn: 0,
          sam: 0,
        },
      };
    }
  }

  /**
   * Apply weight adjustments to Bayesian fusion
   * 
   * @param adjustments - Recommended weight adjustments
   * @returns Updated weights (additive adjustments)
   */
  static applyWeightAdjustments(adjustments: {
    yolo: number;
    maskrcnn: number;
    sam: number;
  }): {
    yolo: number;
    maskrcnn: number;
    sam: number;
  } {
    const currentWeights = DetectorFusionService.getDetectorWeights();

    // Apply additive adjustments (clamped to [0, 1])
    const newWeights = {
      yolo: Math.max(0, Math.min(1, currentWeights.yolo + adjustments.yolo)),
      maskrcnn: Math.max(0, Math.min(1, currentWeights.maskrcnn + adjustments.maskrcnn)),
      sam: Math.max(0, Math.min(1, currentWeights.sam + adjustments.sam)),
    };

    // Normalize to sum to 1.0
    const total = newWeights.yolo + newWeights.maskrcnn + newWeights.sam;
    if (total > 0) {
      newWeights.yolo = newWeights.yolo / total;
      newWeights.maskrcnn = newWeights.maskrcnn / total;
      newWeights.sam = newWeights.sam / total;
    }

    return newWeights;
  }

  /**
   * Get historical distribution window
   */
  private static async getHistoricalWindow(params: {
    propertyType?: string;
    region?: string;
  }): Promise<DriftWindow> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - this.WINDOW_SIZE_DAYS * 2); // 60 days ago
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - this.WINDOW_SIZE_DAYS * 2); // 60-120 days ago

    try {
      let query = serverSupabase
        .from('building_assessments')
        .select('id, created_at, assessment_data', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

      // Filter by property type if provided
      if (params.propertyType) {
        query = query.eq('property_type', params.propertyType);
      }

      const { data, count } = await query;

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sampleCount: count || 0,
      };
    } catch (error) {
      logger.warn('Failed to get historical window, using defaults', {
        service: 'DriftMonitorService',
        error,
      });

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sampleCount: 0,
      };
    }
  }

  /**
   * Get recent distribution window
   */
  private static async getRecentWindow(params: {
    propertyType?: string;
    region?: string;
  }): Promise<DriftWindow> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - this.WINDOW_SIZE_DAYS);

    try {
      let query = serverSupabase
        .from('building_assessments')
        .select('id, created_at, assessment_data', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Filter by property type if provided
      if (params.propertyType) {
        query = query.eq('property_type', params.propertyType);
      }

      const { data, count } = await query;

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sampleCount: count || 0,
      };
    } catch (error) {
      logger.warn('Failed to get recent window, using defaults', {
        service: 'DriftMonitorService',
        error,
      });

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sampleCount: 0,
      };
    }
  }

  /**
   * Compare historical and recent distributions
   */
  private static compareDistributions(
    historical: DriftWindow,
    recent: DriftWindow
  ): number {
    // Simple drift score based on sample count changes
    // More sophisticated methods could use KL divergence, Wasserstein distance, etc.

    if (historical.sampleCount === 0 || recent.sampleCount === 0) {
      return 0; // Insufficient data
    }

    // Calculate relative change in sample rate
    const historicalRate = historical.sampleCount / this.WINDOW_SIZE_DAYS;
    const recentRate = recent.sampleCount / this.WINDOW_SIZE_DAYS;

    if (historicalRate === 0) {
      return recentRate > 0 ? 0.5 : 0;
    }

    const relativeChange = Math.abs(recentRate - historicalRate) / historicalRate;
    return Math.min(1, relativeChange);
  }

  /**
   * Determine drift type based on context and score
   */
  private static determineDriftType(
    params: {
      season?: string;
      materialTypes?: string[];
    },
    driftScore: number
  ): 'seasonal' | 'material' | 'temporal' | 'none' {
    if (driftScore < this.DRIFT_THRESHOLD) {
      return 'none';
    }

    // Seasonal drift
    if (params.season) {
      const month = new Date().getMonth();
      const currentSeason = this.getSeason(month);
      if (currentSeason !== params.season) {
        return 'seasonal';
      }
    }

    // Material drift (new material types detected)
    if (params.materialTypes && params.materialTypes.length > 0) {
      // Check for uncommon materials
      const uncommonMaterials = ['asbestos', 'lead', 'uranium'];
      if (params.materialTypes.some((m) => uncommonMaterials.includes(m.toLowerCase()))) {
        return 'material';
      }
    }

    // Default to temporal drift
    return 'temporal';
  }

  /**
   * Calculate weight adjustments based on drift type
   */
  private static calculateWeightAdjustments(
    driftType: 'seasonal' | 'material' | 'temporal' | 'none',
    driftScore: number,
    params: {
      season?: string;
      materialTypes?: string[];
    }
  ): {
    yolo: number;
    maskrcnn: number;
    sam: number;
  } {
    // Adjustment strategy:
    // - Seasonal drift: Adjust based on visibility (e.g., more moisture in winter)
    // - Material drift: Adjust based on detector reliability for new materials
    // - Temporal drift: General rebalancing

    const adjustmentMagnitude = driftScore * 0.1; // Scale adjustments

    switch (driftType) {
      case 'seasonal':
        // In winter/fall, moisture/stain detectors may be more reliable
        // In spring/summer, structural crack detection may be more reliable
        const season = params.season || this.getSeason(new Date().getMonth());
        if (season === 'winter' || season === 'fall') {
          return {
            yolo: -adjustmentMagnitude * 0.5, // Slightly reduce YOLO
            maskrcnn: adjustmentMagnitude, // Increase Mask R-CNN (better for stains/moisture)
            sam: adjustmentMagnitude * 0.3, // Slightly increase SAM
          };
        } else {
          return {
            yolo: adjustmentMagnitude * 0.3, // Slightly increase YOLO (better for structural)
            maskrcnn: -adjustmentMagnitude * 0.5,
            sam: adjustmentMagnitude * 0.2,
          };
        }

      case 'material':
        // For new/rare materials, increase reliance on SAM (more generalizable)
        return {
          yolo: -adjustmentMagnitude * 0.3,
          maskrcnn: -adjustmentMagnitude * 0.2,
          sam: adjustmentMagnitude * 0.5, // Increase SAM
        };

      case 'temporal':
        // General rebalancing (conservative)
        return {
          yolo: adjustmentMagnitude * 0.1,
          maskrcnn: -adjustmentMagnitude * 0.1,
          sam: 0,
        };

      case 'none':
      default:
        return {
          yolo: 0,
          maskrcnn: 0,
          sam: 0,
        };
    }
  }

  /**
   * Get affected features for drift type
   */
  private static getAffectedFeatures(
    driftType: 'seasonal' | 'material' | 'temporal' | 'none'
  ): string[] {
    switch (driftType) {
      case 'seasonal':
        return ['moisture', 'stain', 'crack'];
      case 'material':
        return ['detector_weights', 'correlation_matrix'];
      case 'temporal':
        return ['detector_weights'];
      case 'none':
      default:
        return [];
    }
  }

  /**
   * Get current season from month
   */
  private static getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
}

