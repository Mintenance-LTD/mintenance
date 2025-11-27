/**
 * Hierarchical Mondrian Conformal Prediction with SSBC
 * Enhanced with industrial scaling (rail, construction)
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContextFeatureService } from '../ContextFeatureService';
import type { AssessmentContext } from '../types';
import type { CalibrationDataPoint } from './ABTestTypes';
import { betaQuantile, weightedQuantile } from './ABTestMathUtils';
import { normalizePropertyType, normalizeDamageCategory } from './ABTestUtils';

interface ConformalPredictionParams {
  fusionMean: number;
  fusionVariance: number;
  context: {
    propertyType: string;
    propertyAge: number;
    region: string;
    damageCategory: string;
  };
  getCalibrationData: (stratum: string) => Promise<CalibrationDataPoint[]>;
  getDomainShiftWeight: (context: AssessmentContext) => Promise<number>;
}

export async function mondrianConformalPrediction(
  params: ConformalPredictionParams
): Promise<{
  stratum: string;
  quantile: number;
  predictionSet: string[];
}> {
  const { fusionMean, context, getCalibrationData, getDomainShiftWeight } = params;

  // 1. Determine Mondrian stratum with enhanced stratification
  // Includes: property_type, age_bin, region, damage_category
  // Supports: residential, commercial, rail, construction
  const ageBin = ContextFeatureService.getPropertyAgeBin(context.propertyAge);
  const damageCategory = normalizeDamageCategory(context.damageCategory);
  
  // Normalize property type (handle industrial types)
  const normalizedPropertyType = normalizePropertyType(context.propertyType);
  
  // Start with most specific stratum (4 dimensions)
  let stratum = `${normalizedPropertyType}_${ageBin}_${context.region}_${damageCategory}`;

  // 2. Hierarchical fallback: leaf → parent → grandparent → global
  let calibrationData = await getCalibrationData(stratum);

  if (!calibrationData || calibrationData.length < 50) {
    // Back off to parent (drop damage category)
    stratum = `${context.propertyType}_${ageBin}_${context.region}`;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    // Back off to grandparent (drop region)
    stratum = `${context.propertyType}_${ageBin}`;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    // Back off to great-grandparent (drop age bin)
    stratum = `${context.propertyType}`;
    calibrationData = await getCalibrationData(stratum);
  }

  if (!calibrationData || calibrationData.length < 50) {
    // Global fallback (weighted by importance)
    stratum = 'global';
    calibrationData = await getCalibrationData(stratum);
  }

  const n_cal = calibrationData.length;

  // 3. Small Sample Beta Correction (SSBC)
  const alpha = 0.10; // Target 90% coverage
  let alpha_prime = alpha;

  if (n_cal < 100) {
    // SSBC: α' = BetaInv(1-α; n+1, 1)
    alpha_prime = betaQuantile(1 - alpha, n_cal + 1, 1);
  }

  // 4. Importance weighting for distribution shift
  // Cast propertyType to match AssessmentContext type
  const assessmentContext: AssessmentContext = {
    ...context,
    propertyType: context.propertyType as 'residential' | 'commercial' | 'industrial' | undefined,
  };
  const domainShiftWeight = await getDomainShiftWeight(assessmentContext);

  // 5. Compute conformal quantile (with weighting)
  const nonconformityScores = calibrationData.map(cal => 
    1 - cal.trueProbability
  );

  const quantile = weightedQuantile(
    nonconformityScores,
    calibrationData.map(() => domainShiftWeight),
    1 - alpha_prime
  );

  // 6. Construct prediction set
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
    const score = 1 - fusionMean; // Simplified nonconformity
    return score <= quantile;
  });

  // Ensure at least true class is in set (safety)
  if (predictionSet.length === 0) {
    predictionSet.push(context.damageCategory);
  }

  return {
    stratum,
    quantile,
    predictionSet,
  };
}

