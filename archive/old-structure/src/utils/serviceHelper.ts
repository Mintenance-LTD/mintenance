import { ServiceErrorHandler } from './serviceErrorHandler';
import { serviceHealthMonitor } from './serviceHealthMonitor';

/**
 * Simplified wrapper for service operations that maintains original API
 * while internally using centralized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    service: string;
    method: string;
    params?: Record<string, any>;
  }
): Promise<T> {
  const startTime = Date.now();

  const result = await ServiceErrorHandler.executeOperation(
    operation,
    context
  );

  const responseTime = Date.now() - startTime;

  // Record service operation metrics for health monitoring
  serviceHealthMonitor.recordServiceOperation(
    context.service,
    context.method,
    responseTime,
    result.success
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Handle Supabase database operations with centralized error handling
 */
export async function handleDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: {
    service: string;
    method: string;
    params?: Record<string, any>;
  }
): Promise<T> {
  return withErrorHandling(async () => {
    const { data, error } = await operation();

    if (error) {
      throw ServiceErrorHandler.handleDatabaseError(error, context);
    }

    return data;
  }, context);
}

/**
 * Validate required parameters before service operations
 */
export function validateRequired(
  value: any,
  fieldName: string,
  context: {
    service: string;
    method: string;
    params?: Record<string, any>;
  }
): void {
  ServiceErrorHandler.validateRequired(value, fieldName, context);
}