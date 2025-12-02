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
        it('should generate mock prediction when no model is available', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction).toBeDefined();
            expect(prediction.damageType).toBeDefined();
            expect(prediction.severity).toBeDefined();
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(100);
            expect(prediction.urgency).toBeDefined();
            expect(prediction.safetyHazards).toBeDefined();
            expect(prediction.features).toEqual(features);
        });

        it('should use feature values to generate prediction heuristics', async () => {
            // High feature values should trigger more severe prediction
            const highFeatures = new Array(40).fill(0.8);
            const highPrediction = await InternalDamageClassifier.predict(highFeatures);

            // Low feature values should trigger less severe prediction
            const lowFeatures = new Array(40).fill(0.2);
            const lowPrediction = await InternalDamageClassifier.predict(lowFeatures);

            // High features should have more severe damage
            const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
            const highSeverityIndex = severityOrder.indexOf(highPrediction.severity);
            const lowSeverityIndex = severityOrder.indexOf(lowPrediction.severity);
            expect(highSeverityIndex).toBeGreaterThanOrEqual(lowSeverityIndex);
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

        it('should have safety hazards for urgent cases', async () => {
            const highFeatures = new Array(40).fill(0.9);
            const prediction = await InternalDamageClassifier.predict(highFeatures);

            if (prediction.urgency === 'urgent' || prediction.urgency === 'immediate') {
                expect(prediction.safetyHazards.length).toBeGreaterThan(0);
            }
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

    describe('Mock Prediction Logic', () => {
        it('should classify low feature mean as minor damage', async () => {
            const features = new Array(40).fill(0.2);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.severity).toBe('early');
            expect(['monitor', 'planned']).toContain(prediction.urgency);
        });

        it('should classify medium feature mean as moderate damage', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(['early', 'midway']).toContain(prediction.severity);
            expect(['soon', 'planned']).toContain(prediction.urgency);
        });

        it('should classify high feature mean as severe damage', async () => {
            const features = new Array(40).fill(0.7);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(['midway', 'full']).toContain(prediction.severity);
            expect(['urgent', 'soon']).toContain(prediction.urgency);
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
        it('should return known damage type', async () => {
            const features = new Array(40).fill(0.5);
            const prediction = await InternalDamageClassifier.predict(features);

            expect(prediction.damageType).toBeDefined();
            expect(typeof prediction.damageType).toBe('string');
            expect(prediction.damageType.length).toBeGreaterThan(0);
        });

        it('should vary damage type based on features', async () => {
            const lowFeatures = new Array(40).fill(0.2);
            const mediumFeatures = new Array(40).fill(0.5);
            const highFeatures = new Array(40).fill(0.8);

            const lowPrediction = await InternalDamageClassifier.predict(lowFeatures);
            const mediumPrediction = await InternalDamageClassifier.predict(mediumFeatures);
            const highPrediction = await InternalDamageClassifier.predict(highFeatures);

            // Damage types should be different (though this is probabilistic)
            const damageTypes = new Set([
                lowPrediction.damageType,
                mediumPrediction.damageType,
                highPrediction.damageType,
            ]);

            expect(damageTypes.size).toBeGreaterThan(1);
        });
    });
});
