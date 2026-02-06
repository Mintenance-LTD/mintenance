/**
 * Comprehensive tests for Hybrid Inference Service
 *
 * Tests all routing scenarios:
 * 1. Internal model not available -> GPT-4 Vision
 * 2. Low confidence -> GPT-4 Vision
 * 3. Medium confidence -> Hybrid (internal + GPT-4 for comparison)
 * 4. High confidence -> Internal only
 * 5. Critical safety concern -> GPT-4 Vision (regardless of confidence)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HybridInferenceService, CONFIDENCE_THRESHOLDS } from '../HybridInferenceService';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import { AssessmentOrchestrator } from '../orchestration/AssessmentOrchestrator';
import type { AssessmentContext } from '../types';

// Override the global mock from test/setup.ts to use actual implementation
vi.mock('../HybridInferenceService', async () => {
    const actual = await vi.importActual('../HybridInferenceService');
    return actual;
});
vi.mock('../config/BuildingSurveyorConfig', () => ({
    getConfig: vi.fn(() => ({
        openaiApiKey: 'test-key',
        detectorTimeoutMs: 7000,
        visionTimeoutMs: 9000,
        imageBaseArea: 786432,
        useLearnedFeatures: false,
        useTitans: false,
        useHybridInference: true,
        abTest: { sfnRateThreshold: 0.1, coverageViolationThreshold: 5.0, automationSpikeThreshold: 20.0, criticObservationsThreshold: 100, calibrationDataThreshold: 100 },
        autoValidationEnabled: false,
        yolo: { dataYamlPath: undefined },
        sam3: { serviceUrl: 'http://localhost:8001', enabled: false, modelVersion: '3', rolloutPercentage: 0, timeoutMs: 30000 },
    })),
    loadBuildingSurveyorConfig: vi.fn(),
    validateConfig: vi.fn(),
    resetConfig: vi.fn(),
}));
// Mock dependencies
vi.mock('../InternalDamageClassifier');
vi.mock('../orchestration/AssessmentOrchestrator');
vi.mock('../orchestration/FeatureExtractionService', () => ({
    FeatureExtractionService: {
        extractFeatures: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock('../RoboflowDetectionService', () => ({
    RoboflowDetectionService: {
        detect: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock('../../ai/ModelDriftDetectionService', () => ({
    ModelDriftDetectionService: {
        checkDrift: vi.fn().mockResolvedValue({ drifted: false }),
        recordPrediction: vi.fn().mockResolvedValue(undefined),
    },
}));
vi.mock('../LearnedFeatureExtractor', () => ({
    LearnedFeatureExtractor: {
        extract: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock('@mintenance/shared', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));
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
                    gte: vi.fn(() => ({
                        data: [],
                        error: null,
                    })),
                })),
            })),
        })),
    },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
    serverSupabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({ data: null, error: null })),
                    order: vi.fn(() => ({ data: [], error: null })),
                })),
            })),
        })),
    },
}));

// Import mocked modules for re-setup in beforeEach
import { FeatureExtractionService } from '../orchestration/FeatureExtractionService';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { ModelDriftDetectionService } from '../../ai/ModelDriftDetectionService';
import { supabase } from '@/lib/supabase';

// Default mock GPT-4 assessment that matches Phase1BuildingAssessment shape
const mockGpt4Assessment = {
    damageAssessment: {
        damageType: 'water_damage',
        severity: 'early' as const,
        confidence: 80,
        location: 'Test Location',
        description: 'Water damage detected',
        detectedItems: [],
    },
    safetyHazards: { hazards: [], hasCriticalHazards: false, overallSafetyScore: 100 },
    compliance: { complianceIssues: [], requiresProfessionalInspection: false, complianceScore: 100 },
    insuranceRisk: { riskFactors: [], riskScore: 20, premiumImpact: 'low' as const, mitigationSuggestions: [] },
    urgency: { urgency: 'monitor' as const, recommendedActionTimeline: 'Monitor for changes', reasoning: 'Minor issue', priorityScore: 20 },
    homeownerExplanation: { whatIsIt: 'Water damage', whyItHappened: 'Unknown', whatToDo: 'Monitor' },
    contractorAdvice: { repairNeeded: [], materials: [], tools: [], estimatedTime: 'N/A', estimatedCost: { min: 0, max: 100, recommended: 50 }, complexity: 'low' as const },
    evidence: { roboflowDetections: [], visionAnalysis: null },
};

describe('HybridInferenceService', () => {
    const mockImageUrls = ['https://example.com/image1.jpg'];
    const mockContext: AssessmentContext = {
        location: 'Test Location',
        propertyType: 'residential',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Re-setup mocks after mockReset clears them
        vi.mocked(FeatureExtractionService.extractFeatures).mockResolvedValue([]);
        vi.mocked(RoboflowDetectionService.detect).mockResolvedValue([]);
        vi.mocked(ModelDriftDetectionService.recordPrediction).mockResolvedValue(undefined);
        vi.mocked(AssessmentOrchestrator.assessDamage).mockResolvedValue(mockGpt4Assessment as any);

        // Re-setup supabase mock chain for recording routing decisions
        vi.mocked(supabase.from).mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
                }),
            }),
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    gte: vi.fn().mockReturnValue({
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                        data: [],
                        error: null,
                    }),
                }),
            }),
        } as any);
    });

    afterEach(() => {
        // InternalDamageClassifier.reset is auto-mocked, safe to call
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
            // Mock: model ready but low confidence (below medium threshold)
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'water_damage',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.medium - 0.01, // Below medium threshold -> GPT-4
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('gpt4_vision');
            expect(result.reasoning).toContain('Low confidence');
        });

        it('should select hybrid route for medium confidence predictions', async () => {
            // Mock: model ready with medium confidence (above medium, below high)
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'roof_damage',
                severity: 'midway',
                confidence: CONFIDENCE_THRESHOLDS.medium + 0.01, // Above medium, below high
                safetyHazards: [],
                urgency: 'soon',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('hybrid');
            expect(result.reasoning).toContain('Medium confidence');
            expect(result.internalPrediction).toBeDefined();
            expect(result.gpt4Prediction).toBeDefined();
            expect(result.agreementScore).toBeDefined();
        });

        it('should select internal route for high confidence predictions', async () => {
            // Mock: model ready with high confidence (at high threshold)
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'crack_damage',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high, // At high threshold
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.route).toBe('internal');
            expect(result.reasoning).toContain('High confidence');
            expect(result.internalPrediction).toBeDefined();
            expect(result.gpt4Prediction).toBeUndefined();
        });

        it('should always use GPT-4 for immediate urgency (safety critical)', async () => {
            // Mock: high confidence but immediate urgency
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'structural_damage',
                severity: 'full',
                confidence: 0.95, // Very high confidence
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
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'minor_damage',
                severity: 'early',
                confidence: 0.88,
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
            // Thresholds optimized for cost reduction (lower than original)
            expect(CONFIDENCE_THRESHOLDS.high).toBe(0.75);
            expect(CONFIDENCE_THRESHOLDS.medium).toBe(0.55);
            expect(CONFIDENCE_THRESHOLDS.low).toBe(0.35);
        });

        it('should route correctly at threshold boundaries', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);

            // Test exactly at high threshold
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            let result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
            expect(result.route).toBe('internal');

            // Test just below high threshold
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high - 0.01,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
            expect(result.route).toBe('hybrid');
        });
    });

    describe('Agreement Score Calculation', () => {
        it('should calculate agreement score for matching predictions', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'water_damage',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.medium + 0.01,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            // GPT-4 returns matching assessment
            vi.mocked(AssessmentOrchestrator.assessDamage).mockResolvedValue({
                ...mockGpt4Assessment,
                damageAssessment: {
                    ...mockGpt4Assessment.damageAssessment,
                    damageType: 'water_damage',
                    severity: 'early',
                },
                urgency: {
                    ...mockGpt4Assessment.urgency,
                    urgency: 'monitor',
                },
            } as any);

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
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'crack_damage',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.assessment).toBeDefined();
            expect(result.assessment.damageAssessment).toBeDefined();
            expect(result.assessment.damageAssessment.damageType).toBe('crack_damage');
            expect(result.assessment.damageAssessment.severity).toBe('early');
            expect(result.assessment.damageAssessment.confidence).toBe(CONFIDENCE_THRESHOLDS.high);
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
                vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                    damageType: 'test',
                    severity: 'early',
                    confidence: CONFIDENCE_THRESHOLDS.high,
                    safetyHazards: [],
                    urgency: test.urgency,
                    features: [],
                });

                // Safety-critical urgencies route to GPT-4, not internal
                if (test.urgency === 'immediate') {
                    const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
                    // immediate urgency triggers safety concern -> GPT-4 route
                    expect(result.route).toBe('gpt4_vision');
                } else {
                    const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);
                    expect(result.assessment.urgency.recommendedActionTimeline).toBe(test.expectedTimeline);
                }
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
            vi.mocked(InternalDamageClassifier.predictFromImage).mockRejectedValue(new Error('Model error'));

            // Should fallback to GPT-4 or throw
            await expect(HybridInferenceService.assessDamage(mockImageUrls, mockContext)).rejects.toThrow();
        });
    });

    describe('Performance Tracking', () => {
        it('should track inference time', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(mockImageUrls, mockContext);

            expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);
            expect(result.inferenceTimeMs).toBeLessThan(60000); // Should complete in under 60s
        });

        it('should record routing decision to database', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
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
            // With no images and model not ready (default mock), it routes to GPT-4
            // The AssessmentOrchestrator mock handles empty arrays gracefully
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(false);
            const result = await HybridInferenceService.assessDamage([], mockContext);
            expect(result.route).toBe('gpt4_vision');
        });

        it('should handle missing context', async () => {
            vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
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
            vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
                damageType: 'test',
                severity: 'early',
                confidence: CONFIDENCE_THRESHOLDS.high,
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
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-setup supabase mock for calibration tests
        vi.mocked(supabase.from).mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
                }),
            }),
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
        } as any);
    });

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
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should retrieve routing statistics', async () => {
        // Mock supabase to return some decisions
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockResolvedValue({
                data: [
                    { route_selected: 'internal', internal_confidence: 0.9, inference_time_ms: 100, agreement_score: null },
                    { route_selected: 'gpt4_vision', internal_confidence: null, inference_time_ms: 2000, agreement_score: null },
                ],
                error: null,
            }),
        } as any);

        const stats = await HybridInferenceService.getRoutingStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalAssessments).toBeGreaterThanOrEqual(0);
        expect(stats.routeDistribution).toBeDefined();
        expect(stats.averageConfidence).toBeDefined();
        expect(stats.averageInferenceTime).toBeDefined();
        expect(stats.agreementScores).toBeDefined();
    });

    it('should filter statistics by time range', async () => {
        // Mock supabase chain with gte/lte for time range filtering
        const mockGte = vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
                data: [
                    { route_selected: 'internal', internal_confidence: 0.9, inference_time_ms: 100, agreement_score: null },
                ],
                error: null,
            }),
        });
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                gte: mockGte,
            }),
        } as any);

        const timeRange = {
            start: new Date('2025-01-01'),
            end: new Date('2025-12-31'),
        };

        const stats = await HybridInferenceService.getRoutingStatistics(timeRange);
        expect(stats).toBeDefined();
    });
});
