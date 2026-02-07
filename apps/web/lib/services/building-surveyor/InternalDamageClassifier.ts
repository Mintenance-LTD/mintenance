/**
 * Internal Damage Classifier
 *
 * Loads and runs YOLO ONNX models for damage assessment.
 * Falls back to GPT-4 Vision when models are not available or not confident.
 *
 * The model uses:
 * - YOLO v11 trained on building damage dataset
 * - ONNX Runtime for inference
 * - Preprocessing and postprocessing utilities
 *
 * Production Pipeline:
 * 1. Load ONNX model from Supabase storage
 * 2. Preprocess images to 640x640 tensors
 * 3. Run inference with ONNX Runtime
 * 4. Postprocess outputs with NMS
 * 5. Map detections to damage assessment
 */

import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import * as ort from 'onnxruntime-node';
import { preprocessImageForYOLO } from './yolo-preprocessing';
import { postprocessYOLOOutput, type YOLODetection } from './yolo-postprocessing';
import { loadClassNames } from './yolo-class-names';
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
 * Loads and runs YOLO ONNX models for damage assessment.
 * Falls back to GPT-4 Vision when models are not available or not confident.
 */
export class InternalDamageClassifier {
    private static readonly SERVICE_NAME = 'InternalDamageClassifier';
    private static modelPath: string | null = null;
    private static modelVersion: string | null = null;
    private static modelMetadata: ModelInfo | null = null;
    private static isInitialized = false;

    // ONNX Runtime session for model inference
    private static modelSession: ort.InferenceSession | null = null;
    private static classNames: string[] = [];

    /**
     * Default configuration
     */
    private static readonly DEFAULT_CONFIG: ModelConfig = {
        minSampleCount: 100,    // Minimum validated samples before model is ready
        minAccuracy: 0.75,      // Minimum accuracy before model is ready
        useRemoteModel: false,  // Whether to use remote model API (future)
    };

    /**
     * Load the latest trained YOLO ONNX model from Supabase
     */
    static async loadLatestModel(): Promise<boolean> {
        try {
            logger.info('Loading latest YOLO ONNX model', {
                service: this.SERVICE_NAME,
            });

            // Check if we have a trained model available in yolo_models table
            const { data: modelRecord, error } = await supabase
                .from('yolo_models')
                .select('*')
                .eq('is_active', true)
                .eq('model_type', 'onnx')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !modelRecord) {
                // Fallback to internal_model_registry for backward compatibility
                const { data: fallbackRecord } = await supabase
                    .from('internal_model_registry')
                    .select('*')
                    .eq('model_type', 'damage_classifier')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!fallbackRecord) {
                    logger.warn('No active YOLO model found', {
                        service: this.SERVICE_NAME,
                        error,
                    });
                    return false;
                }

                modelRecord.storage_path = fallbackRecord.model_path;
                modelRecord.model_version = fallbackRecord.version;
                modelRecord.performance_metrics = {
                    accuracy: fallbackRecord.accuracy,
                    samples: fallbackRecord.sample_count,
                };
            }

            // Validate model meets minimum requirements
            const metrics = modelRecord.performance_metrics || {};
            const accuracy = metrics.mAP50 || metrics.accuracy || 0;
            const sampleCount = modelRecord.training_samples_count || metrics.samples || 0;

            if (
                sampleCount < this.DEFAULT_CONFIG.minSampleCount ||
                accuracy < this.DEFAULT_CONFIG.minAccuracy
            ) {
                logger.warn('Model does not meet minimum requirements', {
                    service: this.SERVICE_NAME,
                    sampleCount,
                    accuracy,
                    minSampleCount: this.DEFAULT_CONFIG.minSampleCount,
                    minAccuracy: this.DEFAULT_CONFIG.minAccuracy,
                });
                return false;
            }

            // Download ONNX model from Supabase storage
            let modelBuffer: ArrayBuffer;

            if (modelRecord.storage_path) {
                // Model is in storage bucket
                const { data, error: downloadError } = await supabase.storage
                    .from(modelRecord.storage_bucket || 'yolo-models')
                    .download(modelRecord.storage_path);

                if (downloadError || !data) {
                    logger.error('Failed to download model from storage', {
                        service: this.SERVICE_NAME,
                        error: downloadError,
                        path: modelRecord.storage_path,
                    });
                    return false;
                }

                modelBuffer = await data.arrayBuffer();
            } else if (modelRecord.model_data) {
                // Model is stored as BYTEA (legacy)
                modelBuffer = modelRecord.model_data.buffer;
            } else {
                logger.error('No model data found', {
                    service: this.SERVICE_NAME,
                });
                return false;
            }

            // Create ONNX Runtime session
            try {
                this.modelSession = await ort.InferenceSession.create(
                    modelBuffer,
                    {
                        executionProviders: ['cpu'], // Use 'cuda' if GPU available
                        graphOptimizationLevel: 'all',
                        enableCpuMemArena: true,
                        enableMemPattern: true,
                    }
                );

                logger.info('ONNX model loaded successfully', {
                    service: this.SERVICE_NAME,
                    inputNames: this.modelSession.inputNames,
                    outputNames: this.modelSession.outputNames,
                });
            } catch (onnxError) {
                logger.error('Failed to create ONNX session', {
                    service: this.SERVICE_NAME,
                    error: onnxError,
                });
                return false;
            }

            // Load class names
            this.classNames = loadClassNames();

            // Store model metadata
            this.modelMetadata = {
                version: modelRecord.model_version || 'unknown',
                accuracy,
                sampleCount,
                trainingDate: modelRecord.created_at,
                modelType: 'yolo_onnx',
                isReady: true,
            };

            this.modelPath = modelRecord.storage_path || 'in-memory';
            this.modelVersion = modelRecord.model_version;
            this.isInitialized = true;

            logger.info('YOLO ONNX model ready for inference', {
                service: this.SERVICE_NAME,
                version: this.modelVersion,
                accuracy: this.modelMetadata.accuracy,
                sampleCount: this.modelMetadata.sampleCount,
                classCount: this.classNames.length,
            });

            return true;
        } catch (error) {
            logger.error('Failed to load YOLO ONNX model', error, {
                service: this.SERVICE_NAME,
            });
            return false;
        }
    }

    /**
     * Predict damage from image URL using YOLO ONNX model
     *
     * This runs actual YOLO inference:
     * 1. Preprocess image to 640x640 tensor
     * 2. Run ONNX model inference
     * 3. Postprocess detections with NMS
     * 4. Convert to damage assessment
     *
     * @param imageUrl - URL or path to image
     * @returns Damage prediction with confidence
     */
    static async predictFromImage(imageUrl: string): Promise<InternalPrediction> {
        try {
            // Ensure model is loaded
            if (!this.isInitialized || !this.modelSession) {
                const loaded = await this.loadLatestModel();
                if (!loaded || !this.modelSession) {
                    logger.warn('No YOLO model available, returning low confidence', {
                        service: this.SERVICE_NAME,
                    });
                    return this.getLowConfidencePrediction();
                }
            }

            // 1. Preprocess image
            const preprocessed = await preprocessImageForYOLO(imageUrl);

            // 2. Create ONNX tensor
            const inputTensor = new ort.Tensor('float32', preprocessed.tensor, [1, 3, 640, 640]);

            // 3. Run inference
            const feeds: Record<string, ort.Tensor> = {};
            feeds[this.modelSession.inputNames[0]] = inputTensor;

            const results = await this.modelSession.run(feeds);

            // 4. Get output tensor
            const outputName = this.modelSession.outputNames[0];
            const outputTensor = results[outputName];

            // 5. Postprocess detections
            const detections = postprocessYOLOOutput(
                outputTensor.data as Float32Array,
                {
                    classNames: this.classNames,
                    scaleX: preprocessed.scaleX,
                    scaleY: preprocessed.scaleY,
                    confidenceThreshold: 0.25,
                    iouThreshold: 0.45,
                }
            );

            // 6. Convert detections to damage assessment
            return this.detectionsToAssessment(detections);

        } catch (error) {
            logger.error('YOLO inference failed', error, {
                service: this.SERVICE_NAME,
                imageUrl,
            });

            // Return low confidence to trigger GPT-4 fallback
            return this.getLowConfidencePrediction();
        }
    }

    /**
     * Predict damage from features (backward compatibility)
     *
     * @deprecated Use predictFromImage instead
     */
    static async predict(features: number[]): Promise<InternalPrediction> {
        // Features-based prediction not implemented with YOLO
        // Return low confidence to trigger GPT-4 fallback
        return this.getLowConfidencePrediction();
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

            // Delegate to KnowledgeDistillationService for actual training
            // Uses lazy import to avoid circular dependency
            const { KnowledgeDistillationService } = await import('./KnowledgeDistillationService');
            const result = await KnowledgeDistillationService.trainDamageClassifier(job.id);

            if (result.success) {
                // Reset cached model so next inference loads the new version
                this.reset();

                logger.info('Retraining completed, model cache cleared', {
                    service: this.SERVICE_NAME,
                    jobId: job.id,
                    modelVersion: result.modelVersion,
                    samplesUsed: result.samplesUsed,
                });
            }

            return {
                success: result.success,
                jobId: job.id,
                error: result.error,
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
     * Convert YOLO detections to damage assessment
     */
    private static detectionsToAssessment(detections: YOLODetection[]): InternalPrediction {
        if (detections.length === 0) {
            return this.getLowConfidencePrediction();
        }

        // Categorize detections by severity
        const severeClasses = [
            'bare_electrical_wire', 'dangerous_electrical_socket', 'unstable',
            'damaged_tower', 'damaged_roof', 'structural_damage'
        ];
        const moderateClasses = [
            'crack', 'damaged_wall', 'damaged_brick', 'spalling',
            'leaking_damage_on_wood', 'wall_leaking', 'burst', 'hole'
        ];
        const minorClasses = [
            'minor_crack', 'damp', 'mold', 'rust_on_radiator',
            'loose_pipes', 'wall_stain'
        ];

        // Find most severe damage type
        let primaryDamage = detections[0]; // Default to highest confidence
        let severity: DamageSeverity = 'early';
        let urgency: UrgencyLevel = 'monitor';
        const safetyHazards: Array<{ type: string; description: string; recommendation: string }> = [];

        for (const detection of detections) {
            const className = detection.className.toLowerCase();

            if (severeClasses.some(c => className.includes(c))) {
                primaryDamage = detection;
                severity = 'full';
                urgency = 'urgent';
                safetyHazards.push({
                    type: className,
                    severity: 'high',
                    confidence: detection.confidence,
                });
                break; // Severe damage takes priority
            } else if (moderateClasses.some(c => className.includes(c))) {
                if (severity === 'early') {
                    primaryDamage = detection;
                    severity = 'midway';
                    urgency = 'soon';
                }
            } else if (minorClasses.some(c => className.includes(c))) {
                if (severity === 'early') {
                    primaryDamage = detection;
                    urgency = 'planned';
                }
            }
        }

        // Calculate overall confidence (average of top 3 detections)
        const topDetections = detections.slice(0, 3);
        const avgConfidence = topDetections.reduce((sum, d) => sum + d.confidence, 0) / topDetections.length;

        // Map damage type
        const damageTypeMapping: Record<string, string> = {
            crack: 'structural_crack',
            damaged_wall: 'wall_damage',
            damp: 'water_damage',
            mold: 'mold_damage',
            bare_electrical_wire: 'electrical_hazard',
            damaged_roof: 'roof_damage',
            spalling: 'concrete_spalling',
        };

        const damageType = Object.keys(damageTypeMapping).find(key =>
            primaryDamage.className.toLowerCase().includes(key)
        ) || primaryDamage.className;

        return {
            damageType: damageTypeMapping[damageType] || damageType,
            severity,
            confidence: Math.round(avgConfidence * 100),
            safetyHazards,
            urgency,
            features: [], // Not using features with YOLO
        };
    }

    /**
     * Get low confidence prediction (triggers GPT-4 fallback)
     */
    private static getLowConfidencePrediction(): InternalPrediction {
        return {
            damageType: 'unknown',
            severity: 'early',
            confidence: 0, // Low confidence triggers GPT-4
            safetyHazards: [],
            urgency: 'monitor',
            features: [],
        };
    }

    /**
     * Reset model state (useful for testing)
     */
    static reset(): void {
        // Dispose ONNX session if loaded
        if (this.modelSession) {
            this.modelSession.release();
            this.modelSession = null;
        }

        this.modelPath = null;
        this.modelVersion = null;
        this.modelMetadata = null;
        this.isInitialized = false;
        this.classNames = [];
    }
}
