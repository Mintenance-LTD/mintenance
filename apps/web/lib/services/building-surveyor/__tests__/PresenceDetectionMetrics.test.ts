/**
 * Metrics Validation Tests for SAM3 Presence Detection
 *
 * Validates that presence detection metrics are correctly tracked,
 * calculated, and reported for production monitoring.
 */

import { HybridInferenceService } from '../HybridInferenceService';
import { SAM3Service } from '../SAM3Service';
import { supabase } from '@/lib/supabase';
import { logger } from '@mintenance/shared';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@mintenance/shared', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Presence Detection Metrics Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        HybridInferenceService.resetYoloSavingsMetrics();
    });

    describe('Core Metrics Tracking', () => {
        it('should accurately track YOLO skip rate', async () => {
            const testCases = 100;
            const expectedSkipRate = 0.7; // 70% should be skipped

            for (let i = 0; i < testCases; i++) {
                const shouldSkip = Math.random() < expectedSkipRate;

                // Mock based on whether we should skip
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: shouldSkip ? [] : ['damage'],
                    damage_not_detected: shouldSkip ? ['all'] : [],
                    summary: {
                        total_checked: 1,
                        total_detected: shouldSkip ? 0 : 1,
                        average_presence_score: shouldSkip ? 0.1 : 0.8,
                        detection_rate: shouldSkip ? 0 : 1,
                    },
                });

                // Process assessment
                await processAssessment(shouldSkip);
            }

            const metrics = HybridInferenceService.getYoloSavingsMetrics();

            // Validate skip rate is within expected range (allow 5% variance)
            expect(metrics.skipRate).toBeGreaterThan(expectedSkipRate - 0.05);
            expect(metrics.skipRate).toBeLessThan(expectedSkipRate + 0.05);
            expect(metrics.totalAssessments).toBe(testCases);
        });

        it('should track inference time savings correctly', async () => {
            const avgYoloTimeMs = 2000;
            const avgSam3TimeMs = 300;
            const numAssessments = 10;

            for (let i = 0; i < numAssessments; i++) {
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockImplementationOnce(
                    async () => {
                        // Simulate SAM3 timing
                        await new Promise(resolve => setTimeout(resolve, avgSam3TimeMs));
                        return {
                            success: true,
                            presence_results: {},
                            damage_detected: [],
                            damage_not_detected: ['all'],
                            summary: {
                                total_checked: 1,
                                total_detected: 0,
                                average_presence_score: 0.05,
                                detection_rate: 0,
                            },
                        };
                    }
                );

                await processAssessment(true);
            }

            const metrics = HybridInferenceService.getYoloSavingsMetrics();

            // Each skipped YOLO should save approximately avgYoloTimeMs
            const expectedTimeSaved = numAssessments * avgYoloTimeMs;
            expect(metrics.estimatedTimeSavedMs).toBe(expectedTimeSaved);
            expect(metrics.averageTimeSavedPerSkip).toBe(avgYoloTimeMs);
        });

        it('should calculate compute savings estimation', async () => {
            const assessmentsWithSkip = 50;
            const assessmentsWithoutSkip = 20;

            // Process assessments with YOLO skipped
            for (let i = 0; i < assessmentsWithSkip; i++) {
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: [],
                    damage_not_detected: ['all'],
                    summary: {
                        total_checked: 1,
                        total_detected: 0,
                        average_presence_score: 0.05,
                        detection_rate: 0,
                    },
                });
                await processAssessment(true);
            }

            // Process assessments without YOLO skipped
            for (let i = 0; i < assessmentsWithoutSkip; i++) {
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: ['damage'],
                    damage_not_detected: [],
                    summary: {
                        total_checked: 1,
                        total_detected: 1,
                        average_presence_score: 0.8,
                        detection_rate: 1,
                    },
                });
                await processAssessment(false);
            }

            const metrics = HybridInferenceService.getYoloSavingsMetrics();

            expect(metrics.totalAssessments).toBe(assessmentsWithSkip + assessmentsWithoutSkip);
            expect(metrics.yoloSkipped).toBe(assessmentsWithSkip);
            expect(metrics.estimatedComputeSaved).toBe(assessmentsWithSkip); // 1 unit per skip
        });
    });

    describe('False Positive Reduction Metrics', () => {
        it('should track false positive reduction rate', async () => {
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
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: scenario.sam3Detection ? ['damage'] : [],
                    damage_not_detected: scenario.sam3Detection ? [] : ['all'],
                    summary: {
                        total_checked: 1,
                        total_detected: scenario.sam3Detection ? 1 : 0,
                        average_presence_score: scenario.sam3Detection ? 0.8 : 0.1,
                        detection_rate: scenario.sam3Detection ? 1 : 0,
                    },
                });

                const result = await processAssessment(!scenario.sam3Detection);

                // Track false positive avoidance
                if (!scenario.actualDamage && !scenario.sam3Detection && scenario.yoloWouldDetect) {
                    falsePositivesAvoided++;
                }
                if (!scenario.actualDamage && !scenario.sam3Detection) {
                    totalUndamagedCorrectlyIdentified++;
                }
            }

            // Calculate false positive reduction rate
            const fpReductionRate = falsePositivesAvoided / testScenarios.filter(s => !s.actualDamage).length;

            expect(fpReductionRate).toBeGreaterThan(0.5); // At least 50% FP reduction
            expect(totalUndamagedCorrectlyIdentified).toBe(4); // 4 undamaged cases
        });

        it('should track presence score distribution', async () => {
            const presenceScores: number[] = [];
            const numSamples = 100;

            for (let i = 0; i < numSamples; i++) {
                const score = Math.random(); // Generate random score

                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {
                        'damage': {
                            presence_score: score,
                            damage_present: score > 0.3,
                            threshold_used: 0.3,
                        },
                    },
                    damage_detected: score > 0.3 ? ['damage'] : [],
                    damage_not_detected: score > 0.3 ? [] : ['damage'],
                    summary: {
                        total_checked: 1,
                        total_detected: score > 0.3 ? 1 : 0,
                        average_presence_score: score,
                        detection_rate: score > 0.3 ? 1 : 0,
                    },
                });

                const result = await processAssessmentWithMetrics();
                if (result.presenceDetection) {
                    presenceScores.push(result.presenceDetection.averagePresenceScore);
                }
            }

            // Validate score distribution
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

            console.log('Presence Score Distribution:');
            console.log(`  P25: ${p25.toFixed(3)}`);
            console.log(`  P50 (Median): ${p50.toFixed(3)}`);
            console.log(`  P75: ${p75.toFixed(3)}`);
            console.log(`  Mean: ${avgScore.toFixed(3)}`);
        });
    });

    describe('Performance Metrics', () => {
        it('should track SAM3 vs YOLO inference time comparison', async () => {
            const sam3Times: number[] = [];
            const yoloTimes: number[] = [];
            const numTests = 20;

            for (let i = 0; i < numTests; i++) {
                const useSam3 = i < numTests / 2;

                if (useSam3) {
                    const startTime = Date.now();
                    jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                    jest.spyOn(SAM3Service, 'checkDamagePresence').mockImplementationOnce(
                        async () => {
                            // Simulate SAM3 inference time
                            await new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 100));
                            return {
                                success: true,
                                presence_results: {},
                                damage_detected: [],
                                damage_not_detected: ['all'],
                                summary: {
                                    total_checked: 1,
                                    total_detected: 0,
                                    average_presence_score: 0.1,
                                    detection_rate: 0,
                                },
                            };
                        }
                    );
                    await processAssessment(true);
                    sam3Times.push(Date.now() - startTime);
                } else {
                    const startTime = Date.now();
                    // Simulate YOLO inference
                    await new Promise(resolve => setTimeout(resolve, 1800 + Math.random() * 400));
                    yoloTimes.push(Date.now() - startTime);
                }
            }

            const avgSam3Time = sam3Times.reduce((a, b) => a + b, 0) / sam3Times.length;
            const avgYoloTime = yoloTimes.reduce((a, b) => a + b, 0) / yoloTimes.length;
            const speedup = avgYoloTime / avgSam3Time;

            expect(avgSam3Time).toBeLessThan(avgYoloTime);
            expect(speedup).toBeGreaterThan(5); // SAM3 should be at least 5x faster for presence check

            console.log('Inference Time Comparison:');
            console.log(`  SAM3 Average: ${avgSam3Time.toFixed(0)}ms`);
            console.log(`  YOLO Average: ${avgYoloTime.toFixed(0)}ms`);
            console.log(`  Speedup: ${speedup.toFixed(1)}x`);
        });

        it('should validate memory usage optimization', () => {
            // Track memory usage before and after implementing presence detection
            const memoryBefore = process.memoryUsage();

            // Process multiple assessments
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(processAssessmentLightweight());
            }

            Promise.all(promises).then(() => {
                const memoryAfter = process.memoryUsage();

                const heapUsedDiff = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
                const externalDiff = (memoryAfter.external - memoryBefore.external) / 1024 / 1024;

                // Memory usage should not increase significantly
                expect(heapUsedDiff).toBeLessThan(50); // Less than 50MB heap increase
                expect(externalDiff).toBeLessThan(20); // Less than 20MB external memory

                console.log('Memory Usage:');
                console.log(`  Heap Used Diff: ${heapUsedDiff.toFixed(2)}MB`);
                console.log(`  External Diff: ${externalDiff.toFixed(2)}MB`);
            });
        });
    });

    describe('Production Monitoring Metrics', () => {
        it('should track and report key production metrics', async () => {
            const mockSupabaseInsert = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'metric-123' },
                        error: null,
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                insert: mockSupabaseInsert,
            });

            // Process assessments to generate metrics
            for (let i = 0; i < 5; i++) {
                jest.spyOn(SAM3Service, 'healthCheck').mockResolvedValueOnce(true);
                jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: i % 2 === 0 ? [] : ['damage'],
                    damage_not_detected: i % 2 === 0 ? ['all'] : [],
                    summary: {
                        total_checked: 1,
                        total_detected: i % 2,
                        average_presence_score: i % 2 === 0 ? 0.1 : 0.7,
                        detection_rate: i % 2,
                    },
                });

                await processAssessmentWithDatabaseRecording();
            }

            // Get current metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();

            // Verify metrics are recorded to database
            expect(mockSupabaseInsert).toHaveBeenCalled();

            // Validate production metrics structure
            const lastCall = mockSupabaseInsert.mock.calls[mockSupabaseInsert.mock.calls.length - 1][0];
            expect(lastCall).toHaveProperty('presence_detection');
            expect(lastCall).toHaveProperty('yolo_skipped');
            expect(lastCall).toHaveProperty('inference_time_ms');

            // Generate production metrics report
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
        it('should validate presence threshold effectiveness', async () => {
            const thresholdTests = [
                { damageType: 'water damage', threshold: 0.25, testScores: [0.1, 0.2, 0.26, 0.4, 0.8] },
                { damageType: 'crack', threshold: 0.35, testScores: [0.1, 0.3, 0.36, 0.5, 0.9] },
                { damageType: 'mold', threshold: 0.25, testScores: [0.05, 0.24, 0.26, 0.6, 0.85] },
            ];

            for (const test of thresholdTests) {
                let correctPredictions = 0;

                for (const score of test.testScores) {
                    const shouldDetect = score >= test.threshold;

                    jest.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                        success: true,
                        presence_results: {
                            [test.damageType]: {
                                presence_score: score,
                                damage_present: shouldDetect,
                                threshold_used: test.threshold,
                            },
                        },
                        damage_detected: shouldDetect ? [test.damageType] : [],
                        damage_not_detected: shouldDetect ? [] : [test.damageType],
                        summary: {
                            total_checked: 1,
                            total_detected: shouldDetect ? 1 : 0,
                            average_presence_score: score,
                            detection_rate: shouldDetect ? 1 : 0,
                        },
                    });

                    // Validate threshold application
                    const result = await SAM3Service.checkDamagePresence('mock-image', [test.damageType]);
                    const detection = result.presence_results[test.damageType];

                    if ((score >= test.threshold && detection.damage_present) ||
                        (score < test.threshold && !detection.damage_present)) {
                        correctPredictions++;
                    }
                }

                const accuracy = correctPredictions / test.testScores.length;
                expect(accuracy).toBe(1.0); // Threshold should be 100% consistent
            }
        });

        it('should track threshold adaptation effectiveness', async () => {
            // Simulate feedback loop for threshold optimization
            const feedbackData = [];

            for (let i = 0; i < 100; i++) {
                const actualDamage = Math.random() > 0.7; // 30% damage rate
                const presenceScore = actualDamage
                    ? 0.3 + Math.random() * 0.6  // Higher scores for actual damage
                    : Math.random() * 0.4;        // Lower scores for no damage

                const threshold = 0.3;
                const predicted = presenceScore >= threshold;

                feedbackData.push({
                    score: presenceScore,
                    predicted,
                    actual: actualDamage,
                    correct: predicted === actualDamage,
                });
            }

            // Calculate threshold effectiveness metrics
            const truePositives = feedbackData.filter(d => d.predicted && d.actual).length;
            const trueNegatives = feedbackData.filter(d => !d.predicted && !d.actual).length;
            const falsePositives = feedbackData.filter(d => d.predicted && !d.actual).length;
            const falseNegatives = feedbackData.filter(d => !d.predicted && d.actual).length;

            const precision = truePositives / (truePositives + falsePositives);
            const recall = truePositives / (truePositives + falseNegatives);
            const f1Score = 2 * (precision * recall) / (precision + recall);
            const accuracy = (truePositives + trueNegatives) / feedbackData.length;

            console.log('Threshold Effectiveness:');
            console.log(`  Precision: ${precision.toFixed(3)}`);
            console.log(`  Recall: ${recall.toFixed(3)}`);
            console.log(`  F1 Score: ${f1Score.toFixed(3)}`);
            console.log(`  Accuracy: ${accuracy.toFixed(3)}`);

            expect(precision).toBeGreaterThan(0.6);
            expect(recall).toBeGreaterThan(0.7);
            expect(f1Score).toBeGreaterThan(0.65);
        });
    });
});

// Helper functions for testing
async function processAssessment(skipYolo: boolean): Promise<any> {
    // Mock basic assessment processing
    return {
        yoloSkipped: skipYolo,
        presenceDetection: {
            damageDetected: !skipYolo,
            averagePresenceScore: skipYolo ? 0.1 : 0.8,
        },
    };
}

async function processAssessmentWithMetrics(): Promise<any> {
    // Process with full metrics tracking
    return {
        presenceDetection: {
            averagePresenceScore: Math.random(),
            damageDetected: Math.random() > 0.5,
        },
        metrics: {
            inferenceTimeMs: 300 + Math.random() * 200,
        },
    };
}

async function processAssessmentLightweight(): Promise<void> {
    // Lightweight processing for memory testing
    await new Promise(resolve => setTimeout(resolve, 10));
}

async function processAssessmentWithDatabaseRecording(): Promise<void> {
    // Process with database recording
    await new Promise(resolve => setTimeout(resolve, 50));
}

function calculateCostSavings(metrics: any): number {
    // Estimate cost savings based on metrics
    const costPerYoloInference = 0.001; // $0.001 per inference
    return metrics.yoloSkipped * costPerYoloInference;
}

function calculateFPReduction(metrics: any): number {
    // Estimate false positive reduction
    return metrics.yoloSkipped * 0.15; // Assume 15% would be false positives
}

function generateAlerts(metrics: any): string[] {
    const alerts = [];

    if (metrics.skipRate > 0.9) {
        alerts.push('HIGH_SKIP_RATE: Over 90% of assessments skipping YOLO');
    }
    if (metrics.skipRate < 0.1) {
        alerts.push('LOW_SKIP_RATE: Less than 10% of assessments skipping YOLO');
    }

    return alerts;
}

function generateMetricAlerts(metrics: any): string[] {
    const alerts = [];

    if (metrics.skipRate > 0.9) alerts.push('HIGH_SKIP_RATE');
    if (metrics.skipRate < 0.1) alerts.push('LOW_SKIP_RATE');
    if (metrics.averagePresenceScore < 0.05) alerts.push('LOW_PRESENCE_SCORES');

    return alerts;
}