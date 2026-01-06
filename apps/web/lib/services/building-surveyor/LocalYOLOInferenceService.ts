/**
 * Local YOLO Inference Service
 *
 * Runs YOLO model inference locally using ONNX Runtime.
 * Supports both GPU (CUDA) and CPU execution.
 *
 * This service provides the same output format as RoboflowDetectionService
 * for seamless integration.
 */

import * as ort from 'onnxruntime-node';
import { logger } from '@mintenance/shared';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { preprocessImageForYOLO, type PreprocessedImage } from './yolo-preprocessing';
import { postprocessYOLOOutput, type YOLODetection } from './yolo-postprocessing';
import { loadClassNames } from './yolo-class-names';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { RoboflowDetection } from './types';

export interface LocalYOLOConfig {
  /** Path to ONNX model file (if loading from file system) */
  modelPath?: string;
  /** Load from database instead of file system */
  loadFromDatabase?: boolean;
  /** Model name in database (if loadFromDatabase=true) */
  databaseModelName?: string;
  /** Path to data.yaml file (optional, for class names) */
  dataYamlPath?: string;
  /** Confidence threshold (default: 0.25) */
  confidenceThreshold?: number;
  /** IoU threshold for NMS (default: 0.45) */
  iouThreshold?: number;
  /** Maximum detections per image (default: 300) */
  maxDetections?: number;
  /** Use GPU if available (default: true) */
  useGPU?: boolean;
}

/**
 * Local YOLO Inference Service
 *
 * Handles model loading, inference, and result formatting.
 */
export class LocalYOLOInferenceService {
  private static model: ort.InferenceSession | null = null;
  private static classNames: string[] = [];
  private static config: LocalYOLOConfig | null = null;
  private static initialized = false;

  /**
   * Initialize the local YOLO model
   *
   * @param config - Configuration for local inference
   */
  static async initialize(config: LocalYOLOConfig): Promise<void> {
    if (this.initialized && this.model) {
      logger.info('Local YOLO model already initialized', {
        service: 'LocalYOLOInferenceService',
      });
      return;
    }

    try {
      this.config = config;

      // Load class names
      this.classNames = loadClassNames(config.dataYamlPath);

      // Determine execution providers
      const executionProviders: string[] = [];
      if (config.useGPU !== false) {
        // Try GPU first (CUDA)
        executionProviders.push('cuda');
      }
      executionProviders.push('cpu'); // Fallback to CPU

      // Load model from file system or database
      let modelPathToLoad: string;
      
      if (config.loadFromDatabase) {
        logger.info('Loading YOLO model from database', {
          service: 'LocalYOLOInferenceService',
          modelName: config.databaseModelName || 'yolov11',
        });

        modelPathToLoad = await this.loadModelFromDatabase(
          config.databaseModelName || 'yolov11'
        );
      } else {
        if (!config.modelPath) {
          throw new Error('modelPath is required when loadFromDatabase is false');
        }
        modelPathToLoad = config.modelPath;
      }

      // Load ONNX model
      logger.info('Loading local YOLO model', {
        service: 'LocalYOLOInferenceService',
        modelPath: modelPathToLoad,
        source: config.loadFromDatabase ? 'database' : 'file',
        executionProviders,
      });

      this.model = await ort.InferenceSession.create(modelPathToLoad, {
        executionProviders,
      });

      this.initialized = true;

      logger.info('Local YOLO model initialized successfully', {
        service: 'LocalYOLOInferenceService',
        inputNames: this.model.inputNames,
        outputNames: this.model.outputNames,
        classCount: this.classNames.length,
      });
    } catch (error) {
      logger.error('Failed to initialize local YOLO model', {
        service: 'LocalYOLOInferenceService',
        error,
        config,
      });
      throw new Error(`Failed to initialize local YOLO model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if local inference is available
   */
  static isAvailable(): boolean {
    return this.initialized && this.model !== null;
  }

  /**
   * Run inference on images and return detections in RoboflowDetection format
   *
   * @param imageUrls - Array of image URLs or file paths
   * @returns Array of detections (same format as RoboflowDetectionService)
   */
  static async detect(imageUrls: string[]): Promise<RoboflowDetection[]> {
    if (!this.isAvailable()) {
      throw new Error('Local YOLO model not initialized. Call initialize() first.');
    }

    if (!this.config) {
      throw new Error('Local YOLO config not set');
    }

    const allDetections: RoboflowDetection[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Preprocess image
        const preprocessed = await preprocessImageForYOLO(imageUrl);

        // Run inference
        const rawOutput = await this.runInference(preprocessed.tensor);

        // Postprocess outputs
        const detections = postprocessYOLOOutput(rawOutput, {
          confidenceThreshold: this.config.confidenceThreshold ?? 0.25,
          iouThreshold: this.config.iouThreshold ?? 0.45,
          maxDetections: this.config.maxDetections ?? 300,
          classNames: this.classNames,
          scaleX: preprocessed.scaleX,
          scaleY: preprocessed.scaleY,
        });

        // Convert to RoboflowDetection format
        const roboflowDetections: RoboflowDetection[] = detections.map((det, index) => ({
          id: `${det.className}-${det.x}-${det.y}-${index}`,
          className: det.className,
          confidence: Math.round(det.confidence * 100),
          boundingBox: {
            x: Math.round(det.x),
            y: Math.round(det.y),
            width: Math.round(det.width),
            height: Math.round(det.height),
          },
          imageUrl,
        }));

        allDetections.push(...roboflowDetections);
      } catch (error) {
        logger.warn('Local YOLO inference failed for image', {
          service: 'LocalYOLOInferenceService',
          imageUrl,
          error,
        });
        // Continue with other images
      }
    }

    return allDetections;
  }

  /**
   * Run model inference on preprocessed tensor
   */
  private static async runInference(tensor: Float32Array): Promise<Float32Array> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    // Create input tensor
    // YOLO expects: [batch, channels, height, width] = [1, 3, 640, 640]
    const inputShape = [1, 3, 640, 640];
    const inputTensor = new ort.Tensor('float32', tensor, inputShape);

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds[this.model.inputNames[0]] = inputTensor;

    const results = await this.model.run(feeds);

    // Extract output (YOLO typically has one output)
    const outputName = this.model.outputNames[0];
    const outputTensor = results[outputName];

    if (!outputTensor || !(outputTensor.data instanceof Float32Array)) {
      throw new Error('Invalid model output format');
    }

    return outputTensor.data as Float32Array;
  }

  /**
   * Load model from database with dual-mode support (Storage + BYTEA)
   * Priority: 1) Storage (if migrated), 2) BYTEA (backward compatibility)
   * ONNX Runtime requires a file path, so we download and save to temp
   */
  private static async loadModelFromDatabase(modelName: string): Promise<string> {
    try {
      // First try to get active model, then fallback to latest
      const { data, error } = await serverSupabase
        .from('yolo_models')
        .select('storage_path, storage_bucket, checksum, model_data, file_size, is_active')
        .eq('model_name', modelName)
        .order('is_active', { ascending: false }) // Active models first
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error(`Failed to load model from database: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Model '${modelName}' not found in database`);
      }

      let modelBuffer: Buffer;
      const fileSizeMB = (data.file_size / (1024 * 1024)).toFixed(2);

      // Try Storage first (if model has been migrated)
      if (data.storage_path && data.storage_bucket) {
        logger.info('Loading model from Supabase Storage', {
          service: 'LocalYOLOInferenceService',
          modelName,
          storagePath: data.storage_path,
          bucket: data.storage_bucket,
          fileSizeMB,
          isActive: data.is_active,
        });

        try {
          // Download from Storage
          const { data: storageData, error: downloadError } = await serverSupabase
            .storage
            .from(data.storage_bucket)
            .download(data.storage_path);

          if (downloadError) {
            throw new Error(`Storage download failed: ${downloadError.message}`);
          }

          if (!storageData) {
            throw new Error('No data received from storage');
          }

          modelBuffer = Buffer.from(await storageData.arrayBuffer());

          // Validate checksum if available
          if (data.checksum) {
            const calculatedChecksum = createHash('sha256').update(modelBuffer).digest('hex');
            if (calculatedChecksum !== data.checksum) {
              logger.warn('Checksum mismatch, but continuing', {
                service: 'LocalYOLOInferenceService',
                modelName,
                expected: data.checksum,
                actual: calculatedChecksum,
              });
            } else {
              logger.info('Model checksum verified', {
                service: 'LocalYOLOInferenceService',
                modelName,
                checksum: data.checksum,
              });
            }
          }
        } catch (storageError: unknown) {
          logger.warn('Failed to load from Storage, trying BYTEA fallback', {
            service: 'LocalYOLOInferenceService',
            modelName,
            error: storageError.message,
          });

          // Fallback to BYTEA if available
          if (data.model_data) {
            modelBuffer = Buffer.from(data.model_data as ArrayBuffer);
            logger.info('Loaded from BYTEA fallback', {
              service: 'LocalYOLOInferenceService',
              modelName,
              fileSizeMB,
            });
          } else {
            throw storageError; // Re-throw if no fallback available
          }
        }
      } else if (data.model_data) {
        // Load from BYTEA (backward compatibility for non-migrated models)
        logger.info('Loading model from database BYTEA', {
          service: 'LocalYOLOInferenceService',
          modelName,
          fileSizeMB,
        });
        modelBuffer = Buffer.from(data.model_data as ArrayBuffer);
      } else {
        throw new Error('Model has neither storage path nor BYTEA data');
      }

      // Save to temporary file (ONNX Runtime needs file path)
      const tempPath = join(tmpdir(), `yolo-${modelName}-${Date.now()}.onnx`);
      writeFileSync(tempPath, modelBuffer);

      // Register cleanup on process exit
      process.once('exit', () => {
        try {
          if (existsSync(tempPath)) {
            unlinkSync(tempPath);
          }
        } catch (err) {
          // Ignore cleanup errors
        }
      });

      logger.info('Model saved to temporary file', {
        service: 'LocalYOLOInferenceService',
        tempPath,
        sizeMB: fileSizeMB,
      });

      return tempPath;
    } catch (error) {
      logger.error('Failed to load model from database', {
        service: 'LocalYOLOInferenceService',
        modelName,
        error,
      });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  static async cleanup(): Promise<void> {
    if (this.model) {
      // ONNX Runtime doesn't have explicit cleanup, but we can null the reference
      this.model = null;
      this.initialized = false;
      logger.info('Local YOLO model cleaned up', {
        service: 'LocalYOLOInferenceService',
      });
    }
  }
}

