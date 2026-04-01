import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/refunds
 * Fetches escrow transactions with filtering for the admin refund management page.
 * Joins with jobs (title, status) and profiles (homeowner/contractor names).
 */
export const GET = withApiHandler(
  {
    roles: ['admin'],
    csrf: false,
    rateLimit: { maxRequests: 60 },
  },
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );
    const offset = (page - 1) * limit;

    try {
      // Build query with joins
      let query = serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          amount,
          status,
          payment_intent_id,
          transfer_id,
          platform_fee,
          contractor_payout,
          release_reason,
          created_at,
          updated_at,
          released_at,
          jobs!inner (
            id,
            title,
            status,
            homeowner_id,
            contractor_id,
            homeowner:profiles!jobs_homeowner_id_fkey (
              id,
              first_name,
              last_name,
              email
            ),
            contractor:profiles!jobs_contractor_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply date range filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      // Apply search filter (search in job title)
      if (search) {
        query = query.ilike('jobs.title', `%${search}%`);
      }

      const { data: escrows, error, count } = await query;

      if (error) {
        logger.error(
          'Failed to fetch escrow transactions for admin refunds',
          error,
          {
            service: 'admin-refunds',
          }
        );
        return NextResponse.json(
          { success: false, error: 'Failed to fetch escrow transactions' },
          { status: 500 }
        );
      }

      // Fetch aggregate stats via separate count queries (avoids loading all rows)
      const [
        { count: heldCount, data: heldAmounts },
        { count: releasePendingCount },
        { count: refundedCount, data: refundedAmounts },
        { count: failedCount },
      ] = await Promise.all([
        serverSupabase
          .from('escrow_transactions')
          .select('amount', { count: 'exact' })
          .eq('status', 'held'),
        serverSupabase
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'release_pending'),
        serverSupabase
          .from('escrow_transactions')
          .select('amount', { count: 'exact' })
          .eq('status', 'refunded'),
        serverSupabase
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed'),
      ]);

      const stats = {
        held_total: (heldAmounts ?? []).reduce(
          (sum, r) => sum + (r.amount || 0),
          0
        ),
        held_count: heldCount ?? 0,
        release_pending_count: releasePendingCount ?? 0,
        refunded_total: (refundedAmounts ?? []).reduce(
          (sum, r) => sum + (r.amount || 0),
          0
        ),
        refunded_count: refundedCount ?? 0,
        failed_count: failedCount ?? 0,
      };

      return NextResponse.json({
        success: true,
        data: escrows || [],
        total: count || 0,
        page,
        limit,
        stats,
      });
    } catch (err) {
      logger.error('Unexpected error in admin refunds GET', err as Error, {
        service: 'admin-refunds',
      });
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
