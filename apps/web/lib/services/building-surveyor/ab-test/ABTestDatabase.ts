/**
 * Database operations for A/B Testing
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { hashString } from '@mintenance/shared';
import type { AITestResult, SafeLUCBResult } from './ABTestTypes';
import { wilsonScoreUpper } from './ABTestMathUtils';
import { DELTA_SAFETY } from './ABTestConfig';

export interface Assignment {
  id: string;
  armId: string;
  armName: string;
}

export async function getOrCreateAssignment(
  experimentId: string,
  userId: string
): Promise<Assignment> {
  // Check existing assignment
  const { data: existing } = await serverSupabase
    .from('ab_assignments')
    .select('id, arm_id, ab_arms!inner(name)')
    .eq('experiment_id', experimentId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Supabase join returns array, but we're selecting single row so take first element
    const abArms = Array.isArray(existing.ab_arms) 
      ? (existing.ab_arms[0] as { name: string } | undefined)
      : (existing.ab_arms as { name: string } | undefined);
    return {
      id: existing.id,
      armId: existing.arm_id,
      armName: abArms?.name || 'unknown',
    };
  }

  // Create new assignment (deterministic hashing)
  const { data: arms } = await serverSupabase
    .from('ab_arms')
    .select('id, name')
    .eq('experiment_id', experimentId);

  if (!arms || arms.length < 2) {
    throw new Error('Experiment must have control and treatment arms');
  }

  const assignmentHash = hashString(`${userId}_${experimentId}`);
  const armIndex = assignmentHash % 2;
  const selectedArm = arms[armIndex];

  const { data: assignment, error } = await serverSupabase
    .from('ab_assignments')
    .insert({
      experiment_id: experimentId,
      user_id: userId,
      arm_id: selectedArm.id,
      assignment_hash: assignmentHash.toString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: assignment.id,
    armId: selectedArm.id,
    armName: selectedArm.name,
  };
}

export async function logDecision(params: {
  experimentId: string;
  assignmentId: string;
  assessmentId: string;
  armId: string;
  decision: 'automate' | 'escalate';
  escalationReason?: string;
  aiResult: AITestResult;
  lucbResult?: SafeLUCBResult;
  deltaSafety?: number;
}): Promise<void> {
  await serverSupabase.from('ab_decisions').insert({
    experiment_id: params.experimentId,
    assignment_id: params.assignmentId,
    assessment_id: params.assessmentId,
    arm_id: params.armId,
    decision: params.decision,
    escalation_reason: params.escalationReason,
    fusion_mean: params.aiResult.fusionMean,
    fusion_variance: params.aiResult.fusionVariance,
    cp_stratum: params.aiResult.cpStratum,
    cp_quantile: params.aiResult.cpQuantile,
    cp_prediction_set: params.aiResult.cpPredictionSet,
    safety_ucb: params.lucbResult?.safetyUcb || 0,
    reward_ucb: params.lucbResult?.rewardUcb || 0,
    safety_threshold: params.lucbResult?.safetyThreshold || params.deltaSafety || DELTA_SAFETY,
    exploration: params.lucbResult?.exploration || false,
    context_features: params.aiResult.contextFeatures,
    detector_outputs: params.aiResult.detectorOutputs,
    decision_time_ms: Date.now(),
  });
}

export async function checkSeedSafeSet(context: Record<string, unknown>): Promise<{
  isSafe: boolean;
  historicalCount: number;
  historicalSfnRate: number;
  wilsonUpper: number;
}> {
  // Extract property type from context (may need to be inferred from other fields)
  // For now, assume it's stored in context or use a default
  const propertyType = (context.property_type as string) || 'residential';
  const propertyAgeBin = (context.property_age_bin as string) || '50-100';
  const region = (context.region as string) || 'unknown';

  const { data } = await serverSupabase
    .from('ab_historical_validations')
    .select('id, property_type, property_age_bin, region, sfn, validated_at')
    .eq('property_type', propertyType)
    .eq('property_age_bin', propertyAgeBin)
    .eq('region', region)
    .gte('validated_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (!data || data.length < 1000) {
    return {
      isSafe: false,
      historicalCount: data?.length || 0,
      historicalSfnRate: 1.0,
      wilsonUpper: 1.0,
    };
  }

  const sfnCount = data.filter(v => v.sfn === true).length;
  const sfnRate = sfnCount / data.length;

  // Wilson score upper bound
  const wilsonUpper = wilsonScoreUpper(sfnCount, data.length, 0.95);

  const isSafe = sfnCount === 0 && wilsonUpper <= 0.005; // ≤0.5%

  return {
    isSafe,
    historicalCount: data.length,
    historicalSfnRate: sfnRate,
    wilsonUpper,
  };
}

