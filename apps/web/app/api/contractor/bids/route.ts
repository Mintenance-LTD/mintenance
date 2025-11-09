import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can view bids' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Fetch contractor's bids with job details and homeowner info
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
          homeowner:users!jobs_homeowner_id_fkey (
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

    // Apply status filter if provided
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
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bids: bids || [],
    });
  } catch (error) {
    logger.error('Unexpected error in contractor bids', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

