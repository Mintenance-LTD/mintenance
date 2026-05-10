import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { ExportService } from '@/lib/services/admin/ExportService';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

// Audit P3 (2026-05-10): cap the date-range a single export can request.
// `getRevenueTrends(days)` materialises one row per day, so an admin
// asking for 100 years (36,500 days) would over-allocate memory and hit
// the function timeout. 366 days covers any sensible single-export use
// case (full fiscal year + a leap day); larger ranges should be batched.
const MAX_EXPORT_RANGE_DAYS = 366;

// Audit P1 (2026-05-10): exports the full revenue dashboard (MRR, fees,
// per-day trends) as CSV/PDF. A stolen admin session would walk away with
// the entire business book. Gate behind fresh MFA, same 15-min window.
export const GET = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as 'csv' | 'pdf') || 'csv';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Reject invalid date strings (NaN result) and inverted ranges before
    // computing `days` — a negative `days` would silently fan out to a
    // 100% scan via the `getRevenueTrends` SQL.
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestError(
        'startDate and endDate must be valid ISO dates'
      );
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestError('endDate must be on or after startDate');
    }

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days > MAX_EXPORT_RANGE_DAYS) {
      throw new BadRequestError(
        `Export range too large: ${days} days requested, max ${MAX_EXPORT_RANGE_DAYS}. Split the export by year.`
      );
    }

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
  }
);
