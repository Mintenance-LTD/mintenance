import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can view bids' }, { status: 403 });
    }

    // Fetch contractor's bids with job details
    const { data: bids, error } = await serverSupabase
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
          photos
        )
      `
      )
      .eq('contractor_id', user.id)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

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

