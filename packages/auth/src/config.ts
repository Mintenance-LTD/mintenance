/**
 * Shared configuration management
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

    // In development, provide defaults instead of throwing
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      
      // NEVER use fallbacks in production or CI environments
      if (!isDev || process.env.CI === 'true') {
        console.error('[config] Error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.error('[config] DEVELOPMENT MODE: Using insecure fallbacks');
      console.error('[config] DO NOT DEPLOY THIS BUILD TO PRODUCTION');
      console.error('[config] Configure .env.local with proper values');
      
      // Return insecure defaults ONLY for development
      return {
        JWT_SECRET: 'dev-insecure-secret-not-for-production',
        NODE_ENV: 'development',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      };
    }

    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    if (/^dev-/.test(jwtSecret) && !isDev) {
      throw new Error('Development JWT_SECRET detected in production environment');
    }
    if (jwtSecret === 'your-secret-key-change-in-production' || jwtSecret === 'dev-insecure-secret-not-for-production') {
      if (isDev) {
        if (isDev) console.warn('[config] Weak/default JWT_SECRET in dev. Using fallback.');
        return {
          JWT_SECRET: 'dev-fallback-secret-min-32-chars-long-for-development-only-do-not-use-in-production',
          NODE_ENV: process.env.NODE_ENV!,
          DATABASE_URL: process.env.DATABASE_URL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        };
      } else {
        const errorMessage = 'JWT_SECRET must be a strong secret (at least 32 characters) and not use the default value';
        console.error('[config] Security Error:', errorMessage);
        throw new Error(errorMessage);
      }
    }

    if (isDev) console.info('[config] Configuration validated');

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