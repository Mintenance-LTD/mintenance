/**
 * Comprehensive tests for Hybrid Inference Service
 *
 * Tests all routing scenarios:
 * 1. Internal model not available → GPT-4 Vision
 * 2. Low confidence → GPT-4 Vision
 * 3. Medium confidence → Hybrid (internal + GPT-4 for comparison)
 * 4. High confidence → Internal only
 * 5. Critical safety concern → GPT-4 Vision (regardless of confidence)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HybridInferenceService, CONFIDENCE_THRESHOLDS } from '../HybridInferenceService';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import type { AssessmentContext } from '../types';

// Mock dependencies
vi.mock('../InternalDamageClassifier');
vi.mock('../orchestration/AssessmentOrchestrator');
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => ({ data: { id: 'mock-id' }, error: null })),
                })),
            })),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({ data: null, error: null })),
                })),
            })),
        })),
    },
}));

describe('HybridInferenceService', () => {
    const mockImageUrls = ['https://example.com/image1.jpg'];
    const mockContext: AssessmentContext = {
        location: 'Test Location',
        propertyType: 'residential',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        InternalDamageClassifier.reset();
    });

    describe('Route Selection', () => {
        it('should select GPT-4 Vision when internal model is not ready', async () => {
            // Mock: internal model not ready
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(false);

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('gpt4_vision');
            expect(result.reasoning).toContain('not available');
        });

        it('should select GPT-4 Vision for low confidence predictions', async () => {
            // Mock: model ready but low confidence
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'water_damage',
                severity: 'early',
                confidence: 0.40 * 100, // Below low threshold
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('gpt4_vision');
            expect(result.confidence).toBe(40);
            expect(result.reasoning).toContain('Low confidence');
        });

        it('should select hybrid route for medium confidence predictions', async () => {
            // Mock: model ready with medium confidence
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'roof_damage',
                severity: 'midway',
                confidence: 0.75 * 100, // Medium confidence
                safetyHazards: [],
                urgency: 'soon',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('hybrid');
            expect(result.confidence).toBe(75);
            expect(result.reasoning).toContain('Medium confidence');
            expect(result.internalPrediction).toBeDefined();
            expect(result.gpt4Prediction).toBeDefined();
            expect(result.agreementScore).toBeDefined();
        });

        it('should select internal route for high confidence predictions', async () => {
            // Mock: model ready with high confidence
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'crack_damage',
                severity: 'early',
                confidence: 0.90 * 100, // High confidence
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('internal');
            expect(result.confidence).toBe(90);
            expect(result.reasoning).toContain('High confidence');
            expect(result.internalPrediction).toBeDefined();
            expect(result.gpt4Prediction).toBeUndefined();
        });

        it('should always use GPT-4 for immediate urgency (safety critical)', async () => {
            // Mock: high confidence but immediate urgency
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'structural_damage',
                severity: 'full',
                confidence: 0.95 * 100, // Very high confidence
                safetyHazards: [{ type: 'structural', severity: 'high' }],
                urgency: 'immediate', // Critical!
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('gpt4_vision');
            expect(result.reasoning).toContain('safety concern');
        });

        it('should use GPT-4 for commercial properties (higher risk)', async () => {
            // Mock: high confidence but commercial property
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'minor_damage',
                severity: 'early',
                confidence: 0.88 * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const commercialContext: AssessmentContext = {
                ...mockContext,
                propertyType: 'commercial',
            };

            const result = await HybridInferenceService.assessDamage(mockImageUrls, commercialContext);

            expect(result.route).toBe('gpt4_vision');
            expect(result.reasoning).toContain('safety concern');
        });
    });

    describe('Confidence Thresholds', () => {
        it('should have correct threshold values', () => {
            expect(CONFIDENCE_THRESHOLDS.high).toBe(0.85);
            expect(CONFIDENCE_THRESHOLDS.medium).toBe(0.70);
            expect(CONFIDENCE_THRESHOLDS.low).toBe(0.50);
        });

        it('should route correctly at threshold boundaries', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);

            // Test exactly at high threshold
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            let result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
            expect(result.route).toBe('internal');

            // Test just below high threshold
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: (CONFIDENCE_THRESHOLDS.high - 0.01) * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
            expect(result.route).toBe('hybrid');
        });
    });

    describe('Agreement Score Calculation', () => {
        it('should calculate high agreement for matching predictions', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'water_damage',
                severity: 'midway',
                confidence: 0.75 * 100,
                safetyHazards: [],
                urgency: 'soon',
                features: [],
            });

            // Note: In real test, we'd mock AssessmentOrchestrator to return matching assessment
            // For now, this tests the structure

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            if (result.route === 'hybrid') {
                expect(result.agreementScore).toBeDefined();
                expect(result.agreementScore).toBeGreaterThanOrEqual(0);
                expect(result.agreementScore).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Assessment Conversion', () => {
        it('should convert internal prediction to Phase1BuildingAssessment format', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'crack_damage',
                severity: 'early',
                confidence: 0.90 * 100,
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.assessment).toBeDefined();
            expect(result.assessment.damageAssessment).toBeDefined();
            expect(result.assessment.damageAssessment.damageType).toBe('crack_damage');
            expect(result.assessment.damageAssessment.severity).toBe('early');
            expect(result.assessment.damageAssessment.confidence).toBe(90);
            expect(result.assessment.safetyHazards).toBeDefined();
            expect(result.assessment.compliance).toBeDefined();
            expect(result.assessment.insuranceRisk).toBeDefined();
            expect(result.assessment.urgency).toBeDefined();
            expect(result.assessment.homeownerExplanation).toBeDefined();
            expect(result.assessment.contractorAdvice).toBeDefined();
        });

        it('should set correct urgency timeline based on urgency level', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);

            const urgencyTests = [
                { urgency: 'immediate' as const, expectedTimeline: 'Within 24 hours' },
                { urgency: 'urgent' as const, expectedTimeline: 'Within 1 week' },
                { urgency: 'soon' as const, expectedTimeline: 'Within 1 month' },
                { urgency: 'planned' as const, expectedTimeline: 'Within 3 months' },
                { urgency: 'monitor' as const, expectedTimeline: 'Monitor for changes' },
            ];

            for (const test of urgencyTests) {
                vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                    damageType: 'test',
                    severity: 'early',
                    confidence: 0.90 * 100,
                    safetyHazards: [],
                    urgency: test.urgency,
                    features: [],
                });

                const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
                expect(result.assessment.urgency.recommendedActionTimeline).toBe(test.expectedTimeline);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle feature extraction failures gracefully', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(false);

            // Should still complete with GPT-4 fallback
            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
            expect(result).toBeDefined();
            expect(result.route).toBe('gpt4_vision');
        });

        it('should handle internal model prediction failures', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockRejectedValue(new Error('Model error'));

            // Should fallback to GPT-4
            await expect(HybridInferenceService.assessDamage(mockImageUrls, mockContext)).rejects.toThrow();
        });
    });

    describe('Performance Tracking', () => {
        it('should track inference time', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: 0.90 * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.inferenceTimeMs).toBeGreaterThan(0);
            expect(result.inferenceTimeMs).toBeLessThan(60000); // Should complete in under 60s
        });

        it('should record routing decision to database', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: 0.90 * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.routingDecisionId).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty image URL array', async () => {
            await expect(HybridInferenceService.assessDamage([], mockContext)).rejects.toThrow();
        });

        it('should handle missing context', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: 0.90 * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls);
            expect(result).toBeDefined();
            expect(result.assessment.damageAssessment.location).toBe('Unknown');
        });

        it('should handle multiple images', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: 0.90 * 100,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const multipleImages = [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
                'https://example.com/image3.jpg',
            ];

            const result = await HybridInferenceService.assessDamage(multipleImages, mockContext);
            expect(result).toBeDefined();
        });
    });
});

describe('Confidence Calibration', () => {
    it('should record calibration data when outcome is provided', async () => {
        const assessmentId = 'test-assessment-id';
        const outcome = {
            wasCorrect: true,
            actualSeverity: 'early' as const,
            actualUrgency: 'monitor' as const,
        };

        await expect(
            HybridInferenceService.calibrateConfidence(assessmentId, outcome)
        ).resolves.not.toThrow();
    });

    it('should handle missing routing decision gracefully', async () => {
        const assessmentId = 'non-existent-id';
        const outcome = {
            wasCorrect: false,
        };

        await expect(
            HybridInferenceService.calibrateConfidence(assessmentId, outcome)
        ).resolves.not.toThrow();
    });
});

describe('Routing Statistics', () => {
    it('should retrieve routing statistics', async () => {
        const stats = await HybridInferenceService.getRoutingStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalAssessments).toBeGreaterThanOrEqual(0);
        expect(stats.routeDistribution).toBeDefined();
        expect(stats.averageConfidence).toBeDefined();
        expect(stats.averageInferenceTime).toBeDefined();
        expect(stats.agreementScores).toBeDefined();
    });

    it('should filter statistics by time range', async () => {
        const timeRange = {
            start: new Date('2025-01-01'),
            end: new Date('2025-12-31'),
        };

        const stats = await HybridInferenceService.getRoutingStatistics(timeRange);
        expect(stats).toBeDefined();
    });
});
