import { ConfigManager } from '@mintenance/auth';
import { logger } from '@mintenance/shared';

let configManager: ConfigManager | null = null;
let configInitError: string | null = null;

export function getConfigManager(): ConfigManager | null {
  if (configManager) return configManager;
  if (configInitError) return null;

  try {
    configManager = ConfigManager.getInstance();
    const jwtSecret = configManager.get('JWT_SECRET');
    if (!jwtSecret) {
      configInitError = 'JWT_SECRET not available in configuration';
      logger.error('CRITICAL: ' + configInitError, undefined, {
        service: 'middleware',
      });
      configManager = null;
      return null;
    }
    return configManager;
  } catch (error) {
    configInitError = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'CRITICAL: Middleware configuration initialization failed',
      error,
      { service: 'middleware' }
    );
    return null;
  }
}

export function getConfigInitError(): string | null {
  return configInitError;
}
