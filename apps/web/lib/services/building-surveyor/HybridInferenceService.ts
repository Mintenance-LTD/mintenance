/**
 * Hybrid Inference Service
 *
 * Implements confidence-based routing between internal models and external APIs.
 * Gradually transitions from 100% external APIs → hybrid → 100% internal as models improve.
 *
 * Key Features:
 * - Tries internal model first if available
 * - Routes based on confidence thresholds
 * - Falls back to GPT-4 Vision for uncertain cases
 * - Records all routing decisions for analytics and model improvement
 * - Calibrates confidence thresholds over time
 */

import { logger } from '@mintenance/shared';
import { InternalDamageClassifier } from './InternalDamageClassifier';
import { AssessmentOrchestrator } from './orchestration/AssessmentOrchestrator';
import { FeatureExtractionService } from './orchestration/FeatureExtractionService';
import { PromptBuilder } from './orchestration/PromptBuilder';
import { RoboflowDetectionService } from './RoboflowDetectionService';
import { getConfig } from './config/BuildingSurveyorConfig';
import { supabase } from '@/lib/supabase';
import type {
    AssessmentContext,
    Phase1BuildingAssessment,
    DamageSeverity,
    UrgencyLevel,
    VisionAnalysisSummary,
    RoboflowDetection,
} from './types';

/**
 * Inference route options
 */
export type InferenceRoute = 'internal' | 'gpt4_vision' | 'hybrid';

/**
 * Confidence thresholds for routing decisions
 */
export const CONFIDENCE_THRESHOLDS = {
    high: 0.85,      // Use internal model confidently
    medium: 0.70,    // Use internal but verify with GPT-4
    low: 0.50,       // Use GPT-4 as primary
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
interface RouteDecision {
    route: InferenceRoute;
    confidence: number;
    useInternalFirst: boolean;
    reasoning: string;
}

/**
 * Hybrid Inference Service
 *
 * Main routing logic for deciding between internal models and external APIs
 */
export class HybridInferenceService {
    private static readonly SERVICE_NAME = 'HybridInferenceService';

    /**
     * Main entry point: Assess damage with hybrid routing
     */
    static async assessDamage(
        imageUrls: string[],
        context?: AssessmentContext
    ): Promise<HybridInferenceResult> {
        const startTime = Date.now();

        try {
            logger.info('Starting hybrid inference assessment', {
                service: this.SERVICE_NAME,
                imageCount: imageUrls.length,
                context,
            });

            // Step 1: Extract features (needed for both routes)
            const features = await this.extractFeatures(imageUrls, context);

            // Step 2: Decide which route to take
            const routeDecision = await this.selectRoute(features, context);

            logger.info('Route selected', {
                service: this.SERVICE_NAME,
                route: routeDecision.route,
                confidence: routeDecision.confidence,
                reasoning: routeDecision.reasoning,
            });

            // Step 3: Execute the selected route
            let result: HybridInferenceResult;

            switch (routeDecision.route) {
                case 'internal':
                    result = await this.executeInternalRoute(imageUrls, features, context, routeDecision);
                    break;
                case 'gpt4_vision':
                    result = await this.executeGPT4Route(imageUrls, context, routeDecision);
                    break;
                case 'hybrid':
                    result = await this.executeHybridRoute(imageUrls, features, context, routeDecision);
                    break;
                default:
                    throw new Error(`Unknown route: ${routeDecision.route}`);
            }

            result.inferenceTimeMs = Date.now() - startTime;

            // Step 4: Record routing decision for analytics
            await this.recordRoutingDecision(result, imageUrls, context);

            logger.info('Hybrid inference completed', {
                service: this.SERVICE_NAME,
                route: result.route,
                inferenceTimeMs: result.inferenceTimeMs,
            });

            return result;
        } catch (error) {
            logger.error('Hybrid inference failed', error, {
                service: this.SERVICE_NAME,
            });
            throw error;
        }
    }

    /**
     * Extract features for assessment
     */
    private static async extractFeatures(
        imageUrls: string[],
        context?: AssessmentContext
    ): Promise<number[]> {
        try {
            // Get YOLO detections
            const detections = await RoboflowDetectionService.detect(imageUrls);

            // Extract features using FeatureExtractionService
            const features = await FeatureExtractionService.extractFeatures(
                imageUrls,
                context,
                undefined,
                detections as RoboflowDetection[],
                null
            );

            return features;
        } catch (error) {
            logger.warn('Feature extraction failed, using empty features', {
                service: this.SERVICE_NAME,
                error,
            });
            return new Array(40).fill(0);
        }
    }

    /**
     * Decide which route to take based on model availability and confidence
     */
    private static async selectRoute(
        features: number[],
        context?: AssessmentContext
    ): Promise<RouteDecision> {
        // 1. Check if internal model exists and is trained
        const isModelReady = await InternalDamageClassifier.isModelReady();

        if (!isModelReady) {
            return {
                route: 'gpt4_vision',
                confidence: 0,
                useInternalFirst: false,
                reasoning: 'Internal model not available or not sufficiently trained',
            };
        }

        // 2. Get internal prediction
        const internal = await InternalDamageClassifier.predict(features);

        // 3. Check for critical safety indicators (always use GPT-4 for safety)
        const hasSuspectedHazard = context?.propertyType === 'commercial' ||
                                   internal.urgency === 'immediate';

        if (hasSuspectedHazard) {
            return {
                route: 'gpt4_vision',
                confidence: internal.confidence,
                useInternalFirst: false,
                reasoning: 'Critical safety concern detected - using GPT-4 Vision for verification',
            };
        }

        // 4. Route based on confidence thresholds
        if (internal.confidence >= CONFIDENCE_THRESHOLDS.high) {
            return {
                route: 'internal',
                confidence: internal.confidence,
                useInternalFirst: true,
                reasoning: `High confidence (${internal.confidence.toFixed(2)}) - using internal model`,
            };
        } else if (internal.confidence >= CONFIDENCE_THRESHOLDS.medium) {
            return {
                route: 'hybrid',
                confidence: internal.confidence,
                useInternalFirst: true,
                reasoning: `Medium confidence (${internal.confidence.toFixed(2)}) - using hybrid approach for validation`,
            };
        } else {
            return {
                route: 'gpt4_vision',
                confidence: internal.confidence,
                useInternalFirst: false,
                reasoning: `Low confidence (${internal.confidence.toFixed(2)}) - using GPT-4 Vision as primary`,
            };
        }
    }

    /**
     * Execute internal-only route
     */
    private static async executeInternalRoute(
        imageUrls: string[],
        features: number[],
        context: AssessmentContext | undefined,
        routeDecision: RouteDecision
    ): Promise<HybridInferenceResult> {
        const prediction = await InternalDamageClassifier.predict(features);

        // Convert internal prediction to Phase1BuildingAssessment format
        const assessment = this.convertInternalPredictionToAssessment(
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
            inferenceTimeMs: 0, // Will be set by caller
        };
    }

    /**
     * Execute GPT-4 Vision only route
     */
    private static async executeGPT4Route(
        imageUrls: string[],
        context: AssessmentContext | undefined,
        routeDecision: RouteDecision
    ): Promise<HybridInferenceResult> {
        // Use existing AssessmentOrchestrator for GPT-4 assessment
        const assessment = await AssessmentOrchestrator.assessDamage(imageUrls, context);

        return {
            assessment,
            route: 'gpt4_vision',
            confidence: assessment.damageAssessment.confidence,
            reasoning: routeDecision.reasoning,
            gpt4Prediction: assessment,
            inferenceTimeMs: 0, // Will be set by caller
        };
    }

    /**
     * Execute hybrid route (internal + GPT-4 for comparison)
     */
    private static async executeHybridRoute(
        imageUrls: string[],
        features: number[],
        context: AssessmentContext | undefined,
        routeDecision: RouteDecision
    ): Promise<HybridInferenceResult> {
        // Run both internal and GPT-4 in parallel
        const [internalResult, gpt4Assessment] = await Promise.all([
            InternalDamageClassifier.predict(features),
            AssessmentOrchestrator.assessDamage(imageUrls, context),
        ]);

        // Calculate agreement score
        const agreementScore = this.calculateAgreementScore(internalResult, gpt4Assessment);

        // If high agreement, use internal; otherwise use GPT-4
        const useInternal = agreementScore >= 0.80;
        const finalAssessment = useInternal
            ? this.convertInternalPredictionToAssessment(internalResult, imageUrls, context)
            : gpt4Assessment;

        return {
            assessment: finalAssessment,
            route: 'hybrid',
            confidence: routeDecision.confidence,
            reasoning: `${routeDecision.reasoning}. Agreement: ${(agreementScore * 100).toFixed(1)}%. Using ${useInternal ? 'internal' : 'GPT-4'} prediction.`,
            internalPrediction: internalResult,
            gpt4Prediction: gpt4Assessment,
            agreementScore: agreementScore * 100,
            inferenceTimeMs: 0, // Will be set by caller
        };
    }

    /**
     * Convert internal prediction to Phase1BuildingAssessment format
     */
    private static convertInternalPredictionToAssessment(
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
                hazards: prediction.safetyHazards as any[],
                hasCriticalHazards: prediction.urgency === 'immediate',
                overallSafetyScore: this.calculateSafetyScore(prediction.urgency),
            },
            compliance: {
                complianceIssues: [],
                requiresProfessionalInspection: prediction.severity === 'full',
                complianceScore: 100,
            },
            insuranceRisk: {
                riskFactors: [],
                riskScore: this.calculateRiskScore(prediction.severity),
                premiumImpact: this.calculatePremiumImpact(prediction.severity),
                mitigationSuggestions: [],
            },
            urgency: {
                urgency: prediction.urgency,
                recommendedActionTimeline: this.getDefaultTimeline(prediction.urgency),
                reasoning: 'Internal model prediction',
                priorityScore: this.calculatePriorityScore(prediction.urgency, prediction.severity),
            },
            homeownerExplanation: {
                whatIsIt: `${prediction.damageType} damage detected`,
                whyItHappened: 'Analysis based on image assessment',
                whatToDo: this.getRecommendedAction(prediction.urgency),
            },
            contractorAdvice: {
                repairNeeded: [prediction.damageType],
                materials: [],
                tools: [],
                estimatedTime: 'To be determined',
                estimatedCost: { min: 0, max: 0, recommended: 0 },
                complexity: this.getComplexity(prediction.severity),
            },
            evidence: {
                roboflowDetections: [],
                visionAnalysis: null,
            },
        };
    }

    /**
     * Calculate agreement between internal and GPT-4 predictions
     */
    private static calculateAgreementScore(
        internal: InternalPrediction,
        gpt4: Phase1BuildingAssessment
    ): number {
        let score = 0;
        let factors = 0;

        // Compare damage type (40% weight)
        if (internal.damageType.toLowerCase() === gpt4.damageAssessment.damageType.toLowerCase()) {
            score += 0.40;
        }
        factors++;

        // Compare severity (30% weight)
        if (internal.severity === gpt4.damageAssessment.severity) {
            score += 0.30;
        }
        factors++;

        // Compare urgency (30% weight)
        if (internal.urgency === gpt4.urgency.urgency) {
            score += 0.30;
        }
        factors++;

        return score;
    }

    /**
     * Record routing decision to database for analytics
     */
    private static async recordRoutingDecision(
        result: HybridInferenceResult,
        imageUrls: string[],
        context?: AssessmentContext
    ): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('hybrid_routing_decisions')
                .insert({
                    assessment_id: context?.assessmentId || null,
                    route_selected: result.route,
                    internal_confidence: result.internalPrediction?.confidence || null,
                    internal_prediction: result.internalPrediction || null,
                    gpt4_prediction: result.gpt4Prediction || null,
                    final_assessment: result.assessment,
                    route_reasoning: result.reasoning,
                    inference_time_ms: result.inferenceTimeMs,
                    image_count: imageUrls.length,
                    agreement_score: result.agreementScore || null,
                })
                .select('id')
                .single();

            if (error) {
                logger.error('Failed to record routing decision', error, {
                    service: this.SERVICE_NAME,
                });
            } else {
                result.routingDecisionId = data?.id;
            }
        } catch (error) {
            logger.error('Error recording routing decision', error, {
                service: this.SERVICE_NAME,
            });
        }
    }

    /**
     * Calibrate confidence thresholds based on actual outcomes
     * Called after human validation to adjust thresholds
     */
    static async calibrateConfidence(
        assessmentId: string,
        actualOutcome: {
            wasCorrect: boolean;
            actualSeverity?: DamageSeverity;
            actualUrgency?: UrgencyLevel;
        }
    ): Promise<void> {
        try {
            // Get the routing decision for this assessment
            const { data: decision, error } = await supabase
                .from('hybrid_routing_decisions')
                .select('*')
                .eq('assessment_id', assessmentId)
                .single();

            if (error || !decision) {
                logger.warn('No routing decision found for calibration', {
                    service: this.SERVICE_NAME,
                    assessmentId,
                });
                return;
            }

            // Record calibration data
            await supabase.from('confidence_calibration_data').insert({
                routing_decision_id: decision.id,
                route_used: decision.route_selected,
                internal_confidence: decision.internal_confidence,
                was_correct: actualOutcome.wasCorrect,
                actual_severity: actualOutcome.actualSeverity,
                actual_urgency: actualOutcome.actualUrgency,
            });

            logger.info('Confidence calibration recorded', {
                service: this.SERVICE_NAME,
                assessmentId,
                wasCorrect: actualOutcome.wasCorrect,
            });

            // TODO: Periodically analyze calibration data to adjust CONFIDENCE_THRESHOLDS
            // This would be done in a separate batch job to update thresholds based on
            // statistical analysis of prediction accuracy at different confidence levels
        } catch (error) {
            logger.error('Failed to calibrate confidence', error, {
                service: this.SERVICE_NAME,
                assessmentId,
            });
        }
    }

    /**
     * Get statistics on route usage and performance
     */
    static async getRoutingStatistics(
        timeRange?: { start: Date; end: Date }
    ): Promise<{
        totalAssessments: number;
        routeDistribution: Record<InferenceRoute, number>;
        averageConfidence: Record<InferenceRoute, number>;
        averageInferenceTime: Record<InferenceRoute, number>;
        agreementScores: number[];
    }> {
        try {
            let query = supabase
                .from('hybrid_routing_decisions')
                .select('*');

            if (timeRange) {
                query = query
                    .gte('created_at', timeRange.start.toISOString())
                    .lte('created_at', timeRange.end.toISOString());
            }

            const { data: decisions, error } = await query;

            if (error || !decisions) {
                throw error || new Error('No routing decisions found');
            }

            const stats = {
                totalAssessments: decisions.length,
                routeDistribution: {
                    internal: 0,
                    gpt4_vision: 0,
                    hybrid: 0,
                } as Record<InferenceRoute, number>,
                averageConfidence: {
                    internal: 0,
                    gpt4_vision: 0,
                    hybrid: 0,
                } as Record<InferenceRoute, number>,
                averageInferenceTime: {
                    internal: 0,
                    gpt4_vision: 0,
                    hybrid: 0,
                } as Record<InferenceRoute, number>,
                agreementScores: [] as number[],
            };

            const routeCounts = { internal: 0, gpt4_vision: 0, hybrid: 0 };
            const confSums = { internal: 0, gpt4_vision: 0, hybrid: 0 };
            const timeSums = { internal: 0, gpt4_vision: 0, hybrid: 0 };

            for (const decision of decisions) {
                const route = decision.route_selected as InferenceRoute;
                routeCounts[route]++;
                stats.routeDistribution[route]++;

                if (decision.internal_confidence) {
                    confSums[route] += decision.internal_confidence;
                }

                if (decision.inference_time_ms) {
                    timeSums[route] += decision.inference_time_ms;
                }

                if (decision.agreement_score) {
                    stats.agreementScores.push(decision.agreement_score);
                }
            }

            // Calculate averages
            for (const route of ['internal', 'gpt4_vision', 'hybrid'] as InferenceRoute[]) {
                if (routeCounts[route] > 0) {
                    stats.averageConfidence[route] = confSums[route] / routeCounts[route];
                    stats.averageInferenceTime[route] = timeSums[route] / routeCounts[route];
                }
            }

            return stats;
        } catch (error) {
            logger.error('Failed to get routing statistics', error, {
                service: this.SERVICE_NAME,
            });
            throw error;
        }
    }

    // Helper methods
    private static calculateSafetyScore(urgency: UrgencyLevel): number {
        const scores: Record<UrgencyLevel, number> = {
            immediate: 20,
            urgent: 40,
            soon: 60,
            planned: 80,
            monitor: 100,
        };
        return scores[urgency] || 50;
    }

    private static calculateRiskScore(severity: DamageSeverity): number {
        const scores: Record<DamageSeverity, number> = {
            full: 90,
            midway: 60,
            early: 30,
        };
        return scores[severity] || 50;
    }

    private static calculatePremiumImpact(severity: DamageSeverity): 'none' | 'low' | 'medium' | 'high' {
        const impacts: Record<DamageSeverity, 'none' | 'low' | 'medium' | 'high'> = {
            early: 'low',
            midway: 'medium',
            full: 'high',
        };
        return impacts[severity] || 'low';
    }

    private static getDefaultTimeline(urgency: UrgencyLevel): string {
        const timelines: Record<UrgencyLevel, string> = {
            immediate: 'Within 24 hours',
            urgent: 'Within 1 week',
            soon: 'Within 1 month',
            planned: 'Within 3 months',
            monitor: 'Monitor for changes',
        };
        return timelines[urgency] || 'To be determined';
    }

    private static getRecommendedAction(urgency: UrgencyLevel): string {
        const actions: Record<UrgencyLevel, string> = {
            immediate: 'Contact a professional immediately',
            urgent: 'Schedule professional assessment within 1 week',
            soon: 'Plan for repair within the month',
            planned: 'Add to maintenance schedule',
            monitor: 'Continue monitoring condition',
        };
        return actions[urgency] || 'Consult a professional';
    }

    private static calculatePriorityScore(urgency: UrgencyLevel, severity: DamageSeverity): number {
        const urgencyScores: Record<UrgencyLevel, number> = {
            immediate: 100,
            urgent: 80,
            soon: 60,
            planned: 40,
            monitor: 20,
        };

        const severityScores: Record<DamageSeverity, number> = {
            full: 100,
            midway: 60,
            early: 30,
        };

        return Math.round(
            urgencyScores[urgency] * 0.6 + severityScores[severity] * 0.4
        );
    }

    private static getComplexity(severity: DamageSeverity): 'low' | 'medium' | 'high' {
        const complexity: Record<DamageSeverity, 'low' | 'medium' | 'high'> = {
            early: 'low',
            midway: 'medium',
            full: 'high',
        };
        return complexity[severity] || 'medium';
    }
}
