/**
 * Error Handler Middleware for API Routes
 */
import { NextResponse } from 'next/server';
import { handleAPIError } from './errors/api-error';
import { logger } from '@mintenance/shared';
/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandler(
  handler: (req: Request, context?: { params?: Record<string, string> }) => Promise<Response | NextResponse>
) {
  return async (req: Request, context?: { params?: Record<string, string> }): Promise<Response | NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      logger.error('API Route Error:', error, {
        url: req.url,
        method: req.method,
        service: 'api'
      });
      return handleAPIError(error);
    }
  };
}
export { handleAPIError } from './errors/api-error';