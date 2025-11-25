import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Calculate days for trends
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch revenue data
    const [revenueMetrics, mrr, conversionRate, arpc, trends] = await Promise.all([
      RevenueAnalytics.getRevenueMetrics(startDate, endDate),
      RevenueAnalytics.getMRR(),
      RevenueAnalytics.getTrialConversionRate(),
      RevenueAnalytics.getARPC(),
      RevenueAnalytics.getRevenueTrends(days),
    ]);

    return NextResponse.json({
      revenueMetrics,
      mrr,
      conversionRate,
      arpc,
      trends,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching revenue data', error, {
      service: 'admin_revenue',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

