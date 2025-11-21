/**
 * Unit Tests for FeatureExtractionUtils
 * 
 * Tests handcrafted feature extraction logic
 */

import { describe, it, expect } from '@jest/globals';
import { extractHandcraftedFeatures } from '../FeatureExtractionUtils';
import type {
    AssessmentContext,
    RoboflowDetection,
    VisionAnalysisSummary,
    Phase1BuildingAssessment,
} from '../../types';

describe('FeatureExtractionUtils', () => {
    describe('extractHandcraftedFeatures', () => {
        it('should return 40-dimensional feature vector', async () => {
            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                undefined,
                null
            );

            expect(features).toHaveLength(40);
        });

        it('should normalize all features to 0-1 range', async () => {
            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                undefined,
                null
            );

            features.forEach((feature, index) => {
                expect(feature).toBeGreaterThanOrEqual(0);
                expect(feature).toBeLessThanOrEqual(1);
            });
        });

        it('should extract property context features', async () => {
            const context: AssessmentContext = {
                propertyType: 'residential',
                ageOfProperty: 100,
                location: 'London',
                propertyDetails: 'Victorian terraced house',
            };

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                context,
                undefined,
                undefined,
                null
            );

            // First feature should be 1.0 for residential
            expect(features[0]).toBe(1.0);

            // Age should be normalized (100/200 = 0.5)
            expect(features[1]).toBe(0.5);
        });

        it('should handle commercial property type', async () => {
            const context: AssessmentContext = {
                propertyType: 'commercial',
            };

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                context,
                undefined,
                undefined,
                null
            );

            // First feature should be 0.5 for commercial
            expect(features[0]).toBe(0.5);
        });

        it('should extract detection features', async () => {
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'water_damage',
                    confidence: 90,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
                {
                    id: '2',
                    className: 'mold',
                    confidence: 85,
                    boundingBox: { x: 0, y: 0, width: 50, height: 50 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                detections,
                null
            );

            // Should have detection count normalized
            expect(features[5]).toBeGreaterThan(0);

            // Should have detection confidence
            expect(features[6]).toBeGreaterThan(0);
        });

        it('should extract vision analysis features', async () => {
            const visionSummary: VisionAnalysisSummary = {
                provider: 'google-vision',
                confidence: 80,
                labels: [
                    { description: 'water stain', score: 0.9 },
                    { description: 'ceiling', score: 0.85 },
                ],
                objects: [],
                detectedFeatures: ['moisture', 'discoloration'],
                suggestedCategories: [],
            };

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                undefined,
                visionSummary
            );

            // Should include vision confidence (normalized)
            expect(features[6]).toBe(0.8); // 80/100
        });

        it('should extract assessment features when provided', async () => {
            const assessment: Phase1BuildingAssessment = {
                damageAssessment: {
                    damageType: 'water_damage',
                    severity: 'midway',
                    confidence: 85,
                    location: 'ceiling',
                    description: 'Water damage on ceiling',
                    detectedItems: ['water stain', 'peeling paint'],
                },
                safetyHazards: {
                    hazards: [
                        {
                            type: 'electrical',
                            severity: 'high',
                            location: 'ceiling',
                            description: 'Exposed wiring',
                            urgency: 'urgent',
                        },
                    ],
                    hasCriticalHazards: false,
                    overallSafetyScore: 60,
                },
                compliance: {
                    complianceIssues: [],
                    requiresProfessionalInspection: true,
                    complianceScore: 80,
                },
                insuranceRisk: {
                    riskFactors: [],
                    riskScore: 70,
                    premiumImpact: 'medium',
                    mitigationSuggestions: [],
                },
                urgency: {
                    urgency: 'urgent',
                    recommendedActionTimeline: 'Within 1 week',
                    reasoning: 'Water damage can worsen quickly',
                    priorityScore: 80,
                },
                homeownerExplanation: {
                    whatIsIt: 'Water damage',
                    whyItHappened: 'Leak from above',
                    whatToDo: 'Fix the leak',
                },
                contractorAdvice: {
                    repairNeeded: ['Fix leak', 'Replace ceiling'],
                    materials: [],
                    tools: [],
                    estimatedTime: '4-6 hours',
                    estimatedCost: { min: 200, max: 500, recommended: 350 },
                    complexity: 'medium',
                },
            };

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                assessment,
                undefined,
                null
            );

            // Should extract damage type encoding
            expect(features[10]).toBeGreaterThan(0);

            // Should extract severity (midway = 0.66)
            expect(features[11]).toBeCloseTo(0.66, 1);

            // Should extract confidence
            expect(features[12]).toBe(0.85);
        });

        it('should handle multiple images', async () => {
            const imageUrls = [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
                'https://example.com/image3.jpg',
            ];

            const features = await extractHandcraftedFeatures(
                imageUrls,
                undefined,
                undefined,
                undefined,
                null
            );

            // Image count feature should reflect 3 images
            // Normalized by 4: 3/4 = 0.75
            expect(features[5]).toBe(0.75);
        });

        it('should handle missing context gracefully', async () => {
            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                undefined,
                null
            );

            // Should still return 40 features
            expect(features).toHaveLength(40);

            // Should have default values
            expect(features.every(f => !isNaN(f))).toBe(true);
        });

        it('should detect mold from detections', async () => {
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'mold',
                    confidence: 95,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
                {
                    id: '2',
                    className: 'mold',
                    confidence: 90,
                    boundingBox: { x: 0, y: 0, width: 50, height: 50 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                detections,
                null
            );

            // Mold ratio should be high (2 mold / 2 total = 1.0)
            expect(features[13]).toBe(1.0);
        });

        it('should detect structural damage from detections', async () => {
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'crack',
                    confidence: 90,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                detections,
                null
            );

            // Structural ratio should be 1.0 (1 crack / 1 total)
            expect(features[14]).toBe(1.0);
        });

        it('should handle empty detections array', async () => {
            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                undefined,
                undefined,
                [],
                null
            );

            expect(features).toHaveLength(40);
            expect(features.every(f => !isNaN(f))).toBe(true);
        });

        it('should cap normalized values at 1.0', async () => {
            const context: AssessmentContext = {
                ageOfProperty: 500, // Very old property
            };

            const features = await extractHandcraftedFeatures(
                ['https://example.com/image.jpg'],
                context,
                undefined,
                undefined,
                null
            );

            // Age feature should be capped at 1.0 (not 2.5)
            expect(features[1]).toBe(1.0);
        });
    });
});
