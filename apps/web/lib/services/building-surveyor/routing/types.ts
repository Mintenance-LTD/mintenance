/**
 * Hybrid Inference - Types and Constants
 *
 * Shared types used across routing, execution, and analytics modules.
 */

import type {
    DamageSeverity,
    UrgencyLevel,
    Phase1BuildingAssessment,
} from '../types';

/**
 * Inference route options
 */
export type InferenceRoute = 'internal' | 'gpt4_vision' | 'hybrid';

/**
 * Confidence thresholds for routing decisions
 * Optimized for cost reduction while maintaining quality
 * Lower thresholds = more internal model usage = lower costs
 */
export const CONFIDENCE_THRESHOLDS = {
    high: 0.75,      // Use internal model confidently (was 0.85)
    medium: 0.55,    // Use internal but verify with GPT-4 (was 0.70)
    low: 0.35,       // Use GPT-4 as primary (was 0.50)
} as const;

/**
 * Result from hybrid inference assessment
 */
export interface HybridInferenceResult {
    assessment: Phase1BuildingAssessment;
    route: InferenceRoute;
    confidence: number;
    reasoning: string;
    internalPrediction?: InternalPrediction;
    gpt4Prediction?: Phase1BuildingAssessment;
    agreementScore?: number; // If hybrid, how much internal and GPT-4 agree (0-100)
    inferenceTimeMs: number;
    routingDecisionId?: string;
}

/**
 * Internal model prediction
 */
export interface InternalPrediction {
    damageType: string;
    severity: DamageSeverity;
    confidence: number;
    safetyHazards: unknown[];
    urgency: UrgencyLevel;
    features: number[];
}

/**
 * Route selection decision
 */
export interface RouteDecision {
    route: InferenceRoute;
    confidence: number;
    useInternalFirst: boolean;
    reasoning: string;
}
