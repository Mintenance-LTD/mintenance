/**
 * Hybrid Inference Service
 *
 * Implements confidence-based routing between internal models and external APIs.
 * Gradually transitions from 100% external APIs -> hybrid -> 100% internal as models improve.
 *
 * This file is a thin orchestrator. Logic is split into:
 * - routing/types.ts          - Shared types and constants
 * - routing/routeExecutors.ts - Route execution and conversion helpers
 * - routing/analytics.ts      - Recording, calibration, and statistics
 */

import { logger } from '@mintenance/shared';
import { InternalDamageClassifier } from './InternalDamageClassifier';
import { FeatureExtractionService } from './orchestration/FeatureExtractionService';
import { RoboflowDetectionService } from './RoboflowDetectionService';
import { ModelDriftDetectionService } from '../ai/ModelDriftDetectionService';
import type { AssessmentContext, RoboflowDetection } from './types';

// Re-export all public types and constants for backwards compatibility
export { CONFIDENCE_THRESHOLDS } from './routing/types';
export type {
    InferenceRoute,
    HybridInferenceResult,
    InternalPrediction,
} from './routing/types';

import { getConfidenceThresholds } from './routing/types';
import type { HybridInferenceResult, RouteDecision } from './routing/types';
import { getActiveDomain } from './config/BuildingSurveyorConfig';
import {
    executeInternalRoute,
    executeGPT4Route,
    executeHybridRoute,
} from './routing/routeExecutors';
import {
    recordRoutingDecision,
    calibrateConfidence,
    getRoutingStatistics,
} from './routing/analytics';

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
            const routeDecision = await this.selectRoute(features, context, imageUrls);

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
                    result = await executeInternalRoute(imageUrls, features, context, routeDecision);
                    break;
                case 'gpt4_vision':
                    result = await executeGPT4Route(imageUrls, context, routeDecision);
                    break;
                case 'hybrid':
                    result = await executeHybridRoute(imageUrls, features, context, routeDecision);
                    break;
                default:
                    throw new Error(`Unknown route: ${routeDecision.route}`);
            }

            result.inferenceTimeMs = Date.now() - startTime;

            // Step 4: Record routing decision for analytics
            await recordRoutingDecision(result, imageUrls, context);

            // Step 5: Track for drift detection if using internal model
            if (result.internalPrediction && result.routingDecisionId) {
                const gpt4Agreement = result.route === 'hybrid' && result.agreementScore
                    ? result.agreementScore > 80
                    : undefined;

                await ModelDriftDetectionService.recordPrediction(
                    result.routingDecisionId,
                    process.env.ML_MODEL_VERSION || 'unknown',
                    result.internalPrediction.confidence,
                    {
                        damageType: result.internalPrediction.damageType,
                        severity: result.internalPrediction.severity,
                        urgency: result.internalPrediction.urgency,
                    },
                    gpt4Agreement,
                    features
                ).catch(error => {
                    logger.warn('Failed to record prediction for drift detection', {
                        service: this.SERVICE_NAME,
                        error,
                    });
                });
            }

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
            const detections = await RoboflowDetectionService.detect(imageUrls);
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
     * Decide which route to take based on model availability, confidence,
     * and domain-specific thresholds.
     */
    private static async selectRoute(
        features: number[],
        context?: AssessmentContext,
        imageUrls?: string[]
    ): Promise<RouteDecision> {
        const isModelReady = await InternalDamageClassifier.isModelReady();

        if (!isModelReady) {
            return {
                route: 'gpt4_vision',
                confidence: 0,
                useInternalFirst: false,
                reasoning: 'Internal model not available or not sufficiently trained',
            };
        }

        const internal = imageUrls && imageUrls.length > 0
            ? await InternalDamageClassifier.predictFromImage(imageUrls[0])
            : await InternalDamageClassifier.predict(features);

        // Domain-aware safety check: use GPT-4 for safety-critical predictions
        const domain = getActiveDomain();
        const isSafetyCritical = domain.safetyCriticalClasses.includes(internal.damageType);
        const hasSuspectedHazard = isSafetyCritical ||
                                   context?.propertyType === 'commercial' ||
                                   internal.urgency === 'immediate';

        if (hasSuspectedHazard) {
            return {
                route: 'gpt4_vision',
                confidence: internal.confidence,
                useInternalFirst: false,
                reasoning: `Safety-critical detection (${domain.id}) - using GPT-4 Vision for verification`,
            };
        }

        // Use domain-specific confidence thresholds
        const thresholds = getConfidenceThresholds();

        if (internal.confidence >= thresholds.high) {
            return {
                route: 'internal',
                confidence: internal.confidence,
                useInternalFirst: true,
                reasoning: `High confidence (${internal.confidence.toFixed(2)}, domain=${domain.id}) - using internal model`,
            };
        } else if (internal.confidence >= thresholds.medium) {
            return {
                route: 'hybrid',
                confidence: internal.confidence,
                useInternalFirst: true,
                reasoning: `Medium confidence (${internal.confidence.toFixed(2)}, domain=${domain.id}) - using hybrid approach`,
            };
        } else {
            return {
                route: 'gpt4_vision',
                confidence: internal.confidence,
                useInternalFirst: false,
                reasoning: `Low confidence (${internal.confidence.toFixed(2)}, domain=${domain.id}) - using GPT-4 Vision`,
            };
        }
    }

    /**
     * Calibrate confidence thresholds based on actual outcomes
     */
    static async calibrateConfidence(
        assessmentId: string,
        actualOutcome: {
            wasCorrect: boolean;
            actualSeverity?: import('./types').DamageSeverity;
            actualUrgency?: import('./types').UrgencyLevel;
        }
    ): Promise<void> {
        return calibrateConfidence(assessmentId, actualOutcome);
    }

    /**
     * Get statistics on route usage and performance
     */
    static async getRoutingStatistics(
        timeRange?: { start: Date; end: Date }
    ) {
        return getRoutingStatistics(timeRange);
    }
}
