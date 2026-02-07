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
import { getActiveDomain } from '../config/BuildingSurveyorConfig';

/**
 * Inference route options
 */
export type InferenceRoute = 'internal' | 'gpt4_vision' | 'hybrid';

/**
 * Default confidence thresholds (residential).
 * Use getConfidenceThresholds() for domain-aware values.
 */
export const CONFIDENCE_THRESHOLDS = {
    high: 0.75,
    medium: 0.55,
    low: 0.35,
} as const;

/**
 * Get confidence thresholds for the active domain.
 * Rail uses stricter thresholds; industrial is moderately strict.
 */
export function getConfidenceThresholds(): { high: number; medium: number; low: number } {
    const domain = getActiveDomain();
    return domain.confidenceThresholds;
}

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
