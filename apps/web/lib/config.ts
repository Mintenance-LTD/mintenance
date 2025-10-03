/**
 * Configuration validation and setup
 * Fails fast if required environment variables are missing
 */

import { logger } from './logger';

interface RequiredEnvVars {
  JWT_SECRET: string;
  NODE_ENV: string;
}

interface OptionalEnvVars {
  DATABASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

type EnvVars = RequiredEnvVars & OptionalEnvVars;

class ConfigManager {
  private static instance: ConfigManager;
  private config: EnvVars;

  private constructor() {
    this.config = this.validateAndLoadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateAndLoadConfig(): EnvVars {
    const requiredVars: (keyof RequiredEnvVars)[] = ['JWT_SECRET', 'NODE_ENV'];
    const missingVars: string[] = [];

    // Check required environment variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      logger.error('Config', 'Missing env', { missingVars });
      throw new Error(errorMessage);
    }

    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      const errorMessage = 'JWT_SECRET must be a strong secret (>=32 chars) and not the default value';
      logger.error('Security', 'Weak JWT_SECRET');
      throw new Error(errorMessage);
    }

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.NEXT_PUBLIC_APP_URL) {
        logger.warn('Config', 'NEXT_PUBLIC_APP_URL should be set in production');
      }
    }

    logger.info('Config', 'Configuration validated successfully');

    return {
      JWT_SECRET: jwtSecret,
      NODE_ENV: process.env.NODE_ENV!,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    } as EnvVars;
  }

  public get(key: keyof EnvVars): string | undefined {
    return this.config[key];
  }

  public getRequired(key: keyof RequiredEnvVars): string {
    const value = this.config[key];
    if (!value) {
      throw new Error(`Required configuration ${key} is not available`);
    }
    return value;
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Export specific getters for convenience
export const getJWTSecret = () => config.getRequired('JWT_SECRET');
export const isProduction = () => config.isProduction();
export const isDevelopment = () => config.isDevelopment();
