/**
 * Roboflow Configuration
 *
 * Centralized accessors for Roboflow inference credentials and settings.
 * Values are pulled dynamically from environment variables to support
 * runtime overrides without rebuilding.
 *
 * Environment variables:
 * - ROBOFLOW_API_KEY: Your Roboflow API key
 * - ROBOFLOW_MODEL_ID: The model ID (e.g., "building-defect-detection-7-ks0im")
 * - ROBOFLOW_MODEL_VERSION: The model version number (e.g., "1", "2", "3")
 *   This corresponds to the version segment in the detect URL.
 *   Update this when deploying a new trained model version.
 * - ROBOFLOW_TIMEOUT_MS: Request timeout in milliseconds (default: 10000)
 * - USE_LOCAL_YOLO: Set to "true" to use local YOLO model instead of API (default: false)
 * - YOLO_MODEL_PATH: Path to ONNX model file (required if USE_LOCAL_YOLO=true)
 * - YOLO_DATA_YAML_PATH: Path to data.yaml file (optional, for class names)
 * - YOLO_CONFIDENCE_THRESHOLD: Confidence threshold (default: 0.25)
 * - YOLO_IOU_THRESHOLD: IoU threshold for NMS (default: 0.45)
 */

import { logger } from '@mintenance/shared';

export interface RoboflowConfig {
  readonly apiKey: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  /** Use local YOLO model instead of API */
  readonly useLocalYOLO: boolean;
  /** Path to ONNX model file (if using local inference from file) */
  readonly yoloModelPath?: string;
  /** Load model from database instead of file system */
  readonly yoloLoadFromDatabase?: boolean;
  /** Model name in database (if loading from database) */
  readonly yoloDatabaseModelName?: string;
  /** Path to data.yaml file (optional) */
  readonly yoloDataYamlPath?: string;
  /** Confidence threshold for local inference */
  readonly yoloConfidenceThreshold: number;
  /** IoU threshold for NMS */
  readonly yoloIouThreshold: number;
}

export interface RoboflowConfigValidation {
  valid: boolean;
  error?: string;
}

const DEFAULT_BASE_URL = 'https://detect.roboflow.com';
const DEFAULT_TIMEOUT = 10_000;

/**
 * Get Roboflow configuration from environment variables.
 * Returns a config object with defaults for optional values.
 * Does not validate - use validateRoboflowConfig() for that.
 */
export function getRoboflowConfig(): RoboflowConfig {
  const timeoutMs = process.env.ROBOFLOW_TIMEOUT_MS
    ? Number.parseInt(process.env.ROBOFLOW_TIMEOUT_MS, 10)
    : DEFAULT_TIMEOUT;

  const useLocalYOLO = process.env.USE_LOCAL_YOLO === 'true';
  const confidenceThreshold = process.env.YOLO_CONFIDENCE_THRESHOLD
    ? Number.parseFloat(process.env.YOLO_CONFIDENCE_THRESHOLD)
    : 0.25;
  const iouThreshold = process.env.YOLO_IOU_THRESHOLD
    ? Number.parseFloat(process.env.YOLO_IOU_THRESHOLD)
    : 0.45;

  return {
    apiKey: process.env.ROBOFLOW_API_KEY || '',
    modelId: process.env.ROBOFLOW_MODEL_ID || '',
    modelVersion: process.env.ROBOFLOW_MODEL_VERSION || '1',
    baseUrl: process.env.ROBOFLOW_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: Number.isNaN(timeoutMs) || timeoutMs <= 0 ? DEFAULT_TIMEOUT : timeoutMs,
    useLocalYOLO,
    yoloModelPath: process.env.YOLO_MODEL_PATH,
    yoloLoadFromDatabase: process.env.YOLO_LOAD_FROM_DATABASE === 'true',
    yoloDatabaseModelName: process.env.YOLO_DATABASE_MODEL_NAME || 'yolov11',
    yoloDataYamlPath: process.env.YOLO_DATA_YAML_PATH,
    yoloConfidenceThreshold: Number.isNaN(confidenceThreshold) ? 0.25 : confidenceThreshold,
    yoloIouThreshold: Number.isNaN(iouThreshold) ? 0.45 : iouThreshold,
  };
}

/**
 * Validate Roboflow configuration.
 * Returns validation result with human-readable error messages.
 *
 * Validation rules:
 * - If using local YOLO: yoloModelPath must be provided
 * - If using API: apiKey, modelId, and modelVersion must be provided
 * - modelVersion must be parseable as a positive integer (if using API)
 *
 * @param config - Optional config object to validate. If not provided, calls getRoboflowConfig().
 * @returns Validation result with valid flag and optional error message
 */
export function validateRoboflowConfig(config?: RoboflowConfig): RoboflowConfigValidation {
  const cfg = config ?? getRoboflowConfig();

  // If using local YOLO, validate local model path
  if (cfg.useLocalYOLO) {
    if (!cfg.yoloModelPath || cfg.yoloModelPath.trim() === '') {
      return { valid: false, error: 'YOLO_MODEL_PATH is required when USE_LOCAL_YOLO=true' };
    }
    // Local inference doesn't require API credentials
    return { valid: true };
  }

  // If using API, validate API credentials
  if (!cfg.apiKey || cfg.apiKey.trim() === '') {
    return { valid: false, error: 'ROBOFLOW_API_KEY is missing' };
  }

  if (!cfg.modelId || cfg.modelId.trim() === '') {
    return { valid: false, error: 'ROBOFLOW_MODEL_ID is missing' };
  }

  if (!cfg.modelVersion || cfg.modelVersion.trim() === '') {
    return { valid: false, error: 'ROBOFLOW_MODEL_VERSION is missing' };
  }

  // Validate modelVersion is a positive integer
  const versionNum = Number.parseInt(cfg.modelVersion, 10);
  if (Number.isNaN(versionNum) || versionNum <= 0) {
    return {
      valid: false,
      error: `ROBOFLOW_MODEL_VERSION must be a positive integer, got '${cfg.modelVersion}'`,
    };
  }

  return { valid: true };
}

/**
 * Log Roboflow model configuration on startup.
 * Safe to call - only logs if config is valid, does not throw.
 * Should be called during server bootstrap (e.g., in instrumentation.ts).
 */
export function logRoboflowConfig(): void {
  const config = getRoboflowConfig();
  const validation = validateRoboflowConfig(config);

  if (validation.valid) {
    if (config.useLocalYOLO) {
      logger.info('Local YOLO model configured', {
        service: 'RoboflowConfig',
        modelPath: config.yoloModelPath,
        confidenceThreshold: config.yoloConfidenceThreshold,
        iouThreshold: config.yoloIouThreshold,
      });
    } else {
      logger.info('Roboflow API model configured', {
        service: 'RoboflowConfig',
        modelId: config.modelId,
        modelVersion: config.modelVersion,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      });
    }
  } else {
    logger.warn('Roboflow not configured - detections will be skipped', {
      service: 'RoboflowConfig',
      error: validation.error,
    });
  }
}

