/**
 * Hybrid Inference - Analytics and Calibration
 *
 * Records routing decisions, calibrates confidence thresholds,
 * and provides routing statistics.
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import type {
    AssessmentContext,
    DamageSeverity,
    UrgencyLevel,
} from '../types';
import type { HybridInferenceResult, InferenceRoute } from './types';

const SERVICE_NAME = 'HybridInferenceService';

/**
 * Record routing decision to database for analytics
 */
export async function recordRoutingDecision(
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
                service: SERVICE_NAME,
            });
        } else {
            result.routingDecisionId = data?.id;
        }
    } catch (error) {
        logger.error('Error recording routing decision', error, {
            service: SERVICE_NAME,
        });
    }
}

/**
 * Calibrate confidence thresholds based on actual outcomes
 * Called after human validation to adjust thresholds
 */
export async function calibrateConfidence(
    assessmentId: string,
    actualOutcome: {
        wasCorrect: boolean;
        actualSeverity?: DamageSeverity;
        actualUrgency?: UrgencyLevel;
    }
): Promise<void> {
    try {
        const { data: decision, error } = await supabase
            .from('hybrid_routing_decisions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .single();

        if (error || !decision) {
            logger.warn('No routing decision found for calibration', {
                service: SERVICE_NAME,
                assessmentId,
            });
            return;
        }

        await supabase.from('confidence_calibration_data').insert({
            routing_decision_id: decision.id,
            route_used: decision.route_selected,
            internal_confidence: decision.internal_confidence,
            was_correct: actualOutcome.wasCorrect,
            actual_severity: actualOutcome.actualSeverity,
            actual_urgency: actualOutcome.actualUrgency,
        });

        logger.info('Confidence calibration recorded', {
            service: SERVICE_NAME,
            assessmentId,
            wasCorrect: actualOutcome.wasCorrect,
        });

        // TODO: Periodically analyze calibration data to adjust CONFIDENCE_THRESHOLDS
        // This would be done in a separate batch job to update thresholds based on
        // statistical analysis of prediction accuracy at different confidence levels
    } catch (error) {
        logger.error('Failed to calibrate confidence', error, {
            service: SERVICE_NAME,
            assessmentId,
        });
    }
}

/**
 * Get statistics on route usage and performance
 */
export async function getRoutingStatistics(
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
            routeDistribution: { internal: 0, gpt4_vision: 0, hybrid: 0 } as Record<InferenceRoute, number>,
            averageConfidence: { internal: 0, gpt4_vision: 0, hybrid: 0 } as Record<InferenceRoute, number>,
            averageInferenceTime: { internal: 0, gpt4_vision: 0, hybrid: 0 } as Record<InferenceRoute, number>,
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

        for (const route of ['internal', 'gpt4_vision', 'hybrid'] as InferenceRoute[]) {
            if (routeCounts[route] > 0) {
                stats.averageConfidence[route] = confSums[route] / routeCounts[route];
                stats.averageInferenceTime[route] = timeSums[route] / routeCounts[route];
            }
        }

        return stats;
    } catch (error) {
        logger.error('Failed to get routing statistics', error, {
            service: SERVICE_NAME,
        });
        throw error;
    }
}
