import { vi } from 'vitest';
/**
 * SAM3 Presence Detection Integration Tests
 *
 * Tests the complete flow of presence detection to reduce false positives.
 * Validates the integration between HybridInferenceService, SAM3Service, and YOLO.
 */

import { HybridInferenceService } from '../HybridInferenceService';
import { SAM3Service } from '../SAM3Service';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { supabase } from '@/lib/supabase';
import { logger } from '@mintenance/shared';
import { readFile } from 'fs/promises';
import path from 'path';

// Mock external dependencies
vi.mock('@/lib/supabase');
vi.mock('@mintenance/shared', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Test data paths
const TEST_DATA_DIR = path.join(__dirname, '../test-data');
const DAMAGED_IMAGES = path.join(TEST_DATA_DIR, 'damaged');
const UNDAMAGED_IMAGES = path.join(TEST_DATA_DIR, 'undamaged');
const BORDERLINE_IMAGES = path.join(TEST_DATA_DIR, 'borderline');

describe('SAM3 Presence Detection Integration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
        // Enable SAM3 for tests
        process.env.SAM3_SERVICE_URL = 'http://localhost:8001';
        process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
        process.env.SAM3_TIMEOUT_MS = '30000';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        HybridInferenceService.resetYoloSavingsMetrics();
    });

    describe('False Positive Reduction', () => {
        it('should correctly identify undamaged images and skip YOLO', async () => {
            // Load test images
            const testImages = [
                'https://test.com/undamaged/clean-wall.jpg',
                'https://test.com/undamaged/pristine-roof.jpg',
                'https://test.com/undamaged/new-floor.jpg',
            ];

            // Setup mocks for undamaged detection
            const mockHealthCheck = vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            const mockPresenceCheck = vi.spyOn(SAM3Service, 'checkDamagePresence').mockImplementation(
                async (imageBase64: string, damageTypes?: string[]) => ({
                    success: true,
                    presence_results: {
                        'water damage': {
                            presence_score: 0.05,
                            damage_present: false,
                            threshold_used: 0.25,
                        },
                        'crack': {
                            presence_score: 0.08,
                            damage_present: false,
                            threshold_used: 0.35,
                        },
                        'rot': {
                            presence_score: 0.02,
                            damage_present: false,
                            threshold_used: 0.30,
                        },
                        'mold': {
                            presence_score: 0.01,
                            damage_present: false,
                            threshold_used: 0.25,
                        },
                    },
                    damage_detected: [],
                    damage_not_detected: ['water damage', 'crack', 'rot', 'mold'],
                    summary: {
                        total_checked: 4,
                        total_detected: 0,
                        average_presence_score: 0.04,
                        detection_rate: 0,
                    },
                })
            );

            // Mock YOLO (should not be called)
            const mockYoloDetect = vi.spyOn(RoboflowDetectionService, 'detect');
            const mockInternalPredict = vi.spyOn(InternalDamageClassifier, 'predictFromImage');

            // Mock model readiness
            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'none',
                severity: 'early',
                confidence: 0.90,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            // Process each image
            const results = [];
            for (const imageUrl of testImages) {
                const result = await HybridInferenceService.assessDamage(
                    [imageUrl],
                    { location: 'Test Area', propertyType: 'residential' }
                );
                results.push(result);
            }

            // Assertions
            expect(mockPresenceCheck).toHaveBeenCalledTimes(3);
            expect(mockYoloDetect).not.toHaveBeenCalled();
            expect(mockInternalPredict).not.toHaveBeenCalled();

            // All results should indicate no damage
            results.forEach(result => {
                expect(result.yoloSkipped).toBe(true);
                expect(result.presenceDetection?.damageDetected).toBe(false);
                expect(result.assessment.damageAssessment.damageType).toBe('None');
                expect(result.assessment.damageAssessment.confidence).toBeGreaterThan(90);
            });

            // Check metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(3);
            expect(metrics.yoloSkipped).toBe(3);
            expect(metrics.skipRate).toBe(1.0); // 100% skip rate
            expect(metrics.estimatedTimeSavedMs).toBeGreaterThan(0);
        });

        it('should correctly identify damaged images and proceed with YOLO', async () => {
            const testImages = [
                'https://test.com/damaged/water-damage.jpg',
                'https://test.com/damaged/cracked-wall.jpg',
                'https://test.com/damaged/mold-ceiling.jpg',
            ];

            // Setup mocks for damage detection
            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(SAM3Service, 'checkDamagePresence').mockImplementation(
                async () => ({
                    success: true,
                    presence_results: {
                        'water damage': {
                            presence_score: 0.85,
                            damage_present: true,
                            threshold_used: 0.25,
                        },
                        'crack': {
                            presence_score: 0.72,
                            damage_present: true,
                            threshold_used: 0.35,
                        },
                    },
                    damage_detected: ['water damage', 'crack'],
                    damage_not_detected: ['rot', 'mold'],
                    summary: {
                        total_checked: 4,
                        total_detected: 2,
                        average_presence_score: 0.645,
                        detection_rate: 0.5,
                    },
                })
            );

            // Mock YOLO (should be called)
            const mockYoloDetect = vi.spyOn(RoboflowDetectionService, 'detect').mockResolvedValue([
                {
                    x: 100, y: 100, width: 200, height: 150,
                    confidence: 0.89,
                    class: 'water_damage',
                    class_id: 1,
                    detection_id: 'det_1',
                },
            ]);

            const mockInternalPredict = vi.spyOn(InternalDamageClassifier, 'predictFromImage')
                .mockResolvedValue({
                    damageType: 'water damage',
                    severity: 'midway',
                    confidence: 0.85,
                    safetyHazards: ['structural weakness'],
                    urgency: 'urgent',
                    features: [],
                });

            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'water damage',
                severity: 'midway',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'urgent',
                features: [],
            });

            // Process images
            const results = [];
            for (const imageUrl of testImages) {
                const result = await HybridInferenceService.assessDamage(
                    [imageUrl],
                    { location: 'Basement', propertyType: 'residential' }
                );
                results.push(result);
            }

            // Assertions
            expect(mockYoloDetect).toHaveBeenCalledTimes(3);
            expect(mockInternalPredict).toHaveBeenCalledTimes(3);

            results.forEach(result => {
                expect(result.yoloSkipped).toBe(false);
                expect(result.presenceDetection?.damageDetected).toBe(true);
                expect(result.assessment.damageAssessment.damageType).not.toBe('None');
            });

            // Check metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(3);
            expect(metrics.yoloSkipped).toBe(0);
            expect(metrics.skipRate).toBe(0);
        });
    });

    describe('Borderline Cases', () => {
        it('should handle borderline damage cases appropriately', async () => {
            // Test images with presence scores near threshold
            const borderlineCases = [
                { score: 0.28, threshold: 0.25, expected: true },  // Just above threshold
                { score: 0.23, threshold: 0.25, expected: false }, // Just below threshold
                { score: 0.35, threshold: 0.35, expected: true },  // Exactly at threshold
            ];

            for (const testCase of borderlineCases) {
                vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
                vi.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {
                        'water damage': {
                            presence_score: testCase.score,
                            damage_present: testCase.expected,
                            threshold_used: testCase.threshold,
                        },
                    },
                    damage_detected: testCase.expected ? ['water damage'] : [],
                    damage_not_detected: testCase.expected ? [] : ['water damage'],
                    summary: {
                        total_checked: 1,
                        total_detected: testCase.expected ? 1 : 0,
                        average_presence_score: testCase.score,
                        detection_rate: testCase.expected ? 1.0 : 0.0,
                    },
                });

                if (testCase.expected) {
                    vi.spyOn(InternalDamageClassifier, 'predictFromImage').mockResolvedValueOnce({
                        damageType: 'water damage',
                        severity: 'early',
                        confidence: 0.65,
                        safetyHazards: [],
                        urgency: 'planned',
                        features: [],
                    });
                }

                vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
                vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                    damageType: 'water damage',
                    severity: 'early',
                    confidence: 0.85,
                    safetyHazards: [],
                    urgency: 'monitor',
                    features: [],
                });

                const result = await HybridInferenceService.assessDamage(
                    ['https://test.com/borderline.jpg'],
                    { location: 'Test' }
                );

                expect(result.yoloSkipped).toBe(!testCase.expected);
                expect(result.presenceDetection?.damageDetected).toBe(testCase.expected);
            }
        });

        it('should handle unclear/blurry images gracefully', async () => {
            // Mock unclear image detection (low confidence scores)
            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValue({
                success: true,
                presence_results: {
                    'water damage': {
                        presence_score: 0.15, // Low score due to unclear image
                        damage_present: false,
                        threshold_used: 0.25,
                        error: 'Image quality may affect detection accuracy',
                    },
                },
                damage_detected: [],
                damage_not_detected: ['water damage'],
                summary: {
                    total_checked: 1,
                    total_detected: 0,
                    average_presence_score: 0.15,
                    detection_rate: 0,
                },
            });

            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'unknown',
                severity: 'early',
                confidence: 0.45, // Low confidence
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://test.com/blurry-image.jpg'],
                { location: 'Unclear area' }
            );

            // Should err on the side of caution and use GPT-4 for unclear images
            expect(result.route).toBe('gpt4_vision');
            expect(result.confidence).toBeLessThan(0.55); // Below medium threshold
        });
    });

    describe('Performance Metrics', () => {
        it('should track inference time savings accurately', async () => {
            const startTime = Date.now();

            // Mock fast SAM3 response (simulating 300ms)
            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(SAM3Service, 'checkDamagePresence').mockImplementation(
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 300));
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

            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'none',
                severity: 'early',
                confidence: 0.90,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://test.com/test.jpg'],
                { location: 'Test' }
            );

            const elapsedTime = Date.now() - startTime;

            expect(result.yoloSkipped).toBe(true);
            expect(result.inferenceTimeMs).toBeLessThan(500); // Much faster than YOLO
            expect(result.presenceDetection?.presenceCheckMs).toBeLessThanOrEqual(elapsedTime);

            // Verify metrics tracking
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.estimatedTimeSavedMs).toBeGreaterThan(0);
        });

        it('should calculate skip rate correctly over multiple assessments', async () => {
            const assessmentScenarios = [
                { damagePresent: false }, // Skip
                { damagePresent: false }, // Skip
                { damagePresent: true },  // No skip
                { damagePresent: false }, // Skip
                { damagePresent: true },  // No skip
                { damagePresent: false }, // Skip
                { damagePresent: false }, // Skip
                { damagePresent: true },  // No skip
            ];

            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'none',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            for (const scenario of assessmentScenarios) {
                vi.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValueOnce({
                    success: true,
                    presence_results: {},
                    damage_detected: scenario.damagePresent ? ['damage'] : [],
                    damage_not_detected: scenario.damagePresent ? [] : ['damage'],
                    summary: {
                        total_checked: 1,
                        total_detected: scenario.damagePresent ? 1 : 0,
                        average_presence_score: scenario.damagePresent ? 0.8 : 0.1,
                        detection_rate: scenario.damagePresent ? 1.0 : 0.0,
                    },
                });

                if (scenario.damagePresent) {
                    vi.spyOn(InternalDamageClassifier, 'predictFromImage').mockResolvedValueOnce({
                        damageType: 'water damage',
                        severity: 'midway',
                        confidence: 0.75,
                        safetyHazards: [],
                        urgency: 'urgent',
                        features: [],
                    });
                }

                await HybridInferenceService.assessDamage(
                    ['https://test.com/test.jpg'],
                    { location: 'Test' }
                );
            }

            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(8);
            expect(metrics.yoloSkipped).toBe(5);
            expect(metrics.skipRate).toBeCloseTo(0.625, 3); // 5/8 = 0.625
        });
    });

    describe('Fallback Behavior', () => {
        it('should fallback to YOLO when SAM3 is unavailable', async () => {
            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(false);
            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);

            const mockYolo = vi.spyOn(InternalDamageClassifier, 'predictFromImage')
                .mockResolvedValue({
                    damageType: 'crack',
                    severity: 'early',
                    confidence: 0.78,
                    safetyHazards: [],
                    urgency: 'planned',
                    features: [],
                });

            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'crack',
                severity: 'early',
                confidence: 0.78,
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://test.com/test.jpg'],
                { location: 'Wall' }
            );

            expect(result.presenceDetection).toBeNull();
            expect(result.yoloSkipped).toBe(false);
            expect(mockYolo).toHaveBeenCalled();
            expect(result.assessment.damageAssessment.damageType).toBe('crack');
        });

        it('should handle SAM3 timeout gracefully', async () => {
            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(SAM3Service, 'checkDamagePresence').mockRejectedValue(
                new Error('Request timeout')
            );

            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            const mockYolo = vi.spyOn(InternalDamageClassifier, 'predictFromImage')
                .mockResolvedValue({
                    damageType: 'unknown',
                    severity: 'early',
                    confidence: 0.70,
                    safetyHazards: [],
                    urgency: 'monitor',
                    features: [],
                });

            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'unknown',
                severity: 'early',
                confidence: 0.70,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://test.com/test.jpg'],
                { location: 'Test' }
            );

            expect(logger.error).toHaveBeenCalledWith(
                'Error in presence detection',
                expect.any(Error),
                expect.objectContaining({ service: 'HybridInferenceService' })
            );
            expect(result.presenceDetection).toBeNull();
            expect(mockYolo).toHaveBeenCalled();
        });
    });

    describe('Database Recording', () => {
        it('should record presence detection results in routing decisions', async () => {
            const mockSupabaseInsert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: 'routing-decision-123' },
                        error: null,
                    }),
                }),
            });

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockSupabaseInsert,
            });

            vi.spyOn(SAM3Service, 'healthCheck').mockResolvedValue(true);
            vi.spyOn(SAM3Service, 'checkDamagePresence').mockResolvedValue({
                success: true,
                presence_results: {
                    'water damage': {
                        presence_score: 0.02,
                        damage_present: false,
                        threshold_used: 0.25,
                    },
                },
                damage_detected: [],
                damage_not_detected: ['water damage'],
                summary: {
                    total_checked: 1,
                    total_detected: 0,
                    average_presence_score: 0.02,
                    detection_rate: 0,
                },
            });

            vi.spyOn(InternalDamageClassifier, 'isModelReady').mockResolvedValue(true);
            vi.spyOn(InternalDamageClassifier, 'predict').mockResolvedValue({
                damageType: 'none',
                severity: 'early',
                confidence: 0.90,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            await HybridInferenceService.assessDamage(
                ['https://test.com/clean.jpg'],
                { location: 'Test', assessmentId: 'assessment-456' }
            );

            expect(mockSupabaseInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    assessment_id: 'assessment-456',
                    route_selected: 'internal',
                    yolo_skipped: true,
                    presence_detection: expect.objectContaining({
                        damageDetected: false,
                        averagePresenceScore: 0.02,
                        detectionRate: 0,
                    }),
                })
            );
        });
    });
});