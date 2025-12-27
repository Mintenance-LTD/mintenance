import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { contractorId } = await request.json();

    if (!contractorId) {
      throw new BadRequestError('Contractor ID required');
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
    return handleAPIError(error);
  }
}

