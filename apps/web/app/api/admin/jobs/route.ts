import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/jobs
 * Fetch all jobs with homeowner/contractor profiles, filtering, search, and pagination.
 * Admin-only endpoint (bypasses RLS via service role key).
 */
export const GET = withApiHandler({ roles: ['admin'] }, async (request) => {
  const url = new URL(request.url);

  // Pagination
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  // Filters
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = url.searchParams.get('order') || 'desc';

  // Build query with profile joins using established FK patterns
  let query = serverSupabase
    .from('jobs')
    .select(
      `
      id,
      title,
      status,
      category,
      budget,
      created_at,
      updated_at,
      completed_at,
      homeowner_id,
      contractor_id,
      homeowner:users!jobs_homeowner_id_fkey (
        id,
        first_name,
        last_name,
        email
      ),
      contractor:users!jobs_contractor_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  // Status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Search filter: match on title or homeowner/contractor email via ilike
  if (search) {
    query = query.or(`title.ilike.%${search}%`);
  }

  // Sorting
  const ascending = order === 'asc';
  const validSortColumns = [
    'created_at',
    'updated_at',
    'budget',
    'title',
    'status',
  ];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
  query = query.order(sortColumn, { ascending });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to fetch admin jobs', {
      service: 'admin-jobs',
      error: error.message,
    });
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }

  // Compute summary stats with a separate count query for each status
  const [
    { count: totalCount },
    { count: postedCount },
    { count: assignedCount },
    { count: inProgressCount },
    { count: completedCount },
    { count: cancelledCount },
  ] = await Promise.all([
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'posted')
      .is('deleted_at', null),
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'assigned')
      .is('deleted_at', null),
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .is('deleted_at', null),
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .is('deleted_at', null),
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .is('deleted_at', null),
  ]);

  return NextResponse.json({
    success: true,
    data: data || [],
    total: count ?? 0,
    page,
    limit,
    stats: {
      total: totalCount ?? 0,
      posted: postedCount ?? 0,
      assigned: assignedCount ?? 0,
      inProgress: inProgressCount ?? 0,
      completed: completedCount ?? 0,
      cancelled: cancelledCount ?? 0,
      active: (assignedCount ?? 0) + (inProgressCount ?? 0),
    },
  });
});
