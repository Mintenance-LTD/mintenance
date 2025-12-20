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
     * Reset the service (useful for testing)
     */
    static reset(): void {
        this.learnedExtractor = null;
        this.initialized = false;
    }
}
