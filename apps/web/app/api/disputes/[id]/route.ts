import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: disputeId } = await params;

    const { data: dispute, error } = await serverSupabase
      .from('escrow_payments')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Verify user has access
    if (dispute.contractor_id !== user.id && dispute.client_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(dispute);
  } catch (error) {
    logger.error('Error fetching dispute', error, { service: 'disputes' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

