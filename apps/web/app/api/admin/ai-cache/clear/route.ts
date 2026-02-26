import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AIResponseCache, type AICacheServiceType } from '@/lib/services/cache/AIResponseCache';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';

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

/**
 * POST /api/admin/ai-cache/clear — Clear AI response cache
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const body = await request.json();
    const validationResult = clearRequestSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError('Invalid request parameters');
    }

    const { service, confirm } = validationResult.data;

    if (!confirm) {
      throw new BadRequestError('Confirmation required. Set "confirm": true in request body to clear cache');
    }

    if (service === 'all') {
      await AIResponseCache.clearAll();
      logger.warn('All AI caches cleared', { service: 'ai_cache_clear', userId: user.id });

      return NextResponse.json({
        success: true,
        message: 'All AI caches cleared successfully',
        clearedServices: ['gpt4-vision', 'gpt4-chat', 'embeddings', 'google-vision', 'building-surveyor', 'maintenance-assessment'],
      });
    }

    await AIResponseCache.clearService(service as AICacheServiceType);
    logger.warn('AI cache cleared', { service: 'ai_cache_clear', userId: user.id, cacheService: service });

    return NextResponse.json({
      success: true,
      message: `Cache cleared for ${service}`,
      clearedService: service,
    });
  }
);

/**
 * GET /api/admin/ai-cache/clear — Preview what would be cleared
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const metrics = AIResponseCache.exportMetrics() as { aggregated: { totalCacheSize: number; totalSavedCost: number }; perService: unknown };

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
  }
);
