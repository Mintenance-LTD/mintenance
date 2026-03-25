import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const bidIdFilter = searchParams.get('bidId');

    // Pagination params (cursor-based via offset/limit)
    const limitParam = Math.min(
      Math.max(Number(searchParams.get('limit')) || 20, 1),
      50
    );
    const offsetParam = Math.max(Number(searchParams.get('offset')) || 0, 0);

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
    `,
        { count: 'exact' }
      )
      .eq('contractor_id', user.id);

    if (bidIdFilter) {
      query = query.eq('id', bidIdFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    query = query
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offsetParam, offsetParam + limitParam - 1);

    const { data: bids, error, count } = await query;

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
      pagination: {
        total: count ?? 0,
        limit: limitParam,
        offset: offsetParam,
        hasMore: count ? offsetParam + limitParam < count : false,
      },
    });
  }
);
