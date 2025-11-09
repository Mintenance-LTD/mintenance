import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId } = await request.json();

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    // Get contractor's pending escrows
    const { data: escrows } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        amount,
        jobs!inner (
          contractor_id,
          title
        )
      `)
      .eq('jobs.contractor_id', contractorId)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending']);

    if (escrows && escrows.length > 0) {
      const totalAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
      const jobTitles = escrows.map((e) => (e.jobs as any).title).join(', ');

      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        contractorId,
        escrows[0].id,
        `${escrows.length} job(s)`,
        totalAmount
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error sending payment setup reminder', error);
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    );
  }
}

