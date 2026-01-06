/**
 * AI Cache Management API
 * POST /api/admin/ai-cache/clear
 *
 * Clear AI response cache (all services or specific service)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const clearRequestSchema = z.object({
  service: z.enum([
    'all',
    'gpt4-vision',
    'gpt4-chat',
    'embeddings',
    'google-vision',
    'building-surveyor',
    'maintenance-assessment',
  ]).optional().default('all'),
  confirm: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Secure admin authentication with database verification
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Parse and validate request
    const body = await request.json();
    const validationResult = clearRequestSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError('Invalid request parameters');
    }

    const { service, confirm } = validationResult.data;

    // Require confirmation for safety
    if (!confirm) {
      throw new BadRequestError('Confirmation required. Set "confirm": true in request body to clear cache');
    }

    // Clear cache
    if (service === 'all') {
      await AIResponseCache.clearAll();
      logger.warn('All AI caches cleared', {
        service: 'ai_cache_clear',
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'All AI caches cleared successfully',
        clearedServices: [
          'gpt4-vision',
          'gpt4-chat',
          'embeddings',
          'google-vision',
          'building-surveyor',
          'maintenance-assessment',
        ],
      });
    } else {
      await AIResponseCache.clearService(service as any);
      logger.warn('AI cache cleared', {
        service: 'ai_cache_clear',
        userId: user.id,
        cacheService: service,
      });

      return NextResponse.json({
        success: true,
        message: `Cache cleared for ${service}`,
        clearedService: service,
      });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET endpoint to preview what would be cleared
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Secure admin authentication with database verification
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get current cache stats before clearing
    const metrics = AIResponseCache.exportMetrics();

    return NextResponse.json({
      success: true,
      message: 'Use POST with {"confirm": true} to clear cache',
      currentState: {
        totalCacheSize: metrics.aggregated.totalCacheSize,
        totalSavedCost: metrics.aggregated.totalSavedCost,
        perService: metrics.perService,
      },
      warning: 'Clearing cache will temporarily increase API costs until cache is rebuilt',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
