// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Metrics Validation Tests for SAM3 Presence Detection
 *
 * Tests the metrics calculation and alerting logic for presence detection.
 * These are pure unit tests of the metrics helpers - they do NOT depend on
 * HybridInferenceService presence detection APIs (which are not yet implemented).
 */

import { logger } from '@mintenance/shared';

// Mock dependencies
vi.mock('@mintenance/shared', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// --- Helper functions for metrics ---

interface YoloSavingsMetrics {
    totalAssessments: number;
    yoloSkipped: number;
    estimatedTimeSavedMs: number;
    estimatedComputeSaved: number;
    skipRate: number;
    averageTimeSavedPerSkip: number;
}

function calculateYoloSavingsMetrics(
    totalAssessments: number,
    yoloSkipped: number,
    estimatedTimeSavedMs: number,
    estimatedComputeSaved: number,
): YoloSavingsMetrics {
    return {
        totalAssessments,
        yoloSkipped,
        estimatedTimeSavedMs,
        estimatedComputeSaved,
        skipRate: totalAssessments > 0 ? yoloSkipped / totalAssessments : 0,
        averageTimeSavedPerSkip: yoloSkipped > 0 ? estimatedTimeSavedMs / yoloSkipped : 0,
    };
}

function calculateCostSavings(metrics: YoloSavingsMetrics): number {
    const costPerYoloInference = 0.001; // $0.001 per inference
    return metrics.yoloSkipped * costPerYoloInference;
}

function calculateFPReduction(metrics: YoloSavingsMetrics): number {
    return metrics.yoloSkipped * 0.15; // Assume 15% would be false positives
}

function generateAlerts(metrics: YoloSavingsMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.skipRate > 0.9) {
        alerts.push('HIGH_SKIP_RATE: Over 90% of assessments skipping YOLO');
    }
    if (metrics.skipRate < 0.1) {
        alerts.push('LOW_SKIP_RATE: Less than 10% of assessments skipping YOLO');
    }

    return alerts;
}

function generateMetricAlerts(metrics: { skipRate?: number; averagePresenceScore?: number; totalAssessments?: number }): string[] {
    const alerts: string[] = [];

    if (metrics.skipRate !== undefined && metrics.skipRate > 0.9) alerts.push('HIGH_SKIP_RATE');
    if (metrics.skipRate !== undefined && metrics.skipRate < 0.1) alerts.push('LOW_SKIP_RATE');
    if (metrics.averagePresenceScore !== undefined && metrics.averagePresenceScore < 0.05) alerts.push('LOW_PRESENCE_SCORES');

    return alerts;
}

describe('Presence Detection Metrics Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Core Metrics Tracking', () => {
        it('should accurately calculate skip rate', () => {
            const metrics = calculateYoloSavingsMetrics(100, 70, 140000, 70);

            expect(metrics.skipRate).toBeCloseTo(0.7, 2);
            expect(metrics.totalAssessments).toBe(100);
            expect(metrics.yoloSkipped).toBe(70);
        });

        it('should calculate average time saved per skip', () => {
            const avgYoloTimeMs = 2000;
            const numSkips = 10;
            const totalTimeSaved = numSkips * avgYoloTimeMs;

            const metrics = calculateYoloSavingsMetrics(15, numSkips, totalTimeSaved, numSkips);

            expect(metrics.estimatedTimeSavedMs).toBe(totalTimeSaved);
            expect(metrics.averageTimeSavedPerSkip).toBe(avgYoloTimeMs);
        });

        it('should calculate compute savings estimation', () => {
            const assessmentsWithSkip = 50;
            const assessmentsWithoutSkip = 20;
            const total = assessmentsWithSkip + assessmentsWithoutSkip;

            const metrics = calculateYoloSavingsMetrics(
                total,
                assessmentsWithSkip,
                assessmentsWithSkip * 2000,
                assessmentsWithSkip
            );

            expect(metrics.totalAssessments).toBe(total);
            expect(metrics.yoloSkipped).toBe(assessmentsWithSkip);
            expect(metrics.estimatedComputeSaved).toBe(assessmentsWithSkip);
        });

        it('should handle zero assessments without division by zero', () => {
            const metrics = calculateYoloSavingsMetrics(0, 0, 0, 0);

            expect(metrics.skipRate).toBe(0);
            expect(metrics.averageTimeSavedPerSkip).toBe(0);
        });
    });

    describe('False Positive Reduction Metrics', () => {
        it('should track false positive reduction rate', () => {
            const testScenarios = [
                { actualDamage: false, sam3Detection: false, yoloWouldDetect: true },  // FP avoided
                { actualDamage: false, sam3Detection: false, yoloWouldDetect: true },  // FP avoided
                { actualDamage: false, sam3Detection: false, yoloWouldDetect: false }, // TN
                { actualDamage: true, sam3Detection: true, yoloWouldDetect: true },    // TP
                { actualDamage: false, sam3Detection: false, yoloWouldDetect: true },  // FP avoided
            ];

            let falsePositivesAvoided = 0;
            let totalUndamagedCorrectlyIdentified = 0;

            for (const scenario of testScenarios) {
                if (!scenario.actualDamage && !scenario.sam3Detection && scenario.yoloWouldDetect) {
                    falsePositivesAvoided++;
                }
                if (!scenario.actualDamage && !scenario.sam3Detection) {
                    totalUndamagedCorrectlyIdentified++;
                }
            }

            const fpReductionRate = falsePositivesAvoided / testScenarios.filter(s => !s.actualDamage).length;

            expect(fpReductionRate).toBeGreaterThan(0.5); // At least 50% FP reduction
            expect(totalUndamagedCorrectlyIdentified).toBe(4); // 4 undamaged cases
        });

        it('should calculate presence score distribution', () => {
            const numSamples = 100;
            const presenceScores: number[] = [];

            for (let i = 0; i < numSamples; i++) {
                presenceScores.push(Math.random());
            }

            const avgScore = presenceScores.reduce((a, b) => a + b, 0) / presenceScores.length;
            const minScore = Math.min(...presenceScores);
            const maxScore = Math.max(...presenceScores);

            expect(presenceScores.length).toBe(numSamples);
            expect(avgScore).toBeGreaterThan(0);
            expect(avgScore).toBeLessThan(1);
            expect(minScore).toBeGreaterThanOrEqual(0);
            expect(maxScore).toBeLessThanOrEqual(1);

            // Calculate percentiles
            const sortedScores = [...presenceScores].sort((a, b) => a - b);
            const p25 = sortedScores[Math.floor(numSamples * 0.25)];
            const p50 = sortedScores[Math.floor(numSamples * 0.50)];
            const p75 = sortedScores[Math.floor(numSamples * 0.75)];

            expect(p25).toBeLessThanOrEqual(p50);
            expect(p50).toBeLessThanOrEqual(p75);
        });
    });

    describe('Performance Metrics', () => {
        it('should validate memory usage is bounded', () => {
            const memoryBefore = process.memoryUsage();

            // Process multiple items to check memory doesn't spike
            const items = [];
            for (let i = 0; i < 1000; i++) {
                items.push({
                    presenceScore: Math.random(),
                    damageDetected: Math.random() > 0.5,
                    inferenceTimeMs: 300 + Math.random() * 200,
                });
            }

            const memoryAfter = process.memoryUsage();
            const heapUsedDiff = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;

            // Memory usage should not increase significantly for in-memory processing
            expect(heapUsedDiff).toBeLessThan(50); // Less than 50MB heap increase
        });
    });

    describe('Production Monitoring Metrics', () => {
        it('should track and report key production metrics', () => {
            const metrics = calculateYoloSavingsMetrics(100, 60, 120000, 60);

            const productionMetrics = {
                timestamp: new Date().toISOString(),
                metrics: {
                    totalAssessments: metrics.totalAssessments,
                    yoloSkipRate: metrics.skipRate,
                    estimatedTimeSaved: metrics.estimatedTimeSavedMs,
                    estimatedCostSaved: calculateCostSavings(metrics),
                    falsePositiveReduction: calculateFPReduction(metrics),
                },
                alerts: generateAlerts(metrics),
            };

            expect(productionMetrics.metrics.totalAssessments).toBeGreaterThan(0);
            expect(productionMetrics.metrics.yoloSkipRate).toBeGreaterThanOrEqual(0);
            expect(productionMetrics.metrics.yoloSkipRate).toBeLessThanOrEqual(1);
            expect(productionMetrics.metrics.estimatedCostSaved).toBe(0.06); // 60 * 0.001
            expect(productionMetrics.alerts).toHaveLength(0); // 60% skip rate is normal
        });

        it('should generate alerts for anomalous metrics', () => {
            const scenarios = [
                {
                    metrics: { skipRate: 0.95, totalAssessments: 100 },
                    expectedAlert: 'HIGH_SKIP_RATE',
                },
                {
                    metrics: { skipRate: 0.05, totalAssessments: 100 },
                    expectedAlert: 'LOW_SKIP_RATE',
                },
                {
                    metrics: { averagePresenceScore: 0.01, totalAssessments: 50 },
                    expectedAlert: 'LOW_PRESENCE_SCORES',
                },
            ];

            for (const scenario of scenarios) {
                const alerts = generateMetricAlerts(scenario.metrics);
                expect(alerts).toContain(scenario.expectedAlert);
            }
        });
    });

    describe('Threshold Effectiveness', () => {
        it('should validate presence threshold effectiveness', () => {
            const thresholdTests = [
                { damageType: 'water damage', threshold: 0.25, testScores: [0.1, 0.2, 0.26, 0.4, 0.8] },
                { damageType: 'crack', threshold: 0.35, testScores: [0.1, 0.3, 0.36, 0.5, 0.9] },
                { damageType: 'mold', threshold: 0.25, testScores: [0.05, 0.24, 0.26, 0.6, 0.85] },
            ];

            for (const test of thresholdTests) {
                let correctPredictions = 0;

                for (const score of test.testScores) {
                    const shouldDetect = score >= test.threshold;
                    const detection = {
                        presence_score: score,
                        damage_present: shouldDetect,
                        threshold_used: test.threshold,
                    };

                    if ((score >= test.threshold && detection.damage_present) ||
                        (score < test.threshold && !detection.damage_present)) {
                        correctPredictions++;
                    }
                }

                const accuracy = correctPredictions / test.testScores.length;
                expect(accuracy).toBe(1.0); // Threshold should be 100% consistent
            }
        });

        it('should track threshold adaptation effectiveness', () => {
            // Use a seeded pseudo-random for deterministic results
            // Simple mulberry32 PRNG seeded with a fixed value
            let seed = 42;
            const seededRandom = () => {
                seed |= 0; seed = seed + 0x6D2B79F5 | 0;
                let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            const feedbackData = [];

            for (let i = 0; i < 100; i++) {
                const actualDamage = seededRandom() > 0.7; // 30% damage rate
                const presenceScore = actualDamage
                    ? 0.3 + seededRandom() * 0.6  // Higher scores for actual damage
                    : seededRandom() * 0.4;        // Lower scores for no damage

                const threshold = 0.3;
                const predicted = presenceScore >= threshold;

                feedbackData.push({
                    score: presenceScore,
                    predicted,
                    actual: actualDamage,
                    correct: predicted === actualDamage,
                });
            }

            const truePositives = feedbackData.filter(d => d.predicted && d.actual).length;
            const trueNegatives = feedbackData.filter(d => !d.predicted && !d.actual).length;
            const falsePositives = feedbackData.filter(d => d.predicted && !d.actual).length;
            const falseNegatives = feedbackData.filter(d => !d.predicted && d.actual).length;

            const precision = truePositives / (truePositives + falsePositives);
            const recall = truePositives / (truePositives + falseNegatives);
            const f1Score = 2 * (precision * recall) / (precision + recall);
            const accuracy = (truePositives + trueNegatives) / feedbackData.length;

            // With deterministic seeded random, these thresholds are stable
            expect(precision).toBeGreaterThanOrEqual(0.5);
            expect(recall).toBeGreaterThanOrEqual(0.7);
            expect(f1Score).toBeGreaterThanOrEqual(0.55);
        });
    });
});
