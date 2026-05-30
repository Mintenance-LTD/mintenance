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
    // 2026-05-24 audit-26 P1: jobId filter lets the contractor job
    // detail screen check "do I have a bid on this job?" without
    // pulling the full bid list. The homeowner-side
    // /api/jobs/:id/bids is owner-gated, so contractors had no way
    // to see their own bid state and the CTA stayed on "Submit Bid"
    // even after they'd bid.
    const jobIdFilter = searchParams.get('jobId');

    // Pagination params (cursor-based via offset/limit)
    const limitParam = Math.min(
      Math.max(Number(searchParams.get('limit')) || 20, 1),
      50
    );
    const offsetParam = Math.max(Number(searchParams.get('offset')) || 0, 0);

    let query = serverSupabase
      .from('bids')
      .select(
        // 2026-05-24 audit-26 P2: include the fields the BidSubmissionScreen
        // "Edit Bid" flow needs to hydrate the form — message (canonical
        // column, mirror of description), estimated_duration_days, and
        // proposed_start_date. Without these the edit screen rendered
        // blank for every field below "amount/description", and the
        // contractor had to retype the whole bid to make a change.
        `
      id,
      job_id,
      contractor_id,
      amount,
      description,
      message,
      estimated_duration_days,
      proposed_start_date,
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

    if (jobIdFilter) {
      query = query.eq('job_id', jobIdFilter);
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
