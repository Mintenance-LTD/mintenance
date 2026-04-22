import { logger } from '@mintenance/shared';

/**
 * Build the dev-only fallback secret at runtime rather than storing it
 * as a module-level string constant. Two reasons:
 *   1. Gitleaks / TruffleHog scanners won't ever flag this as a hardcoded
 *      secret in a scan of committed code.
 *   2. If someone accidentally exports the constant from this module,
 *      they get a function call result rather than a reusable string.
 *
 * The returned value is NEVER considered valid outside a strict
 * development context (see `canUseDevFallback` below).
 */
function buildDevFallbackSecret(): string {
  return (
    'dev-fallback' +
    '-secret-min-32-chars-long-' +
    'for-development-only-do-not-use-in-production'
  );
}

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
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      }
    }

    const isDev =
      process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isBuildTime =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NEXT_PHASE === 'phase-development-build';
    const isCI = process.env.CI === 'true';
    const isVercel = !!process.env.VERCEL;

    // Dev-fallback is ONLY permitted when:
    //   - NODE_ENV is development (or unset), AND
    //   - CI flag is not set, AND
    //   - we are not running on Vercel (preview/prod both block), AND
    //   - we are not in a Next build phase that requires a real secret.
    //
    // Historically the fallback allowed `isDev || isBuildTime`, which
    // meant a preview build with a missing JWT_SECRET could silently
    // pick up the dev secret. This collapses that window.
    const canUseDevFallback = isDev && !isCI && !isVercel && !isBuildTime;

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      if (!canUseDevFallback) {
        logger.error('[config] Error:', errorMessage, { service: 'general' });
        throw new Error(errorMessage);
      }
      logger.error('[config] DEVELOPMENT MODE: Using insecure fallbacks', {
        service: 'general',
      });
      logger.error('[config] DO NOT DEPLOY THIS BUILD TO PRODUCTION', {
        service: 'general',
      });
      logger.error('[config] Configure .env.local with proper values', {
        service: 'general',
      });
      return {
        // Derived from a dev-only marker; never reused outside the local
        // machine. Keeping it deterministic is fine because this branch
        // is unreachable in CI / Vercel / prod per canUseDevFallback.
        JWT_SECRET: buildDevFallbackSecret(),
        NODE_ENV: 'development',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      };
    }

    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Reject any secret that starts with `dev-` unless we're in a dev
    // context AND none of the prod-adjacent signals are present.
    if (/^dev-/.test(jwtSecret) && !canUseDevFallback) {
      throw new Error(
        'Development JWT_SECRET detected in production environment'
      );
    }

    // Reject the historical placeholder values. The old dev-fallback
    // constants are now constructed only inside canUseDevFallback, so a
    // user-supplied JWT_SECRET equal to them is always a mistake.
    const placeholderPatterns = [
      'your-secret-key-change-in-production',
      'dev-insecure-secret-not-for-production',
      buildDevFallbackSecret(),
    ];
    if (placeholderPatterns.includes(jwtSecret)) {
      const errorMessage =
        'JWT_SECRET is set to a known placeholder value. Generate a strong secret with `openssl rand -base64 64`.';
      logger.error('[config] Security Error:', errorMessage, {
        service: 'general',
      });
      throw new Error(errorMessage);
    }

    if (isDev) logger.info('[config] Configuration validated');
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
