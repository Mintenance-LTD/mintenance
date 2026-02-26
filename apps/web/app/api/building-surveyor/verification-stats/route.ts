/**
 * Phase 7: Verification & observability.
 * GET /api/building-surveyor/verification-stats – admin-only counts by validation_status.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

const DEFAULT_DAYS = 30;

export const GET = withApiHandler({ roles: ['admin'] }, async (request) => {
  const { searchParams } = new URL(request.url);
  const days = Math.min(
    365,
    Math.max(1, parseInt(searchParams.get('days') ?? String(DEFAULT_DAYS), 10) || DEFAULT_DAYS)
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await serverSupabase
    .from('building_assessments')
    .select('validation_status')
    .gte('created_at', since);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch verification stats' },
      { status: 500 }
    );
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
});
