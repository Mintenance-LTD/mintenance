/**
 * Shared configuration management
 * Refactored to remove singleton pattern for serverless compatibility
 */

interface RequiredEnvVars {
  JWT_SECRET: string;
  NODE_ENV: string;
}

interface OptionalEnvVars {
  DATABASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

type EnvVars = RequiredEnvVars & OptionalEnvVars;

export class ConfigManager {
  private config: EnvVars;
  static getInstance: () => ConfigManager;

  constructor() {
    this.config = this.validateAndLoadConfig();
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

    // In development, provide defaults instead of throwing
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      
      if (isDev) {
        console.warn('⚠️ Configuration Warning:', errorMessage);
        console.warn('⚠️ Using fallback values for development. Configure .env.local for full functionality.');
        
        // Return safe defaults for development
        return {
          JWT_SECRET: process.env.JWT_SECRET || 'dev-fallback-secret-min-32-chars-long-for-development-only-do-not-use-in-production',
          NODE_ENV: process.env.NODE_ENV || 'development',
          DATABASE_URL: process.env.DATABASE_URL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        };
      } else {
        console.error('❌ Configuration Error:', errorMessage);
        throw new Error(errorMessage);
      }
    }

    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET!;

    // SECURITY: In production, enforce strong secret requirements
    const isProductionLike = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const minLength = isProductionLike ? 64 : 32; // 64 chars for production, 32 for dev

    if (jwtSecret === 'your-secret-key-change-in-production' || jwtSecret.length < minLength) {
      if (isDev && !isProductionLike) {
        console.warn('⚠️ JWT_SECRET is weak or default. Using development fallback.');
        return {
          JWT_SECRET: 'dev-fallback-secret-min-32-chars-long-for-development-only-do-not-use-in-production',
          NODE_ENV: process.env.NODE_ENV!,
          DATABASE_URL: process.env.DATABASE_URL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        };
      } else {
        const errorMessage = `JWT_SECRET must be a strong secret (at least ${minLength} characters) and not use the default value. Production requires 64+ characters.`;
        console.error('❌ Security Error:', errorMessage);
        throw new Error(errorMessage);
      }
    }

    // Additional production checks
    if (isProductionLike) {
      // Check for common weak patterns
      const weakPatterns = ['password', '12345', 'secret', 'test', 'demo', 'example'];
      const lowerSecret = jwtSecret.toLowerCase();

      for (const pattern of weakPatterns) {
        if (lowerSecret.includes(pattern)) {
          const errorMessage = 'JWT_SECRET contains weak patterns. Use a cryptographically random secret.';
          console.error('❌ Security Error:', errorMessage);
          throw new Error(errorMessage);
        }
      }
    }

    console.log('✅ Configuration validated successfully');

    return {
      JWT_SECRET: jwtSecret,
      NODE_ENV: process.env.NODE_ENV!,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };
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

/**
 * Factory function to create a new ConfigManager instance
 * Use this in serverless functions where you want a fresh config per invocation
 */
export function createConfigManager(): ConfigManager {
  return new ConfigManager();
}

/**
 * Shared ConfigManager instance for convenience
 * Note: In serverless environments, this may be recreated on cold starts
 * For critical use cases, consider using createConfigManager() per request
 */
export const config = new ConfigManager();

/**
 * Deprecated: Use `config` or `createConfigManager()` instead
 * This maintains backward compatibility but will log a warning
 */
export class ConfigManagerLegacy {
  static getInstance(): ConfigManager {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        '[ConfigManager] getInstance() is deprecated. Use `config` export or `createConfigManager()` instead.'
      );
    }
    return config;
  }
}

// For backward compatibility, also export as ConfigManager.getInstance
// This allows gradual migration of existing code
ConfigManager.getInstance = ConfigManagerLegacy.getInstance;