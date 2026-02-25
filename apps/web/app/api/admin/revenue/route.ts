import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';

export const GET = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request) => {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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

  const monthlyData = monthlyRevenue || [];
  const lastMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const growthRate = previousMonth && previousMonth.revenue > 0
    ? ((lastMonth?.revenue || 0) - previousMonth.revenue) / previousMonth.revenue * 100
    : 0;

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
});
