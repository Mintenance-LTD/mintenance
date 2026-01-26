/**
 * Model Drift Detection Service
 *
 * Monitors YOLO model performance degradation over time.
 * Detects when retraining is needed based on:
 * - Prediction confidence decline
 * - Disagreement with GPT-4 increases
 * - User feedback on accuracy
 * - Distribution shifts in input data
 *
 * Triggers alerts when drift exceeds thresholds.
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import type { DamageSeverity, UrgencyLevel } from '../building-surveyor/types';

interface DriftMetrics {
    avgConfidence: number;
    disagreementRate: number;
    userCorrectionRate: number;
    inputDistributionShift: number;
    performanceScore: number;
}

interface DriftAlert {
    severity: 'low' | 'medium' | 'high' | 'critical';
    metric: string;
    currentValue: number;
    threshold: number;
    recommendation: string;
    requiresAction: boolean;
}

interface ModelPerformanceSnapshot {
    modelVersion: string;
    timestamp: string;
    metrics: DriftMetrics;
    sampleCount: number;
    alerts: DriftAlert[];
}

export class ModelDriftDetectionService {
    private static readonly SERVICE_NAME = 'ModelDriftDetectionService';

    // Drift detection thresholds
    private static readonly THRESHOLDS = {
        confidence: {
            warning: 0.70,    // Below 70% confidence
            critical: 0.60,   // Below 60% confidence
        },
        disagreement: {
            warning: 0.30,    // 30% disagreement with GPT-4
            critical: 0.40,   // 40% disagreement
        },
        correction: {
            warning: 0.20,    // 20% user corrections
            critical: 0.30,   // 30% user corrections
        },
        distribution: {
            warning: 0.25,    // 25% distribution shift (KL divergence)
            critical: 0.40,   // 40% distribution shift
        },
    };

    // Baseline metrics for comparison
    private static baselineMetrics: DriftMetrics | null = null;
    private static readonly MONITORING_WINDOW_HOURS = 24;
    private static readonly MIN_SAMPLES_FOR_ALERT = 100;

    /**
     * Initialize baseline metrics from healthy model state
     */
    static async initializeBaseline(modelVersion: string): Promise<void> {
        try {
            // Get baseline from first 1000 predictions after deployment
            const { data: baseline, error } = await supabase
                .from('model_performance_baseline')
                .select('*')
                .eq('model_version', modelVersion)
                .single();

            if (error || !baseline) {
                logger.warn('No baseline found, creating from current metrics', {
                    service: this.SERVICE_NAME,
                    modelVersion,
                });
                await this.createBaselineFromCurrentMetrics(modelVersion);
            } else {
                this.baselineMetrics = baseline.metrics as DriftMetrics;
                logger.info('Baseline metrics loaded', {
                    service: this.SERVICE_NAME,
                    modelVersion,
                    baseline: this.baselineMetrics,
                });
            }
        } catch (error) {
            logger.error('Failed to initialize baseline', error, {
                service: this.SERVICE_NAME,
            });
        }
    }

    /**
     * Record model prediction for drift detection
     */
    static async recordPrediction(
        predictionId: string,
        modelVersion: string,
        confidence: number,
        prediction: {
            damageType: string;
            severity: DamageSeverity;
            urgency: UrgencyLevel;
        },
        gpt4Agreement?: boolean,
        imageFeatures?: number[]
    ): Promise<void> {
        try {
            await supabase.from('model_predictions_log').insert({
                prediction_id: predictionId,
                model_version: modelVersion,
                confidence,
                damage_type: prediction.damageType,
                severity: prediction.severity,
                urgency: prediction.urgency,
                gpt4_agreement: gpt4Agreement,
                image_features: imageFeatures,
                timestamp: new Date().toISOString(),
            });

            // Check for drift every 100 predictions
            const { count } = await supabase
                .from('model_predictions_log')
                .select('*', { count: 'exact', head: true })
                .eq('model_version', modelVersion);

            if (count && count % 100 === 0) {
                await this.checkForDrift(modelVersion);
            }
        } catch (error) {
            logger.error('Failed to record prediction', error, {
                service: this.SERVICE_NAME,
                predictionId,
            });
        }
    }

    /**
     * Record user feedback/correction
     */
    static async recordUserCorrection(
        predictionId: string,
        wasCorrect: boolean,
        actualSeverity?: DamageSeverity,
        actualUrgency?: UrgencyLevel,
        feedback?: string
    ): Promise<void> {
        try {
            await supabase.from('user_corrections').insert({
                prediction_id: predictionId,
                was_correct: wasCorrect,
                actual_severity: actualSeverity,
                actual_urgency: actualUrgency,
                feedback,
                timestamp: new Date().toISOString(),
            });

            logger.info('User correction recorded', {
                service: this.SERVICE_NAME,
                predictionId,
                wasCorrect,
            });
        } catch (error) {
            logger.error('Failed to record user correction', error, {
                service: this.SERVICE_NAME,
            });
        }
    }

    /**
     * Check for model drift
     */
    static async checkForDrift(modelVersion: string): Promise<ModelPerformanceSnapshot> {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - this.MONITORING_WINDOW_HOURS * 60 * 60 * 1000);

        try {
            // Get recent predictions
            const { data: predictions, error } = await supabase
                .from('model_predictions_log')
                .select('*')
                .eq('model_version', modelVersion)
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString());

            if (error || !predictions || predictions.length < this.MIN_SAMPLES_FOR_ALERT) {
                logger.debug('Insufficient data for drift detection', {
                    service: this.SERVICE_NAME,
                    sampleCount: predictions?.length || 0,
                });
                return this.createEmptySnapshot(modelVersion);
            }

            // Calculate current metrics
            const metrics = await this.calculateMetrics(predictions);

            // Detect drift and generate alerts
            const alerts = this.detectDrift(metrics);

            // Create performance snapshot
            const snapshot: ModelPerformanceSnapshot = {
                modelVersion,
                timestamp: new Date().toISOString(),
                metrics,
                sampleCount: predictions.length,
                alerts,
            };

            // Store snapshot
            await this.storeSnapshot(snapshot);

            // Trigger alerts if needed
            if (alerts.some(a => a.requiresAction)) {
                await this.triggerAlerts(snapshot);
            }

            return snapshot;
        } catch (error) {
            logger.error('Drift detection failed', error, {
                service: this.SERVICE_NAME,
            });
            throw error;
        }
    }

    /**
     * Calculate drift metrics from predictions
     */
    private static async calculateMetrics(predictions: unknown[]): Promise<DriftMetrics> {
        // Average confidence
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

        // Disagreement rate with GPT-4
        const withGPT4 = predictions.filter(p => p.gpt4_agreement !== null);
        const disagreementRate = withGPT4.length > 0
            ? withGPT4.filter(p => !p.gpt4_agreement).length / withGPT4.length
            : 0;

        // User correction rate
        const { data: corrections } = await supabase
            .from('user_corrections')
            .select('*')
            .in('prediction_id', predictions.map(p => p.prediction_id));

        const userCorrectionRate = corrections && corrections.length > 0
            ? corrections.filter(c => !c.was_correct).length / corrections.length
            : 0;

        // Input distribution shift (simplified KL divergence on damage types)
        const distributionShift = await this.calculateDistributionShift(predictions);

        // Overall performance score (weighted average)
        const performanceScore = this.calculatePerformanceScore({
            avgConfidence,
            disagreementRate,
            userCorrectionRate,
            inputDistributionShift: distributionShift,
            performanceScore: 0, // Will be calculated
        });

        return {
            avgConfidence,
            disagreementRate,
            userCorrectionRate,
            inputDistributionShift: distributionShift,
            performanceScore,
        };
    }

    /**
     * Calculate distribution shift using KL divergence
     */
    private static async calculateDistributionShift(predictions: unknown[]): Promise<number> {
        if (!this.baselineMetrics) return 0;

        // Get damage type distribution
        const currentDist = this.getDamageTypeDistribution(predictions);

        // Get baseline distribution
        const { data: baseline } = await supabase
            .from('model_performance_baseline')
            .select('damage_type_distribution')
            .single();

        if (!baseline) return 0;

        const baselineDist = baseline.damage_type_distribution as Record<string, number>;

        // Calculate KL divergence
        let klDivergence = 0;
        for (const damageType in currentDist) {
            const p = currentDist[damageType] || 0.001; // Avoid log(0)
            const q = baselineDist[damageType] || 0.001;
            klDivergence += p * Math.log(p / q);
        }

        return Math.abs(klDivergence);
    }

    /**
     * Get damage type distribution
     */
    private static getDamageTypeDistribution(predictions: unknown[]): Record<string, number> {
        const counts: Record<string, number> = {};
        const total = predictions.length;

        for (const pred of predictions) {
            counts[pred.damage_type] = (counts[pred.damage_type] || 0) + 1;
        }

        const distribution: Record<string, number> = {};
        for (const type in counts) {
            distribution[type] = counts[type] / total;
        }

        return distribution;
    }

    /**
     * Calculate overall performance score
     */
    private static calculatePerformanceScore(metrics: DriftMetrics): number {
        // Weighted scoring (higher is better)
        const weights = {
            confidence: 0.35,
            disagreement: 0.30,
            correction: 0.25,
            distribution: 0.10,
        };

        const score =
            metrics.avgConfidence * weights.confidence +
            (1 - metrics.disagreementRate) * weights.disagreement +
            (1 - metrics.userCorrectionRate) * weights.correction +
            (1 - Math.min(1, metrics.inputDistributionShift)) * weights.distribution;

        return Math.round(score * 100);
    }

    /**
     * Detect drift and generate alerts
     */
    private static detectDrift(metrics: DriftMetrics): DriftAlert[] {
        const alerts: DriftAlert[] = [];

        // Check confidence drift
        if (metrics.avgConfidence < this.THRESHOLDS.confidence.critical) {
            alerts.push({
                severity: 'critical',
                metric: 'confidence',
                currentValue: metrics.avgConfidence,
                threshold: this.THRESHOLDS.confidence.critical,
                recommendation: 'Immediate retraining required - model confidence critically low',
                requiresAction: true,
            });
        } else if (metrics.avgConfidence < this.THRESHOLDS.confidence.warning) {
            alerts.push({
                severity: 'medium',
                metric: 'confidence',
                currentValue: metrics.avgConfidence,
                threshold: this.THRESHOLDS.confidence.warning,
                recommendation: 'Schedule retraining - confidence declining',
                requiresAction: false,
            });
        }

        // Check disagreement rate
        if (metrics.disagreementRate > this.THRESHOLDS.disagreement.critical) {
            alerts.push({
                severity: 'high',
                metric: 'disagreement',
                currentValue: metrics.disagreementRate,
                threshold: this.THRESHOLDS.disagreement.critical,
                recommendation: 'High disagreement with GPT-4 - review training data',
                requiresAction: true,
            });
        } else if (metrics.disagreementRate > this.THRESHOLDS.disagreement.warning) {
            alerts.push({
                severity: 'medium',
                metric: 'disagreement',
                currentValue: metrics.disagreementRate,
                threshold: this.THRESHOLDS.disagreement.warning,
                recommendation: 'Increasing disagreement - monitor closely',
                requiresAction: false,
            });
        }

        // Check user corrections
        if (metrics.userCorrectionRate > this.THRESHOLDS.correction.critical) {
            alerts.push({
                severity: 'critical',
                metric: 'user_corrections',
                currentValue: metrics.userCorrectionRate,
                threshold: this.THRESHOLDS.correction.critical,
                recommendation: 'Users frequently correcting predictions - retrain with feedback',
                requiresAction: true,
            });
        }

        // Check distribution shift
        if (metrics.inputDistributionShift > this.THRESHOLDS.distribution.critical) {
            alerts.push({
                severity: 'high',
                metric: 'distribution_shift',
                currentValue: metrics.inputDistributionShift,
                threshold: this.THRESHOLDS.distribution.critical,
                recommendation: 'Significant data distribution shift - update training dataset',
                requiresAction: true,
            });
        }

        return alerts;
    }

    /**
     * Store performance snapshot
     */
    private static async storeSnapshot(snapshot: ModelPerformanceSnapshot): Promise<void> {
        try {
            await supabase.from('model_performance_snapshots').insert({
                model_version: snapshot.modelVersion,
                timestamp: snapshot.timestamp,
                metrics: snapshot.metrics,
                sample_count: snapshot.sampleCount,
                alerts: snapshot.alerts,
                performance_score: snapshot.metrics.performanceScore,
            });
        } catch (error) {
            logger.error('Failed to store snapshot', error, {
                service: this.SERVICE_NAME,
            });
        }
    }

    /**
     * Trigger alerts for critical drift
     */
    private static async triggerAlerts(snapshot: ModelPerformanceSnapshot): Promise<void> {
        const criticalAlerts = snapshot.alerts.filter(a => a.severity === 'critical');
        const highAlerts = snapshot.alerts.filter(a => a.severity === 'high');

        if (criticalAlerts.length > 0) {
            logger.error('CRITICAL MODEL DRIFT DETECTED', {
                service: this.SERVICE_NAME,
                modelVersion: snapshot.modelVersion,
                alerts: criticalAlerts,
                performanceScore: snapshot.metrics.performanceScore,
            });

            // Send notification (email, Slack, etc.)
            await this.sendDriftNotification('critical', snapshot);

            // Optionally switch to GPT-4 only mode
            if (snapshot.metrics.performanceScore < 50) {
                await this.recommendFallbackToGPT4();
            }
        } else if (highAlerts.length > 0) {
            logger.warn('High model drift detected', {
                service: this.SERVICE_NAME,
                modelVersion: snapshot.modelVersion,
                alerts: highAlerts,
            });

            await this.sendDriftNotification('high', snapshot);
        }
    }

    /**
     * Send drift notification
     */
    private static async sendDriftNotification(
        severity: string,
        snapshot: ModelPerformanceSnapshot
    ): Promise<void> {
        // Store notification in database
        await supabase.from('drift_notifications').insert({
            severity,
            model_version: snapshot.modelVersion,
            performance_score: snapshot.metrics.performanceScore,
            alerts: snapshot.alerts,
            timestamp: new Date().toISOString(),
            sent: true,
        });

        // In production, integrate with notification service (email, Slack, PagerDuty, etc.)
        logger.info('Drift notification sent', {
            service: this.SERVICE_NAME,
            severity,
            performanceScore: snapshot.metrics.performanceScore,
        });
    }

    /**
     * Recommend fallback to GPT-4
     */
    private static async recommendFallbackToGPT4(): Promise<void> {
        logger.error('RECOMMENDING FALLBACK TO GPT-4 DUE TO CRITICAL DRIFT', {
            service: this.SERVICE_NAME,
        });

        // Update configuration to disable internal model
        await supabase.from('system_config').upsert({
            key: 'use_internal_model',
            value: false,
            reason: 'Critical model drift detected',
            updated_at: new Date().toISOString(),
        });
    }

    /**
     * Create baseline from current metrics
     */
    private static async createBaselineFromCurrentMetrics(modelVersion: string): Promise<void> {
        const snapshot = await this.checkForDrift(modelVersion);

        if (snapshot.sampleCount >= this.MIN_SAMPLES_FOR_ALERT) {
            this.baselineMetrics = snapshot.metrics;

            await supabase.from('model_performance_baseline').insert({
                model_version: modelVersion,
                metrics: snapshot.metrics,
                sample_count: snapshot.sampleCount,
                created_at: new Date().toISOString(),
            });

            logger.info('Baseline created from current metrics', {
                service: this.SERVICE_NAME,
                modelVersion,
                metrics: snapshot.metrics,
            });
        }
    }

    /**
     * Create empty snapshot
     */
    private static createEmptySnapshot(modelVersion: string): ModelPerformanceSnapshot {
        return {
            modelVersion,
            timestamp: new Date().toISOString(),
            metrics: {
                avgConfidence: 1.0,
                disagreementRate: 0,
                userCorrectionRate: 0,
                inputDistributionShift: 0,
                performanceScore: 100,
            },
            sampleCount: 0,
            alerts: [],
        };
    }

    /**
     * Get drift trend over time
     */
    static async getDriftTrend(
        modelVersion: string,
        days: number = 7
    ): Promise<ModelPerformanceSnapshot[]> {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        try {
            const { data: snapshots, error } = await supabase
                .from('model_performance_snapshots')
                .select('*')
                .eq('model_version', modelVersion)
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString())
                .order('timestamp', { ascending: true });

            if (error) throw error;

            return snapshots as ModelPerformanceSnapshot[];
        } catch (error) {
            logger.error('Failed to get drift trend', error, {
                service: this.SERVICE_NAME,
            });
            return [];
        }
    }

    /**
     * Get current model health status
     */
    static async getModelHealth(modelVersion: string): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        score: number;
        metrics: DriftMetrics | null;
        recommendations: string[];
    }> {
        try {
            const snapshot = await this.checkForDrift(modelVersion);

            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (snapshot.alerts.some(a => a.severity === 'critical')) {
                status = 'critical';
            } else if (snapshot.alerts.some(a => a.severity === 'high' || a.severity === 'medium')) {
                status = 'warning';
            }

            return {
                status,
                score: snapshot.metrics.performanceScore,
                metrics: snapshot.metrics,
                recommendations: snapshot.alerts.map(a => a.recommendation),
            };
        } catch (error) {
            logger.error('Failed to get model health', error, {
                service: this.SERVICE_NAME,
            });
            return {
                status: 'warning',
                score: 0,
                metrics: null,
                recommendations: ['Unable to determine model health'],
            };
        }
    }
}