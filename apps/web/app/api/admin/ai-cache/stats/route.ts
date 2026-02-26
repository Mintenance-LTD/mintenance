import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { logger } from '@mintenance/shared';

interface CacheMetrics {
  aggregated: {
    overallHitRate: number;
    projectedMonthlySavings: number;
  };
  perService: Record<string, {
    hitRate: number;
    hits: number;
    misses: number;
    cacheSize: number;
  }>;
  configs: Record<string, {
    maxSize: number;
  }>;
}

/**
 * GET /api/admin/ai-cache/stats
 * Returns comprehensive cache statistics
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (_request, { user }) => {
    const metrics = AIResponseCache.exportMetrics() as unknown as CacheMetrics;

    logger.info('AI cache stats accessed', {
      service: 'ai_cache_stats',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      metrics,
      recommendations: generateRecommendations(metrics),
    });
  }
);

function generateRecommendations(metrics: CacheMetrics): string[] {
  const recommendations: string[] = [];
  const { aggregated, perService } = metrics;

  if (aggregated.overallHitRate < 0.3) {
    recommendations.push('Overall cache hit rate is below 30%. Consider increasing cache TTL or cache size.');
  } else if (aggregated.overallHitRate > 0.7) {
    recommendations.push('Excellent cache hit rate (>70%)! Cache is performing optimally.');
  }

  if (aggregated.projectedMonthlySavings < 100) {
    recommendations.push('Monthly savings are below $100. Ensure caching is enabled for all AI endpoints.');
  } else if (aggregated.projectedMonthlySavings > 500) {
    recommendations.push(`Outstanding cost savings: $${aggregated.projectedMonthlySavings.toFixed(2)}/month projected!`);
  }

  for (const [service, stats] of Object.entries(perService)) {
    if (stats.hitRate < 0.2 && stats.hits + stats.misses > 10) {
      recommendations.push(`${service}: Low hit rate (${(stats.hitRate * 100).toFixed(1)}%). Consider increasing TTL or investigating cache key generation.`);
    }
    if (stats.cacheSize >= metrics.configs[service].maxSize * 0.9) {
      recommendations.push(`${service}: Cache is near capacity (${stats.cacheSize}/${metrics.configs[service].maxSize}). Consider increasing maxSize.`);
    }
  }

  if (!process.env.UPSTASH_REDIS_REST_URL) {
    recommendations.push('Redis is not configured. Enable Redis for persistent caching and improved performance across server instances.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache is performing optimally. No recommendations at this time.');
  }

  return recommendations;
}
