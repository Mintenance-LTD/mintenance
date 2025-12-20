/**
 * Type definitions for A/B Testing Harness
 */

import type { ContextFeatures } from '../ContextFeatureService';
import type { DetectorOutput } from '../DetectorFusionService';
import type { SafetyHazard } from '../types';

export interface AITestResult {
  contextFeatures: ContextFeatures;
  detectorOutputs: {
    yolo: DetectorOutput;
    maskrcnn: DetectorOutput;
    sam: DetectorOutput;
  };
  fusionMean: number;
  fusionVariance: number;
  cpStratum: string;
  cpQuantile: number;
  cpPredictionSet: string[];
  safeLucbRewardUcb: number;
  safeLucbSafetyUcb: number;
  safeLucbSafetyThreshold: number;
  safeLucbExploration: boolean;
  predictedDamageType: string;
  predictedSeverity: string;
  predictedSafetyCritical: boolean;
  predictedHazards: SafetyHazard[];
}

export interface SafeLUCBResult {
  decision: 'automate' | 'escalate';
  escalationReason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
}

export interface CalibrationDataPoint {
  trueClass: string;
  trueProbability: number;
  nonconformityScore: number;
  importanceWeight: number;
}

