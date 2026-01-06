/**
 * Tests for Internal Damage Classifier
 *
 * Tests model loading, prediction, and training data management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import type { DamageSeverity, UrgencyLevel } from '../types';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn((table: string) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        limit: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: null,
                                error: { message: 'No model found' },
                            })),
                        })),
                    })),
                    single: vi.fn(() => ({
                        data: null,
                        error: null,
                    })),
                })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: { id: 'mock-job-id' },
                        error: null,
                    })),
                })),
            })),
        })),
    },
}));

describe('InternalDamageClassifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        InternalDamageClassifier.reset();
    });

    afterEach(() => {
        InternalDamageClassifier.reset();
    });

    describe('Model Loading', () => {
        it('should return false when no model is available', async () => {
            const loaded = await InternalDamageClassifier.loadLatestModel();
            expect(loaded).toBe(false);
        });

        it('should check if model is ready', async () => {
            const isReady = await InternalDamageClassifier.isModelReady();
            expect(isReady).toBe(false);
        });

        it('should return model info even when no model is loaded', () => {
            const info = InternalDamageClassifier.getModelInfo();
            expect(info).toBeDefined();
            expect(info.version).toBe('none');
            expect(info.accuracy).toBe(0);
            expect(info.sampleCount).toBe(0);
            expect(info.isReady).toBe(false);
        });
    });

    describe('Prediction', () => {
        // Note: predict() is deprecated - it returns low confidence to trigger GPT-4 fallback
        // These tests verify the fallback behavior when YOLO model is not loaded
        it('should return low confidence prediction when no model is available', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction).toBeDefined();
            expect(prediction.damageType).toBe('unknown');
            expect(prediction.severity).toBe('early');
            expect(prediction.confidence).toBe(0); // Low confidence triggers GPT-4 fallback
            expect(prediction.urgency).toBe('monitor');
            expect(prediction.safetyHazards).toEqual([]);
            // Note: features are NOT passed through in current implementation
            expect(prediction.features).toEqual([]);
        });

        it('should return consistent low confidence for any feature values', async () => {
            // With YOLO model not loaded, all predictions return same low confidence response
            const highFeatures = new Array(40).fill(0.8);
            const highPrediction = await InternalDamageClassifier.predict(highFeatures);

            const lowFeatures = new Array(40).fill(0.2);
            const lowPrediction = await InternalDamageClassifier.predict(lowFeatures);

            // Both should return same low confidence prediction
            expect(highPrediction.confidence).toBe(0);
            expect(lowPrediction.confidence).toBe(0);
            expect(highPrediction.severity).toBe('early');
            expect(lowPrediction.severity).toBe('early');
        });

        it('should return valid severity values', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(['early', 'midway', 'full']).toContain(prediction.severity);
        });

        it('should return valid urgency values', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(['immediate', 'urgent', 'soon', 'planned', 'monitor']).toContain(
                prediction.urgency
            );
        });

        it('should return empty safety hazards for low confidence prediction', async () => {
            const highFeatures = new Array(40).fill(0.9);
            const prediction = await InternalDamageClassifier.predict(highFeatures);

            // Low confidence predictions have no safety hazards
            expect(prediction.safetyHazards).toEqual([]);
        });
    });

    describe('Training Data Statistics', () => {
        it('should retrieve training data statistics', async () => {
            const stats = await InternalDamageClassifier.getTrainingDataStats();

            expect(stats).toBeDefined();
            expect(stats.totalValidatedSamples).toBeGreaterThanOrEqual(0);
            expect(stats.damageTypeDistribution).toBeDefined();
            expect(stats.severityDistribution).toBeDefined();
            expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
        });

        it('should have correct severity distribution keys', async () => {
            const stats = await InternalDamageClassifier.getTrainingDataStats();

            expect(stats.severityDistribution).toHaveProperty('early');
            expect(stats.severityDistribution).toHaveProperty('midway');
            expect(stats.severityDistribution).toHaveProperty('full');
        });
    });

    describe('Model Training', () => {
        it('should fail to trigger training with insufficient data', async () => {
            const result = await InternalDamageClassifier.triggerRetraining();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient training data');
        });

        it('should provide error message when training fails', async () => {
            const result = await InternalDamageClassifier.triggerRetraining();

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('error');
        });
    });

    describe('Low Confidence Fallback Behavior', () => {
        // predict() returns low confidence for all inputs when model not loaded
        // This is designed to trigger GPT-4 Vision fallback
        it('should return low confidence for any feature values', async () => {
            const features = new Array(40).fill(0.2);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.confidence).toBe(0);
            expect(prediction.severity).toBe('early');
            expect(prediction.urgency).toBe('monitor');
        });

        it('should return consistent low confidence for medium feature values', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.confidence).toBe(0);
            expect(prediction.severity).toBe('early');
            expect(prediction.urgency).toBe('monitor');
        });

        it('should return consistent low confidence for high feature values', async () => {
            const features = new Array(40).fill(0.7);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.confidence).toBe(0);
            expect(prediction.severity).toBe('early');
            expect(prediction.urgency).toBe('monitor');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty features array', async () => {
            const prediction = await InternalDamageClassifier.predict([]);

            expect(prediction).toBeDefined();
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        });

        it('should handle features with extreme values', async () => {
            const extremeFeatures = new Array(40).fill(100);
            const prediction = await InternalDamageClassifier.predict(extremeFeatures);

            expect(prediction).toBeDefined();
            expect(prediction.confidence).toBeLessThanOrEqual(100);
        });

        it('should handle negative feature values', async () => {
            const negativeFeatures = new Array(40).fill(-1);
            const prediction = await InternalDamageClassifier.predict(negativeFeatures);

            expect(prediction).toBeDefined();
        });

        it('should handle mixed feature values', async () => {
            const mixedFeatures = [
                ...new Array(20).fill(0.1),
                ...new Array(20).fill(0.9),
            ];
            const prediction = await InternalDamageClassifier.predict(mixedFeatures);

            expect(prediction).toBeDefined();
        });
    });

    describe('Model Reset', () => {
        it('should reset model state', () => {
            InternalDamageClassifier.reset();
            const info = InternalDamageClassifier.getModelInfo();

            expect(info.version).toBe('none');
            expect(info.isReady).toBe(false);
        });

        it('should allow model to be loaded after reset', async () => {
            InternalDamageClassifier.reset();
            const isReady = await InternalDamageClassifier.isModelReady();
            expect(isReady).toBe(false);
        });
    });

    describe('Confidence Bounds', () => {
        it('should always return confidence between 0 and 100', async () => {
            // Test multiple feature sets
            const featureSets = [
                new Array(40).fill(0),
                new Array(40).fill(0.25),
                new Array(40).fill(0.5),
                new Array(40).fill(0.75),
                new Array(40).fill(1.0),
            ];

            for (const features of featureSets) {
                const prediction = await InternalDamageClassifier.predict(features);
                expect(prediction.confidence).toBeGreaterThanOrEqual(0);
                expect(prediction.confidence).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Damage Type Classification', () => {
        it('should return unknown damage type when model not loaded', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.damageType).toBe('unknown');
            expect(typeof prediction.damageType).toBe('string');
            expect(prediction.damageType.length).toBeGreaterThan(0);
        });

        it('should return same unknown damage type for all features', async () => {
            const lowFeatures = new Array(40).fill(0.2);
            const mediumFeatures = new Array(40).fill(0.5);
            const highFeatures = new Array(40).fill(0.8);

            const lowPrediction = await InternalDamageClassifier.predict(lowFeatures);
            const mediumPrediction = await InternalDamageClassifier.predict(mediumFeatures);
            const highPrediction = await InternalDamageClassifier.predict(highFeatures);

            // All predictions return 'unknown' when model not loaded
            expect(lowPrediction.damageType).toBe('unknown');
            expect(mediumPrediction.damageType).toBe('unknown');
            expect(highPrediction.damageType).toBe('unknown');
        });
    });
});
