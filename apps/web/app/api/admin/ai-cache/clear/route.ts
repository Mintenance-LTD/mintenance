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
    // Secure admin authentication with database verification
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Parse and validate request
    const body = await request.json();
    const validationResult = clearRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { service, confirm } = validationResult.data;

    // Require confirmation for safety
    if (!confirm) {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'Set "confirm": true in request body to clear cache',
          warning: 'This will delete all cached AI responses and may increase API costs temporarily',
        },
        { status: 400 }
      );
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
    logger.error('Failed to clear AI cache', error);

    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to preview what would be cleared
 */
export async function GET(request: NextRequest) {
  try {
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
    logger.error('Failed to get cache clear preview', error);

    return NextResponse.json(
      { error: 'Failed to retrieve cache information' },
      { status: 500 }
    );
  }
}
