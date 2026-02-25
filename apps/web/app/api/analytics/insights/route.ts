import { NextResponse } from 'next/server';
import { ContractorAnalyticsService } from '@/lib/services/ContractorAnalyticsService';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/analytics/insights - contractor performance insights.
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user }) => {
    const insights = await ContractorAnalyticsService.getPerformanceInsights(user.id);
    return NextResponse.json({ insights });
  },
);
