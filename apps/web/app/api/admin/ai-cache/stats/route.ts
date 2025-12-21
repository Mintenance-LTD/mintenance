/**
 * AI Cache Statistics API
 * GET /api/admin/ai-cache/stats
 *
 * Returns comprehensive cache statistics including:
 * - Hit/miss rates per service
 * - Cost savings
 * - Cache sizes
 * - Performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    // Secure admin authentication with database verification
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get cache statistics
    const metrics = AIResponseCache.exportMetrics();

    logger.info('AI cache stats accessed', {
      service: 'ai_cache_stats',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      metrics,
      recommendations: generateRecommendations(metrics),
    });
  } catch (error) {
    logger.error('Failed to get AI cache stats', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve cache statistics',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate cache optimization recommendations
 */
function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  const { aggregated, perService } = metrics;

  // Overall hit rate recommendations
  if (aggregated.overallHitRate < 0.3) {
    recommendations.push(
      'Overall cache hit rate is below 30%. Consider increasing cache TTL or cache size.'
    );
  } else if (aggregated.overallHitRate > 0.7) {
    recommendations.push(
      'Excellent cache hit rate (>70%)! Cache is performing optimally.'
    );
  }

  // Cost savings recommendations
  if (aggregated.projectedMonthlySavings < 100) {
    recommendations.push(
      'Monthly savings are below $100. Ensure caching is enabled for all AI endpoints.'
    );
  } else if (aggregated.projectedMonthlySavings > 500) {
    recommendations.push(
      `Outstanding cost savings: $${aggregated.projectedMonthlySavings.toFixed(2)}/month projected!`
    );
  }

  // Per-service recommendations
  for (const [service, stats] of Object.entries(perService as any)) {
    if (stats.hitRate < 0.2 && stats.hits + stats.misses > 10) {
      recommendations.push(
        `${service}: Low hit rate (${(stats.hitRate * 100).toFixed(1)}%). Consider increasing TTL or investigating cache key generation.`
      );
    }

    if (stats.cacheSize >= metrics.configs[service].maxSize * 0.9) {
      recommendations.push(
        `${service}: Cache is near capacity (${stats.cacheSize}/${metrics.configs[service].maxSize}). Consider increasing maxSize.`
      );
    }
  }

  // Redis recommendations
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    recommendations.push(
      'Redis is not configured. Enable Redis for persistent caching and improved performance across server instances.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache is performing optimally. No recommendations at this time.');
  }

  return recommendations;
}
