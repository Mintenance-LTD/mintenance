import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the manual `typeof body?.contractorId === 'string'` check.
const sendReminderSchema = z
  .object({
    contractorId: z.string().uuid('Invalid contractor ID'),
  })
  .strict();

/**
 * POST /api/admin/contractors/send-payment-setup-reminder
 * Send a payment setup reminder to a contractor with pending escrows
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // 2026-05-01 audit follow-up: sends a payment-setup reminder via
    // email + push. A stolen admin cookie could fire arbitrary mail to
    // any contractor. Same 15-min MFA window as other admin send routes.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'contractor_payment_setup_reminder',
      category: 'communication',
      targetType: 'contractor',
      description: 'Sent a payment-setup reminder to a contractor',
    },
  },
  async (request) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = sendReminderSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Contractor ID required'
      );
    }
    const { contractorId } = parsed.data;

    const { data: escrows } = await serverSupabase
      .from('escrow_transactions')
      .select(`id, amount, jobs!inner (contractor_id, title)`)
      .eq('jobs.contractor_id', contractorId)
      .in('status', [
        'held',
        'awaiting_homeowner_approval',
        'pending_review',
        'pending',
      ]);

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
