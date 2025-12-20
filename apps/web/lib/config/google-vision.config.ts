/**
 * Google Cloud Vision API Configuration
 * 
 * This module handles configuration for Google Cloud Vision API integration.
 * Supports both API key and service account authentication methods.
 */

export interface GoogleVisionConfig {
  apiKey?: string;
  credentialsPath?: string;
  projectId?: string;
  enabled: boolean;
}

/**
 * Get Google Vision API configuration from environment variables
 */
export function getGoogleVisionConfig(): GoogleVisionConfig {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  return {
    apiKey: apiKey || undefined,
    credentialsPath: credentialsPath || undefined,
    projectId: projectId || undefined,
    enabled: !!(apiKey || credentialsPath),
  };
}

/**
 * Validate that Google Vision API is properly configured
 */
export function validateGoogleVisionConfig(): { valid: boolean; error?: string } {
  const config = getGoogleVisionConfig();

  if (!config.enabled) {
    return {
      valid: false,
      error: 'Google Cloud Vision API is not configured. Set GOOGLE_CLOUD_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS.',
    };
  }

  return { valid: true };
}

