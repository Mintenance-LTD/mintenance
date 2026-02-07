/**
 * Feature Extraction Service
 * 
 * Handles both learned and handcrafted feature extraction.
 * Provides a unified interface for feature extraction with automatic fallback.
 */

import { logger } from '@mintenance/shared';
import { LearnedFeatureExtractor } from '../LearnedFeatureExtractor';
import { extractHandcraftedFeatures } from '../utils/FeatureExtractionUtils';
import { getConfig } from '../config/BuildingSurveyorConfig';
import type {
    AssessmentContext,
    RoboflowDetection,
    VisionAnalysisSummary,
    Phase1BuildingAssessment,
} from '../types';

export class FeatureExtractionService {
    private static readonly AGENT_NAME = 'building-surveyor';
    private static learnedExtractor: LearnedFeatureExtractor | null = null;
    private static initialized = false;

    /**
     * Initialize the feature extraction service
     */
    static async initialize(): Promise<void> {
        if (this.initialized) return;

        const config = getConfig();

        // Initialize learned feature extractor if enabled
        if (config.useLearnedFeatures) {
            try {
                this.learnedExtractor = new LearnedFeatureExtractor(
                    this.AGENT_NAME,
                    {
                        inputDim: 50,  // Raw input dimension (will be padded/truncated)
                        outputDim: 40, // Fixed output dimension (matches handcrafted features)
                        hiddenDims: [64, 48],
                        learningRate: 0.001,
                        regularization: 0.0001,
                    }
                );

                await this.learnedExtractor.loadState();

                logger.info('Learned feature extractor initialized', {
                    service: 'FeatureExtractionService',
                    agentName: this.AGENT_NAME,
                });
            } catch (error) {
                logger.error('Failed to initialize learned feature extractor', error, {
                    service: 'FeatureExtractionService',
                });
                // Will fall back to handcrafted features
                this.learnedExtractor = null;
            }
        }

        this.initialized = true;
    }

    /**
     * Extract features using the best available method
     * 
     * Tries learned features first (if enabled), falls back to handcrafted
     */
    static async extractFeatures(
        imageUrls: string[],
        context?: AssessmentContext,
        assessment?: Phase1BuildingAssessment,
        roboflowDetections?: RoboflowDetection[],
        visionSummary?: VisionAnalysisSummary | null
    ): Promise<number[]> {
        await this.initialize();

        const config = getConfig();

        // Try learned feature extraction if available and enabled
        if (config.useLearnedFeatures && this.learnedExtractor) {
            try {
                return await this.learnedExtractor.extractFeatures(
                    imageUrls,
                    context,
                    roboflowDetections,
                    visionSummary
                );
            } catch (error) {
                logger.warn('Learned feature extraction failed, falling back to handcrafted', {
                    service: 'FeatureExtractionService',
                    error: error instanceof Error ? error.message : 'unknown',
                });
                // Fall through to handcrafted features
            }
        }

        // Use handcrafted features (fallback or primary method)
        return extractHandcraftedFeatures(
            imageUrls,
            context,
            assessment,
            roboflowDetections,
            visionSummary
        );
    }

    /**
     * Extract handcrafted features explicitly
     * 
     * Useful for A/B testing or when you specifically want handcrafted features
     */
    static async extractHandcraftedFeatures(
        imageUrls: string[],
        context?: AssessmentContext,
        assessment?: Phase1BuildingAssessment,
        roboflowDetections?: RoboflowDetection[],
        visionSummary?: VisionAnalysisSummary | null
    ): Promise<number[]> {
        return extractHandcraftedFeatures(
            imageUrls,
            context,
            assessment,
            roboflowDetections,
            visionSummary
        );
    }

    /**
     * Extract learned features explicitly
     * 
     * Throws error if learned extractor is not available
     */
    static async extractLearnedFeatures(
        imageUrls: string[],
        context?: AssessmentContext,
        roboflowDetections?: RoboflowDetection[],
        visionSummary?: VisionAnalysisSummary | null
    ): Promise<number[]> {
        await this.initialize();

        if (!this.learnedExtractor) {
            throw new Error('Learned feature extractor is not available');
        }

        return this.learnedExtractor.extractFeatures(
            imageUrls,
            context,
            roboflowDetections,
            visionSummary
        );
    }

    /**
     * Get the learned feature extractor instance
     * 
     * Returns null if not initialized or not enabled
     */
    static getLearnedExtractor(): LearnedFeatureExtractor | null {
        return this.learnedExtractor;
    }

    /**
     * Check if learned features are enabled and available
     */
    static isLearnedFeaturesAvailable(): boolean {
        return this.learnedExtractor !== null;
    }

    /**
     * Learn from assessment feedback when GPT-4 disagrees with internal model.
     * Converts the GPT-4 assessment into a surprise signal vector and feeds it
     * to the learned feature extractor for online adaptation.
     *
     * @param rawFeatures - Raw input features used during the original prediction
     * @param gpt4Assessment - GPT-4's assessment (the teacher ground truth)
     */
    static async learnFromAssessmentFeedback(
        rawFeatures: number[],
        gpt4Assessment: Phase1BuildingAssessment
    ): Promise<void> {
        if (!this.learnedExtractor) return;

        try {
            // Convert GPT-4 assessment to a target feature vector (surprise signal)
            const surpriseSignal = this.assessmentToSurpriseSignal(gpt4Assessment);

            await this.learnedExtractor.learnFromSurprise(rawFeatures, surpriseSignal);

            logger.debug('Feature extractor learned from assessment feedback', {
                service: 'FeatureExtractionService',
                damageType: gpt4Assessment.damageAssessment.damageType,
                confidence: gpt4Assessment.damageAssessment.confidence,
            });
        } catch (error) {
            logger.warn('Failed to learn from assessment feedback', {
                service: 'FeatureExtractionService',
                error: error instanceof Error ? error.message : 'unknown',
            });
        }
    }

    /**
     * Convert a GPT-4 assessment into a numeric surprise signal vector
     * for the learned feature extractor.
     */
    private static assessmentToSurpriseSignal(assessment: Phase1BuildingAssessment): number[] {
        const signal: number[] = new Array(40).fill(0);

        // Encode damage confidence (position 0)
        signal[0] = (assessment.damageAssessment.confidence || 0) / 100;

        // Encode severity (positions 1-3)
        const severityMap: Record<string, number> = { early: 0.33, midway: 0.66, full: 1.0 };
        signal[1] = severityMap[assessment.damageAssessment.severity] || 0;

        // Encode urgency (positions 2-6)
        const urgencyMap: Record<string, number> = {
            monitor: 0.2, planned: 0.4, soon: 0.6, urgent: 0.8, immediate: 1.0,
        };
        signal[2] = urgencyMap[assessment.urgency.urgency] || 0;

        // Encode safety score (position 3)
        signal[3] = (assessment.safetyHazards.overallSafetyScore || 0) / 100;

        // Encode compliance score (position 4)
        signal[4] = (assessment.compliance.complianceScore || 0) / 100;

        // Encode risk score (position 5)
        signal[5] = (assessment.insuranceRisk.riskScore || 0) / 100;

        // Encode priority score (position 6)
        signal[6] = (assessment.urgency.priorityScore || 0) / 100;

        // Encode hazard count (position 7)
        signal[7] = Math.min((assessment.safetyHazards.hazards?.length || 0) / 5, 1);

        // Encode critical hazards flag (position 8)
        signal[8] = assessment.safetyHazards.hasCriticalHazards ? 1.0 : 0.0;

        // Encode detected items count (position 9)
        signal[9] = Math.min((assessment.damageAssessment.detectedItems?.length || 0) / 10, 1);

        return signal;
    }

    /**
     * Reset the service (useful for testing)
     */
    static reset(): void {
        this.learnedExtractor = null;
        this.initialized = false;
    }
}
