/**
 * Conformal Prediction Service for Building Surveyor
 * Implements Mondrian Conformal Prediction with hierarchical stratification
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ContextFeatureService } from './ContextFeatureService';
import { normalizeDamageCategory, normalizePropertyType } from './normalization-utils';

export interface ConformalPredictionResult {
  stratum: string;
  quantile: number;
  predictionSet: string[];
}

export interface CalibrationDataPoint {
  trueClass: string;
  trueProbability: number;
  nonconformityScore: number;
  importanceWeight: number;
}

/**
 * Mondrian Conformal Prediction with hierarchical stratification
 */
export async function mondrianConformalPrediction(
  fusionMean: number,
  fusionVariance: number,
  context: {
    propertyType: string;
    propertyAge: number;
    region: string;
    damageCategory: string;
  }
): Promise<ConformalPredictionResult> {
  const ageBin = ContextFeatureService.getPropertyAgeBin(context.propertyAge);
  const normalizedDamageCategory = normalizeDamageCategory(context.damageCategory);
  const normalizedPropertyType = normalizePropertyType(context.propertyType);

  // Start with most specific stratum (4 dimensions)
  let stratum = `${normalizedPropertyType}_${ageBin}_${context.region}_${normalizedDamageCategory}`;

  // Hierarchical fallback: leaf → parent → grandparent → global
  let calibrationData = await getCalibrationData(stratum);

  if (!calibrationData || calibrationData.length < 50) {
    stratum = `${normalizedPropertyType}_${ageBin}_${context.region}`;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    stratum = `${normalizedPropertyType}_${ageBin}`;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    stratum = normalizedPropertyType;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    stratum = 'global';
    calibrationData = await getCalibrationData(stratum);
  }

  const n_cal = calibrationData.length;

  // Small Sample Beta Correction (SSBC)
  const alpha = 0.10; // Target 90% coverage
  let alpha_prime = alpha;

  if (n_cal < 100) {
    alpha_prime = betaQuantile(1 - alpha, n_cal + 1, 1);
  }

  // Compute conformal quantile
  const nonconformityScores = calibrationData.map(cal => 1 - cal.trueProbability);
  const quantile = weightedQuantile(
    nonconformityScores,
    calibrationData.map(() => 1.0), // Default weight
    1 - alpha_prime
  );

  // Construct prediction set
  const allClasses = [
    'cosmetic',
    'water_damage',
    'structural_minor',
    'structural_major',
    'electrical',
    'mold',
    'pest',
  ];

  const predictionSet = allClasses.filter(cls => {
    const score = 1 - fusionMean;
    return score <= quantile;
  });

  // Ensure at least true class is in set (safety)
  if (predictionSet.length === 0) {
    predictionSet.push(normalizedDamageCategory);
  }

  return {
    stratum,
    quantile,
    predictionSet,
  };
}

/**
 * Get calibration data for a stratum
 */
export async function getCalibrationData(stratum: string): Promise<CalibrationDataPoint[]> {
  try {
    const { data } = await serverSupabase
      .from('ab_calibration_data')
      .select('*')
      .eq('stratum', stratum)
      .order('created_at', { ascending: false })
      .limit(1000);

    return (data || []).map(d => ({
      trueClass: d.true_class,
      trueProbability: parseFloat(d.true_probability),
      nonconformityScore: parseFloat(d.nonconformity_score),
      importanceWeight: parseFloat(d.importance_weight || '1.0'),
    }));
  } catch (error) {
    logger.warn('Failed to get calibration data', {
      service: 'conformal-prediction',
      stratum,
      error,
    });
    return [];
  }
}

/**
 * Compute weighted quantile
 */
export function weightedQuantile(
  scores: number[],
  weights: number[],
  percentile: number
): number {
  if (scores.length === 0) return 0.5;

  const sorted = scores
    .map((score, i) => ({ score, weight: weights[i] || 1.0 }))
    .sort((a, b) => a.score - b.score);

  const totalWeight = weights.reduce((a, b) => a + (b || 1.0), 0);
  if (totalWeight === 0) return sorted[sorted.length - 1]?.score || 0.5;

  let cumWeight = 0;
  for (const item of sorted) {
    cumWeight += item.weight;
    if (cumWeight / totalWeight >= percentile) {
      return item.score;
    }
  }

  return sorted[sorted.length - 1]?.score || 0.5;
}

/**
 * Beta quantile for Small Sample Beta Correction (SSBC)
 * Special case: Beta(n+1, 1) has closed form: p^(1/(n+1))
 */
export function betaQuantile(p: number, a: number, b: number): number {
  if (b === 1) {
    return Math.pow(p, 1 / a);
  }
  if (a === 1) {
    return 1 - Math.pow(1 - p, 1 / b);
  }
  // For general case, use simplified approximation
  // In production, could use full Newton-Raphson from ab_test_harness
  return Math.pow(p, 1 / (a + b));
}

