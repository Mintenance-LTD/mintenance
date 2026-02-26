import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * POST /api/admin/contractors/send-payment-setup-reminder
 * Send a payment setup reminder to a contractor with pending escrows
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const body = await request.json();
    const contractorId = typeof body?.contractorId === 'string' ? body.contractorId.trim() : null;

    if (!contractorId) {
      throw new BadRequestError('Contractor ID required');
    }

    const { data: escrows } = await serverSupabase
      .from('escrow_transactions')
      .select(`id, amount, jobs!inner (contractor_id, title)`)
      .eq('jobs.contractor_id', contractorId)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending']);

    if (escrows && escrows.length > 0) {
      const totalAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        contractorId,
        escrows[0].id,
        `${escrows.length} job(s)`,
        totalAmount
      );
    }

    return NextResponse.json({ success: true });
  }
);
