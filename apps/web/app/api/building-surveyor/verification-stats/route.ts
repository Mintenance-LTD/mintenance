/**
 * Phase 7: Verification & observability.
 * GET /api/building-surveyor/verification-stats – admin-only counts by validation_status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError, ForbiddenError } from '@/lib/errors/api-error';

const DEFAULT_DAYS = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await serverSupabase
      .from('building_assessments')
      .select('validation_status')
      .gte('created_at', since);

    if (error) {
      // SECURITY: Use centralized error handler (sanitizes database errors)
      return handleAPIError(new Error(`Failed to fetch verification stats: ${error.message}`));
    }

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rows ?? []) {
      const status = (row as { validation_status?: string }).validation_status ?? 'unknown';
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      total += 1;
    }

    const needsReviewCount = byStatus['needs_review'] ?? 0;
    const needsReviewRate = total > 0 ? Math.round((needsReviewCount / total) * 10000) / 100 : 0;

    return NextResponse.json({
      periodDays: days,
      since,
      byStatus,
      total,
      needsReviewCount,
      needsReviewRatePercent: needsReviewRate,
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
