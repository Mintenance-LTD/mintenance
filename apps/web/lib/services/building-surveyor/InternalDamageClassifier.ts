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
import type { InferenceSession, Tensor } from 'onnxruntime-node';
import {
  detectionsToAssessment,
  getLowConfidencePrediction,
} from './internal-classifier/detection-helpers';
import {
  getTrainingDataStats,
  retrainModel,
} from './internal-classifier/training-helpers';
import { preprocessImageForYOLO } from './yolo-preprocessing';
import { postprocessYOLOOutput } from './yolo-postprocessing';
import { loadClassNames } from './yolo-class-names';
import type { DamageSeverity, UrgencyLevel } from './types';

// Lazy loader — onnxruntime-node is a native module excluded from the Vercel
// deployment package. Importing it statically causes module-not-found crashes
// on cold start. Load it only when actually running YOLO inference.
type OrtModule = typeof import('onnxruntime-node');
let cachedOrt: OrtModule | null = null;
async function loadOrt(): Promise<OrtModule | null> {
  if (cachedOrt) return cachedOrt;
  try {
    cachedOrt = await import('onnxruntime-node');
    return cachedOrt;
  } catch {
    return null;
  }
}

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
  private static modelSession: InferenceSession | null = null;
  private static classNames: string[] = [];

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: ModelConfig = {
    minSampleCount: 100, // Minimum validated samples before model is ready
    minAccuracy: 0.75, // Minimum accuracy before model is ready
    useRemoteModel: false, // Whether to use remote model API (future)
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
      const sampleCount =
        modelRecord.training_samples_count || metrics.samples || 0;

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
        const ort = await loadOrt();
        if (!ort) {
          logger.warn('onnxruntime-node not available in this environment', {
            service: this.SERVICE_NAME,
          });
          return false;
        }
        this.modelSession = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['cpu'], // Use 'cuda' if GPU available
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true,
        });

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
          return getLowConfidencePrediction();
        }
      }

      // 1. Preprocess image
      const preprocessed = await preprocessImageForYOLO(imageUrl);

      // 2. Create ONNX tensor
      const ort = await loadOrt();
      if (!ort) {
        return getLowConfidencePrediction();
      }
      const inputTensor = new ort.Tensor(
        'float32',
        preprocessed.tensor,
        [1, 3, 640, 640]
      );

      // 3. Run inference
      const feeds: Record<string, Tensor> = {};
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
      return detectionsToAssessment(detections);
    } catch (error) {
      logger.error('YOLO inference failed', error, {
        service: this.SERVICE_NAME,
        imageUrl,
      });

      // Return low confidence to trigger GPT-4 fallback
      return getLowConfidencePrediction();
    }
  }

  /**
   * Predict damage from features (backward compatibility)
   *
   * @deprecated Use predictFromImage instead
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async predict(features: number[]): Promise<InternalPrediction> {
    // Features-based prediction not implemented with YOLO
    // Return low confidence to trigger GPT-4 fallback
    return getLowConfidencePrediction();
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

  static async getTrainingDataStats() {
    return getTrainingDataStats();
  }

  static async triggerRetraining(): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    return retrainModel(
      this.DEFAULT_CONFIG.minSampleCount,
      this.DEFAULT_CONFIG.minAccuracy,
      () => this.reset()
    );
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
