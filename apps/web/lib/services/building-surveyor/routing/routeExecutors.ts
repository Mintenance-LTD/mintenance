/**
 * Hybrid Inference - Route Executors
 *
 * Handles execution of internal, GPT-4, and hybrid inference routes,
 * plus conversion helpers for mapping internal predictions to assessments.
 */

import { logger } from '@mintenance/shared';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import { AssessmentOrchestrator } from '../orchestration/AssessmentOrchestrator';
import { FeatureExtractionService } from '../orchestration/FeatureExtractionService';
import { getActiveDomain } from '../config/BuildingSurveyorConfig';
import type {
    AssessmentContext,
    Phase1BuildingAssessment,
    DamageSeverity,
    UrgencyLevel,
} from '../types';
import type {
    HybridInferenceResult,
    InternalPrediction,
    RouteDecision,
} from './types';

/**
 * Execute internal-only route
 */
export async function executeInternalRoute(
    imageUrls: string[],
    features: number[],
    context: AssessmentContext | undefined,
    routeDecision: RouteDecision
): Promise<HybridInferenceResult> {
    const prediction = imageUrls.length > 0
        ? await InternalDamageClassifier.predictFromImage(imageUrls[0])
        : await InternalDamageClassifier.predict(features);

    const assessment = convertInternalPredictionToAssessment(
        prediction,
        imageUrls,
        context
    );

    return {
        assessment,
        route: 'internal',
        confidence: prediction.confidence,
        reasoning: routeDecision.reasoning,
        internalPrediction: prediction,
        inferenceTimeMs: 0,
    };
}

/**
 * Execute GPT-4 Vision only route
 */
export async function executeGPT4Route(
    imageUrls: string[],
    context: AssessmentContext | undefined,
    routeDecision: RouteDecision
): Promise<HybridInferenceResult> {
    const assessment = await AssessmentOrchestrator.assessDamage(imageUrls, context);

    return {
        assessment,
        route: 'gpt4_vision',
        confidence: assessment.damageAssessment.confidence,
        reasoning: routeDecision.reasoning,
        gpt4Prediction: assessment,
        inferenceTimeMs: 0,
    };
}

/**
 * Execute hybrid route (internal + GPT-4 for comparison)
 */
export async function executeHybridRoute(
    imageUrls: string[],
    features: number[],
    context: AssessmentContext | undefined,
    routeDecision: RouteDecision
): Promise<HybridInferenceResult> {
    const [internalResult, gpt4Assessment] = await Promise.all([
        imageUrls.length > 0
            ? InternalDamageClassifier.predictFromImage(imageUrls[0])
            : InternalDamageClassifier.predict(features),
        AssessmentOrchestrator.assessDamage(imageUrls, context),
    ]);

    const agreementScore = calculateAgreementScore(internalResult, gpt4Assessment);
    const domain = getActiveDomain();
    const useInternal = agreementScore >= domain.agreementThreshold;
    const finalAssessment = useInternal
        ? convertInternalPredictionToAssessment(internalResult, imageUrls, context)
        : gpt4Assessment;

    // When GPT-4 is used as ground truth (agreement below domain threshold),
    // feed the surprise signal to the learned feature extractor.
    if (!useInternal && internalResult.features?.length > 0) {
        FeatureExtractionService.learnFromAssessmentFeedback(
            internalResult.features,
            gpt4Assessment
        ).catch(err => {
            logger.warn('Feature extractor feedback failed (non-blocking)', {
                service: 'routeExecutors',
                error: err instanceof Error ? err.message : 'unknown',
            });
        });
    }

    return {
        assessment: finalAssessment,
        route: 'hybrid',
        confidence: routeDecision.confidence,
        reasoning: `${routeDecision.reasoning}. Agreement: ${(agreementScore * 100).toFixed(1)}%. Using ${useInternal ? 'internal' : 'GPT-4'} prediction.`,
        internalPrediction: internalResult,
        gpt4Prediction: gpt4Assessment,
        agreementScore: agreementScore * 100,
        inferenceTimeMs: 0,
    };
}

/**
 * Calculate agreement between internal and GPT-4 predictions
 */
export function calculateAgreementScore(
    internal: InternalPrediction,
    gpt4: Phase1BuildingAssessment
): number {
    let score = 0;

    if (internal.damageType.toLowerCase() === gpt4.damageAssessment.damageType.toLowerCase()) {
        score += 0.40;
    }
    if (internal.severity === gpt4.damageAssessment.severity) {
        score += 0.30;
    }
    if (internal.urgency === gpt4.urgency.urgency) {
        score += 0.30;
    }

    return score;
}

/**
 * Convert internal prediction to Phase1BuildingAssessment format
 */
export function convertInternalPredictionToAssessment(
    prediction: InternalPrediction,
    imageUrls: string[],
    context?: AssessmentContext
): Phase1BuildingAssessment {
    return {
        damageAssessment: {
            damageType: prediction.damageType,
            severity: prediction.severity,
            confidence: prediction.confidence,
            location: context?.location || 'Unknown',
            description: `Predicted damage: ${prediction.damageType} (${prediction.severity} severity)`,
            detectedItems: [],
        },
        safetyHazards: {
            hazards: prediction.safetyHazards as unknown[],
            hasCriticalHazards: prediction.urgency === 'immediate',
            overallSafetyScore: calculateSafetyScore(prediction.urgency),
        },
        compliance: {
            complianceIssues: [],
            requiresProfessionalInspection: prediction.severity === 'full',
            complianceScore: 100,
        },
        insuranceRisk: {
            riskFactors: [],
            riskScore: calculateRiskScore(prediction.severity),
            premiumImpact: calculatePremiumImpact(prediction.severity),
            mitigationSuggestions: [],
        },
        urgency: {
            urgency: prediction.urgency,
            recommendedActionTimeline: getDefaultTimeline(prediction.urgency),
            reasoning: 'Internal model prediction',
            priorityScore: calculatePriorityScore(prediction.urgency, prediction.severity),
        },
        homeownerExplanation: {
            whatIsIt: `${prediction.damageType} damage detected`,
            whyItHappened: 'Analysis based on image assessment',
            whatToDo: getRecommendedAction(prediction.urgency),
        },
        contractorAdvice: {
            repairNeeded: [prediction.damageType],
            materials: [],
            tools: [],
            estimatedTime: 'To be determined',
            estimatedCost: { min: 0, max: 0, recommended: 0 },
            complexity: getComplexity(prediction.severity),
        },
        evidence: {
            roboflowDetections: [],
            visionAnalysis: null,
        },
    };
}

// --- Helper functions ---

function calculateSafetyScore(urgency: UrgencyLevel): number {
    const scores: Record<UrgencyLevel, number> = {
        immediate: 20, urgent: 40, soon: 60, planned: 80, monitor: 100,
    };
    return scores[urgency] || 50;
}

function calculateRiskScore(severity: DamageSeverity): number {
    const scores: Record<DamageSeverity, number> = {
        full: 90, midway: 60, early: 30,
    };
    return scores[severity] || 50;
}

function calculatePremiumImpact(severity: DamageSeverity): 'none' | 'low' | 'medium' | 'high' {
    const impacts: Record<DamageSeverity, 'none' | 'low' | 'medium' | 'high'> = {
        early: 'low', midway: 'medium', full: 'high',
    };
    return impacts[severity] || 'low';
}

function getDefaultTimeline(urgency: UrgencyLevel): string {
    const timelines: Record<UrgencyLevel, string> = {
        immediate: 'Within 24 hours',
        urgent: 'Within 1 week',
        soon: 'Within 1 month',
        planned: 'Within 3 months',
        monitor: 'Monitor for changes',
    };
    return timelines[urgency] || 'To be determined';
}

function getRecommendedAction(urgency: UrgencyLevel): string {
    const actions: Record<UrgencyLevel, string> = {
        immediate: 'Contact a professional immediately',
        urgent: 'Schedule professional assessment within 1 week',
        soon: 'Plan for repair within the month',
        planned: 'Add to maintenance schedule',
        monitor: 'Continue monitoring condition',
    };
    return actions[urgency] || 'Consult a professional';
}

function calculatePriorityScore(urgency: UrgencyLevel, severity: DamageSeverity): number {
    const urgencyScores: Record<UrgencyLevel, number> = {
        immediate: 100, urgent: 80, soon: 60, planned: 40, monitor: 20,
    };
    const severityScores: Record<DamageSeverity, number> = {
        full: 100, midway: 60, early: 30,
    };
    return Math.round(urgencyScores[urgency] * 0.6 + severityScores[severity] * 0.4);
}

function getComplexity(severity: DamageSeverity): 'low' | 'medium' | 'high' {
    const complexity: Record<DamageSeverity, 'low' | 'medium' | 'high'> = {
        early: 'low', midway: 'medium', full: 'high',
    };
    return complexity[severity] || 'medium';
}
