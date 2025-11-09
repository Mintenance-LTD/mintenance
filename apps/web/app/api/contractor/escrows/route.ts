import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/contractor/escrows
 * Get contractor's escrow transactions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: escrows, error } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        job_id,
        amount,
        status,
        created_at,
        jobs!inner (
          id,
          title,
          contractor_id
        )
      `
      )
      .eq('payee_id', user.id)
      .eq('jobs.contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching contractor escrows', error);
      return NextResponse.json({ error: 'Failed to fetch escrows' }, { status: 500 });
    }

    const formattedEscrows = (escrows || []).map((escrow: any) => ({
      id: escrow.id,
      jobId: escrow.job_id,
      jobTitle: escrow.jobs?.title || 'Unknown Job',
      amount: escrow.amount,
      status: escrow.status,
      createdAt: escrow.created_at,
    }));

    return NextResponse.json({ success: true, data: formattedEscrows });
  } catch (error) {
    logger.error('Error in contractor escrows endpoint', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

