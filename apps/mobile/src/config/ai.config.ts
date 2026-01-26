import { logger } from '@mintenance/shared';
/**
 * AI Service Configuration - MOBILE CLIENT
 *
 * ⚠️ SECURITY: This file runs in React Native mobile client
 * - NO API keys or secrets allowed (removed all process.env references)
 * - All AI operations MUST go through Next.js API routes
 * - Server-side keys never exposed to client bundle
 *
 * Mobile app calls: /api/ai/analyze, /api/ai/damage-assessment, etc.
 * Server handles: OpenAI, AWS, Google Cloud API calls with proper secrets
 */

export const aiConfig = {
  // Client-side configuration ONLY
  // No API keys - all AI calls routed through server

  // OpenAI Configuration (models mobile app can request from server)
  openai: {
    apiKey: '', // ⛔ SECURITY: Never set API keys in mobile code
    models: {
      vision: 'gpt-4-vision-preview',
      chat: 'gpt-4-turbo-preview',
      embedding: 'text-embedding-3-small',
    },
    maxTokens: {
      vision: 800,
      chat: 1000,
      embedding: 8191,
    },
    temperature: 0.1, // Low temperature for consistent, factual responses
  },

  // AWS Configuration (mobile doesn't access AWS directly)
  aws: {
    accessKeyId: '', // ⛔ SECURITY: Server-side only
    secretAccessKey: '', // ⛔ SECURITY: Server-side only
    region: 'us-east-1',
    services: {
      rekognition: true,
      textract: false,
    },
  },

  // Google Cloud Configuration (mobile doesn't access GCP directly)
  googleCloud: {
    apiKey: '', // ⛔ SECURITY: Server-side only
    services: {
      vision: true,
      nlp: false,
    },
  },

  // Feature flags (client-side safe - no secrets)
  features: {
    enableRealAI: true, // Mobile calls server API for real AI features
    enableOpenAI: true, // Server determines actual availability
    enableAWS: true, // Server determines actual availability
    enableGoogleCloud: true, // Server determines actual availability
    fallbackToMock: true, // Fallback to mock if server AI fails
  },

  // Cost controls
  limits: {
    maxImagesPerJob: 4, // Limit images sent to vision API for cost control
    maxRequestsPerMinute: 20,
    maxCostPerRequest: 0.10, // USD
  },
};

/**
 * Check if any AI service is enabled (mobile calls server for actual AI)
 */
export const isAIConfigured = (): boolean => {
  return aiConfig.features.enableRealAI;
};

/**
 * Get configured AI service name for logging
 */
export const getConfiguredAIService = (): string => {
  // Mobile app doesn't access AI services directly
  // All AI features go through Next.js API routes
  return 'Server-side AI (OpenAI/AWS/Google Cloud via API)';
};

/**
 * Validate AI configuration (mobile version - no API keys expected)
 */
export const validateAIConfig = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // SECURITY CHECK: Ensure no API keys were accidentally added to mobile code
  if (aiConfig.openai.apiKey && aiConfig.openai.apiKey !== '') {
    errors.push('⛔ SECURITY VIOLATION: OpenAI API key detected in mobile code!');
  }
  if (aiConfig.aws.accessKeyId && aiConfig.aws.accessKeyId !== '') {
    errors.push('⛔ SECURITY VIOLATION: AWS access key detected in mobile code!');
  }
  if (aiConfig.aws.secretAccessKey && aiConfig.aws.secretAccessKey !== '') {
    errors.push('⛔ SECURITY VIOLATION: AWS secret key detected in mobile code!');
  }
  if (aiConfig.googleCloud.apiKey && aiConfig.googleCloud.apiKey !== '') {
    errors.push('⛔ SECURITY VIOLATION: Google Cloud API key detected in mobile code!');
  }

  if (errors.length > 0) {
    throw new Error(
      'API keys detected in mobile bundle! This is a critical security issue. ' +
      'Remove all process.env references from mobile code.'
    );
  }

  return {
    isValid: true,
    errors,
    warnings,
  };
};

// Validate configuration at module load (mobile-specific)
try {
  const validation = validateAIConfig();
  if (!validation.isValid) {
    const { logger } = require('../utils/logger');
    logger.error('⛔ AI Configuration security validation failed', {
      errors: validation.errors,
    });
  }
} catch (error) {
  // Fatal error if API keys detected in mobile bundle
  logger.error('FATAL SECURITY ERROR:', error, { service: 'mobile' });
  throw error;
}

export default aiConfig;
