import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';

/**
 * Portfolio Mode: property list endpoint.
 * This is intentionally separate from /api/properties so we can paywall new
 * landlord/agent workflows without breaking existing homeowner features.
 */
export const GET = withApiHandler({}, async (request, { user }) => {
  const blocked = await requirePortfolioModeSubscription(request);
  if (blocked) {
    return blocked;
  }

  // Pagination: page & limit via query string, clamped to sane bounds.
  const url = new URL(request.url);
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1),
    100
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await serverSupabase
    .from('properties')
    .select(
      'id, property_name, property_type, address, city, postcode, is_primary, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const total = count ?? 0;
  return NextResponse.json({
    feature: 'portfolio_mode',
    properties: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: to + 1 < total,
    },
  });
});
