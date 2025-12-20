/**
 * AI Service Configuration
 *
 * ⚠️ SECURITY CRITICAL: These API keys should ONLY be used server-side
 * For React Native: These will be undefined and services will use fallback logic
 * For Next.js API routes: These will be available via process.env
 */

export const aiConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
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

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    services: {
      rekognition: true,
      textract: false,
    },
  },

  // Google Cloud Configuration
  googleCloud: {
    apiKey: process.env.GOOGLE_CLOUD_API_KEY || '',
    services: {
      vision: true,
      nlp: false,
    },
  },

  // Feature flags
  features: {
    enableRealAI: true, // Set to false to use mock data
    enableOpenAI: !!process.env.OPENAI_API_KEY,
    enableAWS: !!process.env.AWS_ACCESS_KEY_ID,
    enableGoogleCloud: !!process.env.GOOGLE_CLOUD_API_KEY,
    fallbackToMock: true, // Fallback to mock if all APIs fail
  },

  // Cost controls
  limits: {
    maxImagesPerJob: 4, // Limit images sent to vision API for cost control
    maxRequestsPerMinute: 20,
    maxCostPerRequest: 0.10, // USD
  },
};

/**
 * Check if any AI service is configured
 */
export const isAIConfigured = (): boolean => {
  return aiConfig.features.enableOpenAI ||
         aiConfig.features.enableAWS ||
         aiConfig.features.enableGoogleCloud;
};

/**
 * Get configured AI service name for logging
 */
export const getConfiguredAIService = (): string => {
  if (aiConfig.features.enableOpenAI) return 'OpenAI GPT-4 Vision';
  if (aiConfig.features.enableAWS) return 'AWS Rekognition';
  if (aiConfig.features.enableGoogleCloud) return 'Google Cloud Vision';
  return 'Enhanced Rule-based Analysis (Mock)';
};

/**
 * Validate AI configuration
 */
export const validateAIConfig = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if at least one AI service is configured for production
  if (!isAIConfigured() && process.env.NODE_ENV === 'production') {
    warnings.push('No AI service configured - using mock analysis only');
  }

  // Validate OpenAI configuration
  if (aiConfig.features.enableOpenAI) {
    if (!aiConfig.openai.apiKey.startsWith('sk-')) {
      errors.push('Invalid OpenAI API key format');
    }
  }

  // Validate AWS configuration
  if (aiConfig.features.enableAWS) {
    if (!aiConfig.aws.accessKeyId || !aiConfig.aws.secretAccessKey) {
      errors.push('Incomplete AWS credentials');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Log AI configuration status (development only)
if (process.env.NODE_ENV === 'development') {
  const { logger } = require('../utils/logger');
  logger.info('AI Configuration loaded', {
    primaryService: getConfiguredAIService(),
    openAIEnabled: aiConfig.features.enableOpenAI,
    awsEnabled: aiConfig.features.enableAWS,
    googleCloudEnabled: aiConfig.features.enableGoogleCloud,
    fallbackToMock: aiConfig.features.fallbackToMock,
  });

  const validation = validateAIConfig();
  if (!validation.isValid) {
    logger.warn('AI Configuration validation failed', {
      errors: validation.errors,
    });
  }
  if (validation.warnings.length > 0) {
    logger.warn('AI Configuration warnings', {
      warnings: validation.warnings,
    });
  }
}

export default aiConfig;
