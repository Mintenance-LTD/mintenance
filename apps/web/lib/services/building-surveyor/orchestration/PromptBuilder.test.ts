/**
 * Unit Tests for PromptBuilder
 * 
 * Tests GPT-4 Vision prompt construction
 */

import { describe, it, expect } from '@jest/globals';
import { PromptBuilder } from '../PromptBuilder';
import type { AssessmentContext, RoboflowDetection, VisionAnalysisSummary } from '../../types';

describe('PromptBuilder', () => {
    describe('buildSystemPrompt', () => {
        it('should return a comprehensive system prompt', () => {
            const prompt = PromptBuilder.buildSystemPrompt();

            expect(prompt).toContain('building surveyor');
            expect(prompt).toContain('early');
            expect(prompt).toContain('midway');
            expect(prompt).toContain('full');
            expect(prompt).toContain('immediate');
            expect(prompt).toContain('urgent');
            expect(prompt).toContain('JSON');
        });

        it('should include all required response fields', () => {
            const prompt = PromptBuilder.buildSystemPrompt();

            expect(prompt).toContain('damageType');
            expect(prompt).toContain('severity');
            expect(prompt).toContain('confidence');
            expect(prompt).toContain('homeownerExplanation');
            expect(prompt).toContain('contractorAdvice');
            expect(prompt).toContain('urgencyReasoning');
        });
    });

    describe('buildEvidenceSummary', () => {
        it('should build summary with no evidence', () => {
            const summary = PromptBuilder.buildEvidenceSummary([], null);

            expect(summary).toContain('No machine learning evidence');
        });

        it('should build summary with Roboflow detections', () => {
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'water_damage',
                    confidence: 85,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
                {
                    id: '2',
                    className: 'water_damage',
                    confidence: 90,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
                {
                    id: '3',
                    className: 'crack',
                    confidence: 75,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const summary = PromptBuilder.buildEvidenceSummary(detections, null);

            expect(summary).toContain('Machine Learning Detections');
            expect(summary).toContain('water_damage');
            expect(summary).toContain('2 detection(s)');
            expect(summary).toContain('87.5%'); // Average confidence
            expect(summary).toContain('crack');
            expect(summary).toContain('1 detection(s)');
            expect(summary).toContain('75.0%');
        });

        it('should build summary with vision analysis', () => {
            const visionAnalysis: VisionAnalysisSummary = {
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

            const summary = PromptBuilder.buildEvidenceSummary([], visionAnalysis);

            expect(summary).toContain('Vision Analysis');
            expect(summary).toContain('80%');
            expect(summary).toContain('water stain');
            expect(summary).toContain('ceiling');
            expect(summary).toContain('moisture');
            expect(summary).toContain('discoloration');
        });

        it('should build summary with both detections and vision', () => {
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'mold',
                    confidence: 95,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const visionAnalysis: VisionAnalysisSummary = {
                provider: 'google-vision',
                confidence: 85,
                labels: [{ description: 'mold growth', score: 0.9 }],
                objects: [],
                detectedFeatures: ['dark spots'],
                suggestedCategories: [],
            };

            const summary = PromptBuilder.buildEvidenceSummary(detections, visionAnalysis);

            expect(summary).toContain('Machine Learning Detections');
            expect(summary).toContain('mold');
            expect(summary).toContain('Vision Analysis');
            expect(summary).toContain('85%');
        });
    });

    describe('buildUserPrompt', () => {
        it('should build basic user prompt without context', () => {
            const prompt = PromptBuilder.buildUserPrompt(undefined, 'No evidence', false);

            expect(prompt).toContain('analyze');
            expect(prompt).toContain('building damage photos');
            expect(prompt).toContain('Machine learning detection services are unavailable');
            expect(prompt).toContain('JSON');
        });

        it('should include property context', () => {
            const context: AssessmentContext = {
                propertyType: 'residential',
                location: 'London',
                ageOfProperty: 50,
                propertyDetails: 'Victorian terraced house',
            };

            const prompt = PromptBuilder.buildUserPrompt(context, 'No evidence', false);

            expect(prompt).toContain('Property Context');
            expect(prompt).toContain('residential');
            expect(prompt).toContain('London');
            expect(prompt).toContain('50 years');
            expect(prompt).toContain('Victorian terraced house');
        });

        it('should include evidence summary when available', () => {
            const evidenceSummary = 'Machine Learning Detections:\n- water_damage: 2 detections';

            const prompt = PromptBuilder.buildUserPrompt(undefined, evidenceSummary, true);

            expect(prompt).toContain(evidenceSummary);
            expect(prompt).toContain('Use this machine learning evidence');
            expect(prompt).not.toContain('unavailable');
        });

        it('should handle partial context', () => {
            const context: AssessmentContext = {
                propertyType: 'commercial',
            };

            const prompt = PromptBuilder.buildUserPrompt(context, 'No evidence', false);

            expect(prompt).toContain('commercial');
            expect(prompt).not.toContain('Location:');
            expect(prompt).not.toContain('Age:');
        });
    });

    describe('buildMessages', () => {
        it('should build messages array with system and user prompts', () => {
            const imageUrls = ['https://example.com/image1.jpg'];

            const messages = PromptBuilder.buildMessages(imageUrls);

            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
        });

        it('should include all images in user message', () => {
            const imageUrls = [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
                'https://example.com/image3.jpg',
            ];

            const messages = PromptBuilder.buildMessages(imageUrls);

            const userMessage = messages[1];
            expect(userMessage.content).toHaveLength(4); // 1 text + 3 images
            expect(userMessage.content[0].type).toBe('text');
            expect(userMessage.content[1].type).toBe('image_url');
            expect(userMessage.content[2].type).toBe('image_url');
            expect(userMessage.content[3].type).toBe('image_url');
        });

        it('should limit to 4 images maximum', () => {
            const imageUrls = [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
                'https://example.com/image3.jpg',
                'https://example.com/image4.jpg',
                'https://example.com/image5.jpg',
                'https://example.com/image6.jpg',
            ];

            const messages = PromptBuilder.buildMessages(imageUrls);

            const userMessage = messages[1];
            expect(userMessage.content).toHaveLength(5); // 1 text + 4 images (max)
        });

        it('should include context in user prompt', () => {
            const imageUrls = ['https://example.com/image1.jpg'];
            const context: AssessmentContext = {
                propertyType: 'residential',
                location: 'Manchester',
            };

            const messages = PromptBuilder.buildMessages(imageUrls, context);

            const userMessage = messages[1];
            const textContent = userMessage.content[0].text;
            expect(textContent).toContain('residential');
            expect(textContent).toContain('Manchester');
        });

        it('should include detections in evidence summary', () => {
            const imageUrls = ['https://example.com/image1.jpg'];
            const detections: RoboflowDetection[] = [
                {
                    id: '1',
                    className: 'water_damage',
                    confidence: 90,
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    imageUrl: 'https://example.com/image.jpg',
                },
            ];

            const messages = PromptBuilder.buildMessages(imageUrls, undefined, detections);

            const userMessage = messages[1];
            const textContent = userMessage.content[0].text;
            expect(textContent).toContain('water_damage');
            expect(textContent).toContain('90.0%');
        });

        it('should set high detail for all images', () => {
            const imageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];

            const messages = PromptBuilder.buildMessages(imageUrls);

            const userMessage = messages[1];
            expect(userMessage.content[1].image_url.detail).toBe('high');
            expect(userMessage.content[2].image_url.detail).toBe('high');
        });
    });
});
