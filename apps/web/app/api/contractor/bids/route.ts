import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const GET = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  let query = serverSupabase
    .from('bids')
    .select(
      `
      id,
      job_id,
      amount,
      description,
      status,
      created_at,
      updated_at,
      jobs (
        id,
        title,
        description,
        budget,
        location,
        category,
        status,
        created_at,
        photos,
        homeowner_id,
        homeowner:profiles!homeowner_id (
          id,
          first_name,
          last_name,
          email,
          profile_image_url
        )
      )
    `
    )
    .eq('contractor_id', user.id);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  query = query.order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  const { data: bids, error } = await query;

  if (error) {
    logger.error('Failed to fetch contractor bids', {
      service: 'contractor',
      contractorId: user.id,
      error: error.message,
    });
    throw error;
  }

  return NextResponse.json({
    success: true,
    bids: bids || [],
  });
});
