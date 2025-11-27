/**
 * Safe-LUCB Policy Decision Module
 */

import { logger } from '@mintenance/shared';
import { CriticModule } from '../critic';
import { ContextFeatureService } from '../ContextFeatureService';
import type { AITestResult } from './ABTestTypes';
import { getSafetyThreshold, normalizePropertyType } from './ABTestUtils';
import { checkSeedSafeSet } from './ABTestDatabase';

export interface SafeLUCBParams {
  aiResult: AITestResult;
  deltaSafety?: number;
}

export async function runSafeLUCBPolicy(params: SafeLUCBParams): Promise<{
  decision: 'automate' | 'escalate';
  escalationReason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
}> {
  const { aiResult } = params;

  // 1. Check if context is in SEED SAFE SET
  const seedSafeSet = await checkSeedSafeSet(aiResult.contextFeatures);

  if (!seedSafeSet.isSafe) {
    return {
      decision: 'escalate',
      escalationReason: `Context not in verified safe set (requires ≥1k historical validations with SFN=0, found ${seedSafeSet.historicalCount})`,
      safetyUcb: 1.0,
      rewardUcb: 0.0,
      safetyThreshold: params.deltaSafety || 0.001,
      exploration: false,
    };
  }

  // 2. Construct context vector for critic (d_eff = 12)
  // Use ContextFeatureService to ensure consistency
  const contextVector = ContextFeatureService.constructContextVector({
    fusion_confidence: aiResult.fusionMean,
    fusion_variance: aiResult.fusionVariance,
    cp_set_size: aiResult.cpPredictionSet.length,
    safety_critical_candidate: aiResult.predictedSafetyCritical ? 1 : 0,
    lighting_quality: aiResult.contextFeatures.lighting_quality,
    image_clarity: aiResult.contextFeatures.image_clarity,
    property_age: aiResult.contextFeatures.property_age,
    property_age_bin: aiResult.contextFeatures.property_age_bin,
    num_damage_sites: aiResult.contextFeatures.num_damage_sites,
    detector_disagreement: aiResult.contextFeatures.detector_disagreement,
    ood_score: aiResult.contextFeatures.ood_score,
    region: aiResult.contextFeatures.region,
  });

  // 3. Adjust safety threshold for industrial contexts (stricter for rail/construction)
  // Extract property type from stratum (format: propertyType_ageBin_region_damageCategory)
  const stratumParts = aiResult.cpStratum.split('_');
  const propertyType = stratumParts.length > 0 ? normalizePropertyType(stratumParts[0]) : 'residential';
  const deltaSafety = params.deltaSafety || getSafetyThreshold(propertyType);

  // 4. Call Safe-LUCB critic with stratum and critical hazard info
  const criticDecision = await callSafeLUCBCritic({
    context: contextVector,
    delta_safety: deltaSafety,
    stratum: aiResult.cpStratum,
    criticalHazardDetected: aiResult.predictedSafetyCritical,
  });

  // 5. Safety gate: NEVER automate unless safety-UCB ≤ δ_t
  if (criticDecision.arm === 'automate' && 
      criticDecision.safetyUcb > criticDecision.safetyThreshold) {
    return {
      decision: 'escalate',
      escalationReason: `Safety UCB (${criticDecision.safetyUcb.toFixed(4)}) exceeds threshold (${criticDecision.safetyThreshold})`,
      safetyUcb: criticDecision.safetyUcb,
      rewardUcb: criticDecision.rewardUcb,
      safetyThreshold: criticDecision.safetyThreshold,
      exploration: criticDecision.exploration,
    };
  }

  return {
    decision: criticDecision.arm as 'automate' | 'escalate',
    escalationReason: criticDecision.arm === 'escalate' 
      ? criticDecision.reason 
      : undefined,
    safetyUcb: criticDecision.safetyUcb,
    rewardUcb: criticDecision.rewardUcb,
    safetyThreshold: criticDecision.safetyThreshold,
    exploration: criticDecision.exploration,
  };
}

async function callSafeLUCBCritic(params: {
  context: number[];
  delta_safety: number;
  stratum?: string;
  criticalHazardDetected?: boolean;
}): Promise<{
  arm: 'automate' | 'escalate';
  reason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
}> {
  // Call Safe-LUCB critic module
  const decision = await CriticModule.selectArm({
    context: params.context,
    delta_safety: params.delta_safety,
    arms: ['automate', 'escalate'],
    stratum: params.stratum,
    criticalHazardDetected: params.criticalHazardDetected,
  });

  // Record outcome if decision was made (async, non-blocking)
  if (params.stratum && decision.arm === 'automate') {
    CriticModule.recordOutcome(
      params.stratum,
      decision.arm,
      params.criticalHazardDetected || false
    ).catch((error) => {
      logger.error('Failed to record FNR outcome', {
        service: 'ABTestSafeLUCB',
        stratum: params.stratum,
        error,
      });
    });
  }

  return decision;
}

