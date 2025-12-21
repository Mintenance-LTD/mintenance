/**
 * Tests for HybridInferenceService with SAM3 presence detection integration
 */

import { HybridInferenceService } from '../HybridInferenceService';
import { SAM3Service } from '../SAM3Service';
import { InternalDamageClassifier } from '../InternalDamageClassifier';
import { AssessmentOrchestrator } from '../orchestration/AssessmentOrchestrator';
import { logger } from '@mintenance/shared';

// Mock dependencies
jest.mock('../SAM3Service');
jest.mock('../InternalDamageClassifier');
jest.mock('../orchestration/AssessmentOrchestrator');
jest.mock('@mintenance/shared', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('HybridInferenceService with Presence Detection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        HybridInferenceService.resetYoloSavingsMetrics();
    });

    describe('Internal Route with Presence Detection', () => {
        it('should skip YOLO when no damage is detected by SAM3', async () => {
            // Setup mocks
            const mockImageUrls = ['https://example.com/image1.jpg'];
            const mockContext = { location: 'Kitchen', propertyType: 'residential' as const };

            // Mock SAM3 health check
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);

            // Mock SAM3 presence detection - no damage found
            (SAM3Service.checkDamagePresence as jest.Mock).mockResolvedValue({
                success: true,
                presence_results: {
                    'water damage': {
                        presence_score: 0.1,
                        damage_present: false,
                        threshold_used: 0.3,
                    },
                    'crack': {
                        presence_score: 0.05,
                        damage_present: false,
                        threshold_used: 0.3,
                    },
                },
                damage_detected: [],
                damage_not_detected: ['water damage', 'crack'],
                summary: {
                    total_checked: 2,
                    total_detected: 0,
                    average_presence_score: 0.075,
                    detection_rate: 0,
                },
            });

            // Mock model readiness
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);

            // Mock prediction (should not be called)
            const mockPrediction = jest.fn();
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockImplementation(mockPrediction);

            // Execute assessment
            const result = await HybridInferenceService.assessDamage(
                mockImageUrls,
                mockContext
            );

            // Assertions
            expect(result.yoloSkipped).toBe(true);
            expect(result.presenceDetection).toBeDefined();
            expect(result.presenceDetection?.damageDetected).toBe(false);
            expect(result.assessment.damageAssessment.damageType).toBe('None');
            expect(result.assessment.damageAssessment.confidence).toBe(95);
            expect(result.reasoning).toContain('SAM3 presence detection found no damage');

            // Verify YOLO was NOT called
            expect(mockPrediction).not.toHaveBeenCalled();

            // Check metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(1);
            expect(metrics.yoloSkipped).toBe(1);
            expect(metrics.skipRate).toBe(1.0);
            expect(metrics.estimatedTimeSavedMs).toBeGreaterThan(0);
        });

        it('should proceed with YOLO when damage is detected by SAM3', async () => {
            // Setup mocks
            const mockImageUrls = ['https://example.com/image2.jpg'];
            const mockContext = { location: 'Basement', propertyType: 'residential' as const };

            // Mock SAM3 health check
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);

            // Mock SAM3 presence detection - damage found
            (SAM3Service.checkDamagePresence as jest.Mock).mockResolvedValue({
                success: true,
                presence_results: {
                    'water damage': {
                        presence_score: 0.85,
                        damage_present: true,
                        threshold_used: 0.3,
                    },
                    'mold': {
                        presence_score: 0.65,
                        damage_present: true,
                        threshold_used: 0.3,
                    },
                },
                damage_detected: ['water damage', 'mold'],
                damage_not_detected: [],
                summary: {
                    total_checked: 2,
                    total_detected: 2,
                    average_presence_score: 0.75,
                    detection_rate: 1.0,
                },
            });

            // Mock model readiness
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);

            // Mock YOLO prediction
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockResolvedValue({
                damageType: 'water damage',
                severity: 'midway',
                confidence: 0.82,
                safetyHazards: [],
                urgency: 'urgent',
                features: [],
            });

            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'water damage',
                severity: 'midway',
                confidence: 0.82,
                safetyHazards: [],
                urgency: 'urgent',
                features: [],
            });

            // Execute assessment
            const result = await HybridInferenceService.assessDamage(
                mockImageUrls,
                mockContext
            );

            // Assertions
            expect(result.yoloSkipped).toBe(false);
            expect(result.presenceDetection).toBeDefined();
            expect(result.presenceDetection?.damageDetected).toBe(true);
            expect(result.presenceDetection?.damageTypes).toContain('water damage');
            expect(result.presenceDetection?.damageTypes).toContain('mold');
            expect(result.assessment.damageAssessment.damageType).toBe('water damage');
            expect(result.assessment.damageAssessment.severity).toBe('midway');
            expect(result.reasoning).toContain('SAM3 detected: water damage, mold');

            // Verify YOLO WAS called
            expect(InternalDamageClassifier.predictFromImage).toHaveBeenCalledWith(mockImageUrls[0]);

            // Check metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(1);
            expect(metrics.yoloSkipped).toBe(0);
            expect(metrics.skipRate).toBe(0);
        });
    });

    describe('Hybrid Route with Presence Detection', () => {
        it('should skip both YOLO and GPT-4 when no damage detected', async () => {
            // Setup mocks
            const mockImageUrls = ['https://example.com/image3.jpg'];
            const mockContext = { location: 'Roof', propertyType: 'residential' as const };

            // Mock SAM3 health check
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);

            // Mock SAM3 presence detection - no damage
            (SAM3Service.checkDamagePresence as jest.Mock).mockResolvedValue({
                success: true,
                presence_results: {},
                damage_detected: [],
                damage_not_detected: ['crack', 'damage'],
                summary: {
                    total_checked: 2,
                    total_detected: 0,
                    average_presence_score: 0.08,
                    detection_rate: 0,
                },
            });

            // Mock model readiness for hybrid route selection
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);
            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'unknown',
                severity: 'early',
                confidence: 0.65, // Medium confidence to trigger hybrid route
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            // Mock predictions (should not be called)
            const mockYoloPrediction = jest.fn();
            const mockGpt4Assessment = jest.fn();
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockImplementation(mockYoloPrediction);
            (AssessmentOrchestrator.assessDamage as jest.Mock).mockImplementation(mockGpt4Assessment);

            // Execute assessment
            const result = await HybridInferenceService.assessDamage(
                mockImageUrls,
                mockContext
            );

            // Assertions
            expect(result.route).toBe('hybrid');
            expect(result.yoloSkipped).toBe(true);
            expect(result.presenceDetection?.damageDetected).toBe(false);
            expect(result.assessment.damageAssessment.damageType).toBe('None');
            expect(result.agreementScore).toBe(100); // Perfect agreement on no damage
            expect(result.reasoning).toContain('Both YOLO and GPT-4 inference skipped');

            // Verify neither YOLO nor GPT-4 were called after presence check
            expect(mockYoloPrediction).not.toHaveBeenCalled();
            expect(mockGpt4Assessment).not.toHaveBeenCalled();
        });

        it('should boost agreement score when presence aligns with predictions', async () => {
            // Setup mocks
            const mockImageUrls = ['https://example.com/image4.jpg'];
            const mockContext = { location: 'Bathroom', propertyType: 'residential' as const };

            // Mock SAM3 health check
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);

            // Mock SAM3 presence detection - damage found with high confidence
            (SAM3Service.checkDamagePresence as jest.Mock).mockResolvedValue({
                success: true,
                presence_results: {
                    'water damage': {
                        presence_score: 0.92,
                        damage_present: true,
                        threshold_used: 0.3,
                    },
                },
                damage_detected: ['water damage'],
                damage_not_detected: [],
                summary: {
                    total_checked: 1,
                    total_detected: 1,
                    average_presence_score: 0.92,
                    detection_rate: 1.0,
                },
            });

            // Mock model readiness
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);

            // Mock initial prediction for route selection (medium confidence for hybrid)
            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'water damage',
                severity: 'midway',
                confidence: 0.70, // Medium confidence
                safetyHazards: [],
                urgency: 'urgent',
                features: [],
            });

            // Mock YOLO prediction
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockResolvedValue({
                damageType: 'water damage',
                severity: 'midway',
                confidence: 0.75,
                safetyHazards: [],
                urgency: 'urgent',
                features: [],
            });

            // Mock GPT-4 assessment
            (AssessmentOrchestrator.assessDamage as jest.Mock).mockResolvedValue({
                damageAssessment: {
                    damageType: 'water damage',
                    severity: 'midway',
                    confidence: 85,
                    location: 'Bathroom',
                    description: 'Significant water damage detected',
                    detectedItems: ['water stains', 'mold'],
                },
                urgency: {
                    urgency: 'urgent',
                    recommendedActionTimeline: 'Within 1 week',
                    reasoning: 'Water damage can worsen quickly',
                    priorityScore: 80,
                },
                // ... other required fields
            });

            // Execute assessment
            const result = await HybridInferenceService.assessDamage(
                mockImageUrls,
                mockContext
            );

            // Assertions
            expect(result.route).toBe('hybrid');
            expect(result.presenceDetection?.damageDetected).toBe(true);
            expect(result.presenceDetection?.averagePresenceScore).toBe(0.92);

            // Agreement score should be boosted by presence detection
            // Base agreement should be high (same damage type, severity, urgency)
            // Plus up to 10% boost from presence score (0.92 * 0.1 = 0.092)
            expect(result.agreementScore).toBeGreaterThan(90);

            expect(result.reasoning).toContain('SAM3 detected: water damage');
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Presence detection boosted agreement score'),
                expect.objectContaining({
                    presenceScore: 0.92,
                })
            );
        });
    });

    describe('Metrics and Performance Tracking', () => {
        it('should accurately track YOLO savings across multiple assessments', async () => {
            // Mock setup
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);
            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'none',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            // Simulate multiple assessments with different outcomes
            const assessments = [
                { damageDetected: false }, // Skipped
                { damageDetected: false }, // Skipped
                { damageDetected: true },  // Not skipped
                { damageDetected: false }, // Skipped
                { damageDetected: true },  // Not skipped
            ];

            for (const assessment of assessments) {
                (SAM3Service.checkDamagePresence as jest.Mock).mockResolvedValueOnce({
                    success: true,
                    damage_detected: assessment.damageDetected ? ['damage'] : [],
                    damage_not_detected: assessment.damageDetected ? [] : ['damage'],
                    summary: {
                        total_checked: 1,
                        total_detected: assessment.damageDetected ? 1 : 0,
                        average_presence_score: assessment.damageDetected ? 0.8 : 0.1,
                        detection_rate: assessment.damageDetected ? 1.0 : 0.0,
                    },
                });

                if (assessment.damageDetected) {
                    (InternalDamageClassifier.predictFromImage as jest.Mock).mockResolvedValueOnce({
                        damageType: 'water damage',
                        severity: 'midway',
                        confidence: 0.85,
                        safetyHazards: [],
                        urgency: 'urgent',
                        features: [],
                    });
                }

                await HybridInferenceService.assessDamage(
                    ['https://example.com/test.jpg'],
                    { location: 'Test' }
                );
            }

            // Check final metrics
            const metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(5);
            expect(metrics.yoloSkipped).toBe(3);
            expect(metrics.skipRate).toBeCloseTo(0.6, 2); // 60% skip rate
            expect(metrics.estimatedTimeSavedMs).toBe(3 * 2000); // 3 skips * 2000ms each
            expect(metrics.averageTimeSavedPerSkip).toBe(2000);
        });

        it('should properly reset metrics when requested', () => {
            // Set some initial metrics
            HybridInferenceService['yoloInferenceSavings'] = {
                totalAssessments: 100,
                yoloSkipped: 45,
                estimatedTimeSavedMs: 90000,
                estimatedComputeSaved: 45,
            };

            // Get metrics before reset
            let metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(100);
            expect(metrics.yoloSkipped).toBe(45);

            // Reset metrics
            HybridInferenceService.resetYoloSavingsMetrics();

            // Verify reset
            metrics = HybridInferenceService.getYoloSavingsMetrics();
            expect(metrics.totalAssessments).toBe(0);
            expect(metrics.yoloSkipped).toBe(0);
            expect(metrics.estimatedTimeSavedMs).toBe(0);
            expect(metrics.estimatedComputeSaved).toBe(0);
            expect(metrics.skipRate).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should fallback to YOLO when SAM3 is unavailable', async () => {
            // Mock SAM3 as unavailable
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(false);
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);
            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'crack',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockResolvedValue({
                damageType: 'crack',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'planned',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://example.com/test.jpg'],
                { location: 'Wall' }
            );

            // Should proceed with YOLO despite SAM3 unavailable
            expect(result.presenceDetection).toBeNull();
            expect(result.yoloSkipped).toBe(false);
            expect(InternalDamageClassifier.predictFromImage).toHaveBeenCalled();
            expect(result.assessment.damageAssessment.damageType).toBe('crack');
        });

        it('should handle SAM3 presence check failures gracefully', async () => {
            // Mock SAM3 health check passes but presence check fails
            (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);
            (SAM3Service.checkDamagePresence as jest.Mock).mockRejectedValue(
                new Error('SAM3 service error')
            );
            (InternalDamageClassifier.isModelReady as jest.Mock).mockResolvedValue(true);
            (InternalDamageClassifier.predict as jest.Mock).mockResolvedValue({
                damageType: 'unknown',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });
            (InternalDamageClassifier.predictFromImage as jest.Mock).mockResolvedValue({
                damageType: 'unknown',
                severity: 'early',
                confidence: 0.85,
                safetyHazards: [],
                urgency: 'monitor',
                features: [],
            });

            const result = await HybridInferenceService.assessDamage(
                ['https://example.com/test.jpg'],
                { location: 'Test' }
            );

            // Should log error and continue with YOLO
            expect(logger.error).toHaveBeenCalledWith(
                'Error in presence detection',
                expect.any(Error),
                expect.objectContaining({ service: 'HybridInferenceService' })
            );
            expect(result.presenceDetection).toBeNull();
            expect(result.yoloSkipped).toBe(false);
            expect(InternalDamageClassifier.predictFromImage).toHaveBeenCalled();
        });
    });
});