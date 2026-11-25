import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { getOrgMembership } from '@/lib/auth-manager/org-roles';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const orgSchema = z.string().uuid();

export const GET = withApiHandler({}, async (request, { user }) => {
  const blocked = await requirePortfolioModeSubscription(request);
  if (blocked) return blocked;

  const url = request.nextUrl;
  const orgId = url.searchParams.get('orgId');
  if (orgId !== null) {
    if (!orgSchema.safeParse(orgId).success)
      throw new BadRequestError('Invalid workspace');
    const membership = await getOrgMembership(orgId, user.id);
    if (!membership || membership.org_role === 'tenant')
      throw new ForbiddenError(
        'This workspace property list is available to active staff only'
      );
  }

  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1),
    100
  );
  const from = (page - 1) * limit;

  const properties = serverSupabase
    .from('properties')
    .select(
      'id, property_name, property_type, address, city, postcode, is_primary, created_at, updated_at',
      { count: 'exact' }
    );

  const { data, error, count } = await (
    orgId ? properties.eq('org_id', orgId) : properties.eq('owner_id', user.id)
  )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;
  const total = count ?? 0;
  return NextResponse.json(
    {
      feature: 'portfolio_mode',
      properties: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: from + limit < total,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
});
