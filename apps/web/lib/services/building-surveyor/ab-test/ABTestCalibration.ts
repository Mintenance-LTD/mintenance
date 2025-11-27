/**
 * Calibration data management for A/B Testing
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import type { CalibrationDataPoint } from './ABTestTypes';
import type { AssessmentContext } from '../types';

export async function getCalibrationData(stratum: string): Promise<CalibrationDataPoint[]> {
  const { data } = await serverSupabase
    .from('ab_calibration_data')
    .select('true_class, true_probability, nonconformity_score, importance_weight, created_at')
    .eq('stratum', stratum)
    .order('created_at', { ascending: false })
    .limit(1000);

  return (data || []).map(d => ({
    trueClass: d.true_class,
    trueProbability: parseFloat(d.true_probability),
    nonconformityScore: parseFloat(d.nonconformity_score),
    importanceWeight: parseFloat(d.importance_weight || '1.0'),
  }));
}

export async function getDomainShiftWeight(context: AssessmentContext): Promise<number> {
  // Domain classifier approach (logistic density ratio)
  // For now, return conservative weight
  return 1.0;
}

