/**
 * Feature Flag Management API
 *
 * Provides endpoints for managing feature flags, monitoring rollout metrics,
 * and triggering rollbacks when thresholds are exceeded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import { featureFlags, FeatureFlag } from '@/lib/config/feature-flags';
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';

/**
 * GET /api/feature-flags
 * Get current feature flag status and metrics
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const flag = searchParams.get('flag');
        const includeMetrics = searchParams.get('metrics') === 'true';

        if (flag) {
            // Get specific flag status
            const config = featureFlags.getFlag(flag as FeatureFlag, null);

            if (includeMetrics && flag === FeatureFlag.SAM3_PRESENCE_DETECTION) {
                // Get SAM3 specific metrics
                const metrics = await getSAM3Metrics();
                return NextResponse.json({
                    flag,
                    config,
                    metrics,
                    timestamp: new Date().toISOString(),
                });
            }

            return NextResponse.json({
                flag,
                config,
                timestamp: new Date().toISOString(),
            });
        }

        // Get all flags
        const allFlags = {
            [FeatureFlag.SAM3_PRESENCE_DETECTION]: featureFlags.getSAM3Config(),
            [FeatureFlag.YOLO_SKIP_OPTIMIZATION]: featureFlags.getFlag(
                FeatureFlag.YOLO_SKIP_OPTIMIZATION,
                false
            ),
            [FeatureFlag.HYBRID_INFERENCE]: featureFlags.getFlag(
                FeatureFlag.HYBRID_INFERENCE,
                true
            ),
            [FeatureFlag.INTERNAL_MODEL_PRIMARY]: featureFlags.getFlag(
                FeatureFlag.INTERNAL_MODEL_PRIMARY,
                false
            ),
            [FeatureFlag.DRIFT_DETECTION]: featureFlags.getFlag(
                FeatureFlag.DRIFT_DETECTION,
                true
            ),
            [FeatureFlag.AUTO_ROLLBACK]: featureFlags.getFlag(
                FeatureFlag.AUTO_ROLLBACK,
                true
            ),
        };

        if (includeMetrics) {
            const metrics = await getOverallMetrics();
            return NextResponse.json({
                flags: allFlags,
                metrics,
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            flags: allFlags,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('Error fetching feature flags', error);
        return NextResponse.json(
            { error: 'Failed to fetch feature flags' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/feature-flags/metrics
 * Record metrics for feature flag performance
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { flag, metrics, userId, sessionId } = body;

        // Validate input
        if (!flag || !metrics) {
            return NextResponse.json(
                { error: 'Missing required fields: flag, metrics' },
                { status: 400 }
            );
        }

        // Record metrics in database
        const { data, error } = await supabase
            .from('feature_flag_metrics')
            .insert({
                flag_name: flag,
                user_id: userId,
                session_id: sessionId,
                metrics,
                recorded_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        // Track in feature flag service
        featureFlags.trackUsage(flag as FeatureFlag, metrics);

        // Special handling for SAM3 metrics
        if (flag === FeatureFlag.SAM3_PRESENCE_DETECTION) {
            await handleSAM3Metrics(metrics);
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            message: 'Metrics recorded successfully',
        });
    } catch (error) {
        logger.error('Error recording feature flag metrics', error);
        return NextResponse.json(
            { error: 'Failed to record metrics' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/feature-flags/rollback
 * Trigger rollback for a feature flag
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { flag, reason, metrics, automatic = false } = body;

        // Validate input
        if (!flag || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields: flag, reason' },
                { status: 400 }
            );
        }

        logger.warn('Feature flag rollback triggered', {
            flag,
            reason,
            automatic,
            metrics,
        });

        // Record rollback event
        const { data: rollbackData, error: rollbackError } = await supabase
            .from('feature_flag_rollbacks')
            .insert({
                flag_name: flag,
                reason,
                automatic,
                metrics,
                triggered_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (rollbackError) {
            throw rollbackError;
        }

        // Perform rollback based on flag
        let rollbackResult;
        switch (flag) {
            case FeatureFlag.SAM3_PRESENCE_DETECTION:
                rollbackResult = await rollbackSAM3();
                break;
            default:
                // Generic rollback - disable the flag
                rollbackResult = await genericRollback(flag);
        }

        // Send notifications
        await sendRollbackNotifications(flag, reason, rollbackResult);

        return NextResponse.json({
            success: true,
            rollbackId: rollbackData.id,
            result: rollbackResult,
            message: `Rollback completed for ${flag}`,
        });
    } catch (error) {
        logger.error('Error triggering rollback', error);
        return NextResponse.json(
            { error: 'Failed to trigger rollback' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/feature-flags/status
 * Get detailed status for monitoring
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const flag = searchParams.get('flag');
        const timeRange = searchParams.get('timeRange') || '1h';

        // Get metrics from database
        const timeRangeMs = parseTimeRange(timeRange);
        const startTime = new Date(Date.now() - timeRangeMs).toISOString();

        let query = supabase
            .from('feature_flag_metrics')
            .select('*')
            .gte('recorded_at', startTime)
            .order('recorded_at', { ascending: false });

        if (flag) {
            query = query.eq('flag_name', flag);
        }

        const { data: metricsData, error: metricsError } = await query;

        if (metricsError) {
            throw metricsError;
        }

        // Calculate aggregate metrics
        const aggregateMetrics = calculateAggregateMetrics(metricsData);

        // Get rollback history
        const { data: rollbacks } = await supabase
            .from('feature_flag_rollbacks')
            .select('*')
            .gte('triggered_at', startTime)
            .order('triggered_at', { ascending: false })
            .limit(10);

        // Get current configuration
        const currentConfig = flag
            ? featureFlags.getFlag(flag as FeatureFlag, null)
            : getAllFlagsConfig();

        return NextResponse.json({
            status: 'active',
            config: currentConfig,
            metrics: aggregateMetrics,
            rollbacks: rollbacks || [],
            timeRange,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('Error fetching feature flag status', error);
        return NextResponse.json(
            { error: 'Failed to fetch status' },
            { status: 500 }
        );
    }
}

// Helper functions

async function getSAM3Metrics() {
    // Get YOLO savings metrics
    const yoloSavings = HybridInferenceService.getYoloSavingsMetrics();

    // Get recent performance from database
    const { data: recentMetrics } = await supabase
        .from('hybrid_routing_decisions')
        .select('yolo_skipped, presence_detection, inference_time_ms')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .limit(100);

    const falseNegativeRate = calculateFalseNegativeRate(recentMetrics);
    const avgInferenceTime = calculateAvgInferenceTime(recentMetrics);

    return {
        yoloSkipRate: yoloSavings.skipRate * 100,
        yoloSkipped: yoloSavings.yoloSkipped,
        totalAssessments: yoloSavings.totalAssessments,
        estimatedTimeSaved: yoloSavings.estimatedTimeSavedMs,
        estimatedComputeSaved: yoloSavings.estimatedComputeSaved,
        falseNegativeRate,
        avgInferenceTime,
        lastUpdated: new Date().toISOString(),
    };
}

async function getOverallMetrics() {
    const timeRange = {
        start: new Date(Date.now() - 86400000), // 24 hours
        end: new Date(),
    };

    const routingStats = await HybridInferenceService.getRoutingStatistics(timeRange);

    return {
        routing: routingStats,
        sam3: await getSAM3Metrics(),
        timestamp: new Date().toISOString(),
    };
}

async function handleSAM3Metrics(metrics: any) {
    const config = featureFlags.getSAM3Config();

    // Check if automatic rollback is needed
    if (
        config.enabled &&
        metrics.falseNegativeRate &&
        metrics.falseNegativeRate > config.maxFalseNegativeRate
    ) {
        logger.error('SAM3 false negative rate exceeded threshold', {
            rate: metrics.falseNegativeRate,
            threshold: config.maxFalseNegativeRate,
        });

        // Trigger automatic rollback
        if (featureFlags.getFlag(FeatureFlag.AUTO_ROLLBACK, true)) {
            await rollbackSAM3();
        }
    }

    // Track performance
    featureFlags.trackSAM3Performance({
        falsePositiveReduction: metrics.falsePositiveReduction,
        yoloSkipRate: metrics.yoloSkipRate,
        inferenceTimeMs: metrics.inferenceTimeMs,
        falseNegativeRate: metrics.falseNegativeRate,
        errorRate: metrics.errorRate,
    });
}

async function rollbackSAM3() {
    logger.info('Rolling back SAM3 presence detection');

    // Update feature flag to disable SAM3
    const updateResult = await updateFeatureFlag(
        FeatureFlag.SAM3_PRESENCE_DETECTION,
        {
            enabled: false,
            rolloutPercentage: 0,
        }
    );

    // Reset YOLO savings metrics
    HybridInferenceService.resetYoloSavingsMetrics();

    return {
        success: true,
        flagDisabled: true,
        metricsReset: true,
        updateResult,
    };
}

async function genericRollback(flag: string) {
    logger.info('Rolling back feature flag', { flag });

    const updateResult = await updateFeatureFlag(flag, false);

    return {
        success: true,
        flagDisabled: true,
        updateResult,
    };
}

async function updateFeatureFlag(flag: string, value: any) {
    // In production, this would update LaunchDarkly
    // For now, update local state and database
    const { data, error } = await supabase
        .from('feature_flag_config')
        .upsert({
            flag_name: flag,
            config: value,
            updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    return { success: !error, data };
}

async function sendRollbackNotifications(
    flag: string,
    reason: string,
    result: any
) {
    // Send Slack notification
    try {
        const slackWebhook = process.env.SLACK_WEBHOOK;
        if (slackWebhook) {
            await fetch(slackWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🔄 Feature Flag Rollback: ${flag}`,
                    attachments: [
                        {
                            color: 'warning',
                            fields: [
                                { title: 'Flag', value: flag, short: true },
                                { title: 'Status', value: 'Rolled Back', short: true },
                                { title: 'Reason', value: reason, short: false },
                                {
                                    title: 'Result',
                                    value: JSON.stringify(result, null, 2),
                                    short: false,
                                },
                                {
                                    title: 'Timestamp',
                                    value: new Date().toISOString(),
                                    short: true,
                                },
                            ],
                        },
                    ],
                }),
            });
        }
    } catch (error) {
        logger.error('Failed to send rollback notification', error);
    }
}

function parseTimeRange(timeRange: string): number {
    const units: Record<string, number> = {
        m: 60000,
        h: 3600000,
        d: 86400000,
    };

    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) {
        return 3600000; // Default to 1 hour
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
}

function calculateAggregateMetrics(metricsData: any[]) {
    if (!metricsData || metricsData.length === 0) {
        return {
            count: 0,
            averages: {},
            totals: {},
        };
    }

    const aggregates: Record<string, number[]> = {};
    const totals: Record<string, number> = {};

    metricsData.forEach((record) => {
        const metrics = record.metrics;
        Object.keys(metrics).forEach((key) => {
            if (typeof metrics[key] === 'number') {
                if (!aggregates[key]) {
                    aggregates[key] = [];
                }
                aggregates[key].push(metrics[key]);
                totals[key] = (totals[key] || 0) + metrics[key];
            }
        });
    });

    const averages: Record<string, number> = {};
    Object.keys(aggregates).forEach((key) => {
        averages[key] =
            aggregates[key].reduce((a, b) => a + b, 0) / aggregates[key].length;
    });

    return {
        count: metricsData.length,
        averages,
        totals,
    };
}

function calculateFalseNegativeRate(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;

    let falseNegatives = 0;
    let total = 0;

    metrics.forEach((m) => {
        if (m.presence_detection) {
            total++;
            if (
                !m.presence_detection.damageDetected &&
                !m.yolo_skipped // If YOLO ran and found something
            ) {
                falseNegatives++;
            }
        }
    });

    return total > 0 ? (falseNegatives / total) * 100 : 0;
}

function calculateAvgInferenceTime(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;

    const times = metrics
        .filter((m) => m.inference_time_ms)
        .map((m) => m.inference_time_ms);

    return times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;
}

function getAllFlagsConfig() {
    return {
        [FeatureFlag.SAM3_PRESENCE_DETECTION]: featureFlags.getSAM3Config(),
        [FeatureFlag.YOLO_SKIP_OPTIMIZATION]: featureFlags.getFlag(
            FeatureFlag.YOLO_SKIP_OPTIMIZATION,
            false
        ),
        [FeatureFlag.HYBRID_INFERENCE]: featureFlags.getFlag(
            FeatureFlag.HYBRID_INFERENCE,
            true
        ),
        [FeatureFlag.INTERNAL_MODEL_PRIMARY]: featureFlags.getFlag(
            FeatureFlag.INTERNAL_MODEL_PRIMARY,
            false
        ),
        [FeatureFlag.DRIFT_DETECTION]: featureFlags.getFlag(
            FeatureFlag.DRIFT_DETECTION,
            true
        ),
        [FeatureFlag.AUTO_ROLLBACK]: featureFlags.getFlag(
            FeatureFlag.AUTO_ROLLBACK,
            true
        ),
    };
}