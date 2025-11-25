import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { ExportService } from '@/lib/services/admin/ExportService';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as 'csv' | 'pdf' || 'csv';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Calculate days for trends
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch revenue data
    const [revenueMetrics, trends] = await Promise.all([
      RevenueAnalytics.getRevenueMetrics(startDate, endDate),
      RevenueAnalytics.getRevenueTrends(days),
    ]);

    // Generate export file
    const file = await ExportService.exportRevenue(
      {
        metrics: revenueMetrics,
        trends,
        dateRange: { start: startDate, end: endDate },
      },
      format
    );

    // Convert Buffer to Uint8Array if needed, otherwise use content as-is
    const body: BodyInit = Buffer.isBuffer(file.content) 
      ? new Uint8Array(file.content) 
      : file.content;

    return new NextResponse(body, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting revenue data', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

