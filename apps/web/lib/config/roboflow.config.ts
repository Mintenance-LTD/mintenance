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
 */

import { logger } from '@mintenance/shared';

export interface RoboflowConfig {
  readonly apiKey: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
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

  return {
    apiKey: process.env.ROBOFLOW_API_KEY || '',
    modelId: process.env.ROBOFLOW_MODEL_ID || '',
    modelVersion: process.env.ROBOFLOW_MODEL_VERSION || '1',
    baseUrl: process.env.ROBOFLOW_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: Number.isNaN(timeoutMs) || timeoutMs <= 0 ? DEFAULT_TIMEOUT : timeoutMs,
  };
}

/**
 * Validate Roboflow configuration.
 * Returns validation result with human-readable error messages.
 *
 * Validation rules:
 * - apiKey must be a non-empty string
 * - modelId must be a non-empty string
 * - modelVersion must be parseable as a positive integer
 *
 * @param config - Optional config object to validate. If not provided, calls getRoboflowConfig().
 * @returns Validation result with valid flag and optional error message
 */
export function validateRoboflowConfig(config?: RoboflowConfig): RoboflowConfigValidation {
  const cfg = config ?? getRoboflowConfig();

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
    logger.info('Roboflow model configured', {
      service: 'RoboflowConfig',
      modelId: config.modelId,
      modelVersion: config.modelVersion,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
    });
  } else {
    logger.warn('Roboflow not configured - detections will be skipped', {
      service: 'RoboflowConfig',
      error: validation.error,
    });
  }
}

