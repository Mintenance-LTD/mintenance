import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { ExportService } from '@/lib/services/admin/ExportService';
import { logger } from '@mintenance/shared';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
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

    if (!revenueMetrics) {
      throw new InternalServerError('Failed to fetch revenue metrics');
    }

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
    return handleAPIError(error);
  }
}

