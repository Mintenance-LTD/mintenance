/**
 * Application configuration
 * Provides access to environment and application settings
 */

import { isProduction as checkIsProduction, isDevelopment, isTest } from './env';

/**
 * Configuration object for application settings
 */
export const config = {
  /**
   * Check if the application is running in production mode
   */
  isProduction(): boolean {
    return checkIsProduction();
  },

  /**
   * Check if the application is running in development mode
   */
  isDevelopment(): boolean {
    return isDevelopment();
  },

  /**
   * Check if the application is running in test mode
   */
  isTest(): boolean {
    return isTest();
  },
};

// Default export for compatibility
export default config;

