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
    if (jwtSecret === 'your-secret-key-change-in-production' || jwtSecret.length < 32) {
      if (isDev) {
        console.warn('⚠️ JWT_SECRET is weak or default. Using development fallback.');
        return {
          JWT_SECRET: 'dev-fallback-secret-min-32-chars-long-for-development-only-do-not-use-in-production',
          NODE_ENV: process.env.NODE_ENV!,
          DATABASE_URL: process.env.DATABASE_URL,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        };
      } else {
        const errorMessage = 'JWT_SECRET must be a strong secret (at least 32 characters) and not use the default value';
        console.error('❌ Security Error:', errorMessage);
        throw new Error(errorMessage);
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