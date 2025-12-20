/**
 * OpenAI client configuration
 * Initialized with API key from environment variables
 */

import OpenAI from 'openai';
import { logger } from '@mintenance/shared';

// Validate API key on initialization
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  logger.warn('OPENAI_API_KEY not configured - AI features will be limited');
}

// Initialize OpenAI client with configuration
export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key', // Prevent initialization errors in dev
  maxRetries: 3,
  timeout: 30000, // 30 seconds
});

// Export for easier mocking in tests
export default openai;