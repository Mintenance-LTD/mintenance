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

  const { data, error } = await serverSupabase
    .from('properties')
    .select('id, property_name, property_type, address, city, postcode, is_primary, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({
    feature: 'portfolio_mode',
    properties: data || [],
  });
});
