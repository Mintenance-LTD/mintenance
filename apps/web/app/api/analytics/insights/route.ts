import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorAnalyticsService } from '@/lib/services/ContractorAnalyticsService';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const insights = await ContractorAnalyticsService.getPerformanceInsights(user.id);

    return NextResponse.json({ insights });
  } catch (error: any) {
    logger.error('Error fetching analytics insights', error, {
      service: 'analytics',
      userId: user.id,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

