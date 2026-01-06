import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { redirect } from 'next/navigation';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Calculate days for trends
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch revenue data
    const [revenueMetrics, mrr, conversionRate, arpc, trends, monthlyRevenue, revenueByCategory, revenueByContractorType, recentTransactions] = await Promise.all([
      RevenueAnalytics.getRevenueMetrics(startDate, endDate),
      RevenueAnalytics.getMRR(),
      RevenueAnalytics.getTrialConversionRate(),
      RevenueAnalytics.getARPC(),
      RevenueAnalytics.getRevenueTrends(days),
      RevenueAnalytics.getMonthlyRevenue(12),
      RevenueAnalytics.getRevenueByCategory(),
      RevenueAnalytics.getRevenueByContractorType(),
      RevenueAnalytics.getRecentTransactions(50),
    ]);

    // Calculate growth rate (comparing last month to previous month)
    const monthlyData = monthlyRevenue || [];
    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    const growthRate = previousMonth && previousMonth.revenue > 0
      ? ((lastMonth?.revenue || 0) - previousMonth.revenue) / previousMonth.revenue * 100
      : 0;

    // Calculate average transaction value
    const totalTransactions = recentTransactions?.length || 0;
    const totalRevenue = revenueMetrics?.totalRevenue || 0;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return NextResponse.json({
      revenueMetrics: {
        ...revenueMetrics,
        growthRate: Math.round(growthRate * 10) / 10,
        transactionCount: totalTransactions,
        averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
      },
      mrr,
      conversionRate,
      arpc,
      trends,
      monthlyRevenue,
      revenueByCategory,
      revenueByContractorType,
      recentTransactions,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

