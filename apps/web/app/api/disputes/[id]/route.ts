import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';

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

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(disputeId)) {
      return NextResponse.json({ error: 'Invalid dispute ID format' }, { status: 400 });
    }

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: dispute, error } = await serverSupabase
      .from('escrow_payments')
      .select('*')
      .eq('id', disputeId)
      .or(`contractor_id.eq.${user.id},client_id.eq.${user.id}${user.role === 'admin' ? ',id.neq.null' : ''}`)
      .single();

    if (error || !dispute) {
      // Don't reveal if dispute exists or not - return generic error
      return NextResponse.json({ error: 'Dispute not found or access denied' }, { status: 404 });
    }

    // Additional admin check if needed
    if (user.role !== 'admin' && dispute.contractor_id !== user.id && dispute.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(dispute);
  } catch (error) {
    logger.error('Error fetching dispute', error, { service: 'disputes' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

