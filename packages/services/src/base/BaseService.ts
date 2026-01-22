import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
export interface ServiceConfig {
  supabase: SupabaseClient;
  environment: 'development' | 'staging' | 'production';
  apiUrl?: string;
}
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
export abstract class BaseService {
  protected supabase: SupabaseClient;
  protected environment: string;
  protected apiUrl?: string;
  constructor(config: ServiceConfig) {
    this.supabase = config.supabase;
    this.environment = config.environment;
    this.apiUrl = config.apiUrl;
  }
  protected handleError(err: unknown): ServiceError {
    const error = err as any;
    logger.error('Service error occurred:', error, { service: 'general' });
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.details || error,
      timestamp: new Date().toISOString()
    };
  }
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await this.delay(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }
    throw lastError;
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  // Field mapping utilities (handles snake_case to camelCase)
  protected toDatabase<T>(obj: T): any {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as any)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }
  protected fromDatabase<T>(obj: unknown): T {
    const result: Record<string, unknown> = {};
    const data = (obj || {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
      result[camelKey] = value;
    }
    return result as T;
  }
}