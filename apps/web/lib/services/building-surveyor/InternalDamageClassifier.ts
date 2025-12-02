/**
 * Internal Damage Classifier
 *
 * Wrapper for trained internal ML models that can perform damage assessment.
 * This is a placeholder implementation that will be populated as models are trained.
 *
 * The model will be trained using:
 * - YOLO detection features
 * - Continuum memory embeddings
 * - Human-validated assessment data
 *
 * Training pipeline (separate from this service):
 * 1. Collect training data from validated assessments
 * 2. Extract features using FeatureExtractionService
 * 3. Train models using collected data
 * 4. Save model checkpoints
 * 5. Deploy models for inference
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import type { DamageSeverity, UrgencyLevel } from './types';

/**
 * Internal prediction result
 */
export interface InternalPrediction {
    damageType: string;
    severity: DamageSeverity;
    confidence: number;
    safetyHazards: unknown[];
    urgency: UrgencyLevel;
    features: number[];
}

/**
 * Model metadata
 */
export interface ModelInfo {
    version: string;
    accuracy: number;
    sampleCount: number;
    trainingDate: string;
    modelType: string;
    isReady: boolean;
}

/**
 * Model configuration
 */
interface ModelConfig {
    minSampleCount: number;
    minAccuracy: number;
    modelPath?: string;
    useRemoteModel: boolean;
}

/**
 * Internal Damage Classifier
 *
 * Loads and runs trained internal models for damage assessment.
 * Falls back to GPT-4 Vision when models are not available or not confident.
 */
export class InternalDamageClassifier {
    private static readonly SERVICE_NAME = 'InternalDamageClassifier';
    private static modelPath: string | null = null;
    private static modelVersion: string | null = null;
    private static modelMetadata: ModelInfo | null = null;
    private static isInitialized = false;

    /**
     * Default configuration
     */
    private static readonly DEFAULT_CONFIG: ModelConfig = {
        minSampleCount: 100,    // Minimum validated samples before model is ready
        minAccuracy: 0.75,      // Minimum accuracy before model is ready
        useRemoteModel: false,  // Whether to use remote model API (future)
    };

    /**
     * Load the latest trained model
     */
    static async loadLatestModel(): Promise<boolean> {
        try {
            logger.info('Loading latest internal model', {
                service: this.SERVICE_NAME,
            });

            // Check if we have a trained model available
            const { data: modelRecord, error } = await supabase
                .from('internal_model_registry')
                .select('*')
                .eq('model_type', 'damage_classifier')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !modelRecord) {
                logger.warn('No active internal model found', {
                    service: this.SERVICE_NAME,
                    error,
                });
                return false;
            }

            // Validate model meets minimum requirements
            if (
                modelRecord.sample_count < this.DEFAULT_CONFIG.minSampleCount ||
                modelRecord.accuracy < this.DEFAULT_CONFIG.minAccuracy
            ) {
                logger.warn('Model does not meet minimum requirements', {
                    service: this.SERVICE_NAME,
                    sampleCount: modelRecord.sample_count,
                    accuracy: modelRecord.accuracy,
                    minSampleCount: this.DEFAULT_CONFIG.minSampleCount,
                    minAccuracy: this.DEFAULT_CONFIG.minAccuracy,
                });
                return false;
            }

            // Store model metadata
            this.modelMetadata = {
                version: modelRecord.version,
                accuracy: modelRecord.accuracy,
                sampleCount: modelRecord.sample_count,
                trainingDate: modelRecord.created_at,
                modelType: modelRecord.model_type,
                isReady: true,
            };

            this.modelPath = modelRecord.model_path;
            this.modelVersion = modelRecord.version;
            this.isInitialized = true;

            logger.info('Internal model loaded successfully', {
                service: this.SERVICE_NAME,
                version: this.modelVersion,
                accuracy: this.modelMetadata.accuracy,
                sampleCount: this.modelMetadata.sampleCount,
            });

            return true;
        } catch (error) {
            logger.error('Failed to load internal model', error, {
                service: this.SERVICE_NAME,
            });
            return false;
        }
    }

    /**
     * Predict damage from features
     *
     * NOTE: This is a placeholder implementation. In production, this would:
     * 1. Load the trained model from storage
     * 2. Run inference on the features
     * 3. Return predictions with confidence scores
     *
     * For now, it returns a mock prediction with low confidence to trigger GPT-4 fallback
     */
    static async predict(features: number[]): Promise<InternalPrediction> {
        try {
            // Ensure model is loaded
            if (!this.isInitialized) {
                await this.loadLatestModel();
            }

            // If no model available, return low confidence prediction
            if (!this.isInitialized || !this.modelMetadata) {
                return this.getMockPrediction(features, 0.0);
            }

            // TODO: Actual model inference would happen here
            // This would involve:
            // 1. Loading the model weights from GCS or local storage
            // 2. Running inference on the features
            // 3. Applying any post-processing
            // 4. Calculating confidence based on model uncertainty

            // For now, return a mock prediction
            // The confidence is set low to ensure GPT-4 is used until real model is trained
            return this.getMockPrediction(features, 0.40);
        } catch (error) {
            logger.error('Model prediction failed', error, {
                service: this.SERVICE_NAME,
            });

            // Return low confidence prediction to trigger fallback
            return this.getMockPrediction(features, 0.0);
        }
    }

    /**
     * Check if model is ready for production use
     */
    static async isModelReady(): Promise<boolean> {
        try {
            // Try to load model if not initialized
            if (!this.isInitialized) {
                await this.loadLatestModel();
            }

            // Check if model exists and meets minimum requirements
            if (!this.modelMetadata) {
                return false;
            }

            return (
                this.modelMetadata.isReady &&
                this.modelMetadata.sampleCount >= this.DEFAULT_CONFIG.minSampleCount &&
                this.modelMetadata.accuracy >= this.DEFAULT_CONFIG.minAccuracy
            );
        } catch (error) {
            logger.error('Failed to check model readiness', error, {
                service: this.SERVICE_NAME,
            });
            return false;
        }
    }

    /**
     * Get model metadata
     */
    static getModelInfo(): ModelInfo {
        return (
            this.modelMetadata || {
                version: 'none',
                accuracy: 0,
                sampleCount: 0,
                trainingDate: new Date().toISOString(),
                modelType: 'damage_classifier',
                isReady: false,
            }
        );
    }

    /**
     * Get training data statistics
     */
    static async getTrainingDataStats(): Promise<{
        totalValidatedSamples: number;
        damageTypeDistribution: Record<string, number>;
        severityDistribution: Record<DamageSeverity, number>;
        averageConfidence: number;
    }> {
        try {
            // Get validated assessments count
            const { count: totalCount, error: countError } = await supabase
                .from('building_assessments')
                .select('*', { count: 'exact', head: true })
                .eq('validation_status', 'validated');

            if (countError) {
                throw countError;
            }

            // Get distribution of damage types
            const { data: assessments, error: assessmentsError } = await supabase
                .from('building_assessments')
                .select('damage_type, severity, confidence')
                .eq('validation_status', 'validated');

            if (assessmentsError) {
                throw assessmentsError;
            }

            const damageTypeDistribution: Record<string, number> = {};
            const severityDistribution: Record<DamageSeverity, number> = {
                early: 0,
                midway: 0,
                full: 0,
            };
            let totalConfidence = 0;

            for (const assessment of assessments || []) {
                // Count damage types
                const damageType = assessment.damage_type || 'unknown';
                damageTypeDistribution[damageType] =
                    (damageTypeDistribution[damageType] || 0) + 1;

                // Count severities
                const severity = assessment.severity as DamageSeverity;
                if (severity in severityDistribution) {
                    severityDistribution[severity]++;
                }

                // Sum confidence
                totalConfidence += assessment.confidence || 0;
            }

            const averageConfidence =
                (assessments?.length || 0) > 0
                    ? totalConfidence / (assessments?.length || 1)
                    : 0;

            return {
                totalValidatedSamples: totalCount || 0,
                damageTypeDistribution,
                severityDistribution,
                averageConfidence,
            };
        } catch (error) {
            logger.error('Failed to get training data stats', error, {
                service: this.SERVICE_NAME,
            });

            return {
                totalValidatedSamples: 0,
                damageTypeDistribution: {},
                severityDistribution: { early: 0, midway: 0, full: 0 },
                averageConfidence: 0,
            };
        }
    }

    /**
     * Trigger model retraining
     *
     * This would typically be called:
     * - Periodically (e.g., weekly)
     * - When sufficient new validated data is available
     * - When model performance drops
     */
    static async triggerRetraining(): Promise<{
        success: boolean;
        jobId?: string;
        error?: string;
    }> {
        try {
            // Check if we have enough new data since last training
            const stats = await this.getTrainingDataStats();

            if (stats.totalValidatedSamples < this.DEFAULT_CONFIG.minSampleCount) {
                return {
                    success: false,
                    error: `Insufficient training data. Need ${this.DEFAULT_CONFIG.minSampleCount}, have ${stats.totalValidatedSamples}`,
                };
            }

            // Create a training job record
            const { data: job, error } = await supabase
                .from('model_training_jobs')
                .insert({
                    model_type: 'damage_classifier',
                    sample_count: stats.totalValidatedSamples,
                    status: 'pending',
                    config: {
                        minAccuracy: this.DEFAULT_CONFIG.minAccuracy,
                        features: 'yolo_features',
                    },
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

            logger.info('Model retraining job created', {
                service: this.SERVICE_NAME,
                jobId: job.id,
                sampleCount: stats.totalValidatedSamples,
            });

            // TODO: Trigger actual training pipeline
            // This would typically involve:
            // 1. Exporting training data from database
            // 2. Running training script (could be Cloud Run job, GCP AI Platform, etc.)
            // 3. Evaluating model performance
            // 4. Saving model checkpoint
            // 5. Updating model registry

            return {
                success: true,
                jobId: job.id,
            };
        } catch (error) {
            logger.error('Failed to trigger retraining', error, {
                service: this.SERVICE_NAME,
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Mock prediction (placeholder until real model is trained)
     */
    private static getMockPrediction(
        features: number[],
        confidence: number
    ): InternalPrediction {
        // Use simple heuristics based on features to generate a prediction
        // This is just for testing - real model would be much more sophisticated

        // Feature analysis (very simplified)
        const featureMean = features.reduce((a, b) => a + b, 0) / features.length;
        const hasHighValues = features.some((f) => f > 0.7);

        let damageType = 'unknown_damage';
        let severity: DamageSeverity = 'early';
        let urgency: UrgencyLevel = 'monitor';

        if (featureMean > 0.6) {
            damageType = 'structural_damage';
            severity = 'full';
            urgency = 'urgent';
        } else if (featureMean > 0.4) {
            damageType = 'water_damage';
            severity = 'midway';
            urgency = 'soon';
        } else if (hasHighValues) {
            damageType = 'minor_damage';
            severity = 'early';
            urgency = 'planned';
        }

        return {
            damageType,
            severity,
            confidence: Math.max(0, Math.min(100, confidence * 100)),
            safetyHazards: urgency === 'urgent' ? [{ type: 'structural', severity: 'high' }] : [],
            urgency,
            features,
        };
    }

    /**
     * Reset model state (useful for testing)
     */
    static reset(): void {
        this.modelPath = null;
        this.modelVersion = null;
        this.modelMetadata = null;
        this.isInitialized = false;
    }
}
