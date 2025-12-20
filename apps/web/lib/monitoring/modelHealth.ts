/**
 * Model Health Monitoring
 *
 * Server-side helper to get Roboflow model configuration and validation status.
 * Used by admin dashboard to display model version health.
 */

import { getRoboflowConfig, validateRoboflowConfig } from '@/lib/config/roboflow.config';

export interface ModelHealthInfo {
  modelId: string;
  modelVersion: string;
  baseUrl: string;
  valid: boolean;
  validationError: string | null;
}

/**
 * Get Roboflow model health information.
 * Returns configuration details and validation status.
 *
 * @returns Model health info with validation status
 */
export function getModelHealthInfo(): ModelHealthInfo {
  try {
    const config = getRoboflowConfig();
    const validation = validateRoboflowConfig(config);

    return {
      modelId: config.modelId,
      modelVersion: config.modelVersion,
      baseUrl: config.baseUrl,
      valid: validation.valid,
      validationError: validation.error || null,
    };
  } catch (error) {
    // Fail gracefully - return unknown status
    return {
      modelId: 'Unknown',
      modelVersion: 'Unknown',
      baseUrl: 'Unknown',
      valid: false,
      validationError: 'Failed to read configuration',
    };
  }
}

