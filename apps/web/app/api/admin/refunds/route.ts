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

      // Fetch aggregate stats for summary cards
      const { data: statsData } = await serverSupabase
        .from('escrow_transactions')
        .select('status, amount');

      const stats = {
        held_total: 0,
        held_count: 0,
        release_pending_count: 0,
        refunded_total: 0,
        refunded_count: 0,
        failed_count: 0,
      };

      if (statsData) {
        for (const row of statsData) {
          switch (row.status) {
            case 'held':
              stats.held_total += row.amount || 0;
              stats.held_count += 1;
              break;
            case 'release_pending':
              stats.release_pending_count += 1;
              break;
            case 'refunded':
              stats.refunded_total += row.amount || 0;
              stats.refunded_count += 1;
              break;
            case 'failed':
              stats.failed_count += 1;
              break;
          }
        }
      }

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
