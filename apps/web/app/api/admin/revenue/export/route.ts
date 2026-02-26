import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { ExportService } from '@/lib/services/admin/ExportService';
import { InternalServerError } from '@/lib/errors/api-error';

export const GET = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request) => {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') as 'csv' | 'pdf' || 'csv';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const [revenueMetrics, trends] = await Promise.all([
    RevenueAnalytics.getRevenueMetrics(startDate, endDate),
    RevenueAnalytics.getRevenueTrends(days),
  ]);

  if (!revenueMetrics) {
    throw new InternalServerError('Failed to fetch revenue metrics');
  }

  const file = await ExportService.exportRevenue(
    {
      metrics: revenueMetrics,
      trends,
      dateRange: { start: startDate, end: endDate },
    },
    format
  );

  const body: BodyInit = Buffer.isBuffer(file.content)
    ? new Uint8Array(file.content)
    : file.content;

  return new NextResponse(body, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    },
  });
});
