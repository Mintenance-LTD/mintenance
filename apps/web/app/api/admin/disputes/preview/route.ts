import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import {
  FeeCalculationService,
  type PaymentType,
} from '@/lib/services/payment/FeeCalculationService';
import { settlementBreakdown } from '@/lib/payments/settlement-breakdown';

const schema = z.object({
  escrowId: z.string().uuid(),
  decision: z.enum(['pay_contractor', 'refund_homeowner', 'split_50_50']),
});
export const GET = withApiHandler(
  { roles: ['admin'], csrf: false, rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const parsed = schema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success)
      throw new BadRequestError('Choose a payment and settlement option.');
    await requireAdminFromDatabase(user.id);
    const { escrowId, decision } = parsed.data;
    const [payment, balance, saved] = await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select('id,amount,payer_id,payee_id,status,payment_type')
        .eq('id', escrowId)
        .maybeSingle(),
      serverSupabase
        .from('escrow_refund_balances')
        .select('gross_minor,remaining_minor,needs_review')
        .eq('escrow_id', escrowId)
        .maybeSingle(),
      serverSupabase
        .from('escrow_dispute_resolutions')
        .select('id,decision,principal_minor,fee_rate')
        .eq('escrow_id', escrowId)
        .maybeSingle(),
    ]);
    if (payment.error || balance.error || saved.error)
      throw new InternalServerError('Unable to load settlement amounts.');
    const e = payment.data;
    if (!e) throw new NotFoundError('Payment not found');
    if (
      (!saved.data && e.status !== 'disputed') ||
      (saved.data && saved.data.decision !== decision) ||
      balance.data?.needs_review
    )
      throw new ConflictError('Reload the case before choosing a settlement.');
    const gross = Math.round(Number(e.amount) * 100);
    if (balance.data && balance.data.gross_minor !== gross)
      throw new ConflictError('Payment balance needs reconciliation.');
    const tier = await FeeCalculationService.resolveContractorTier(e.payee_id);
    const feeRate = saved.data
      ? Number(saved.data.fee_rate)
      : FeeCalculationService.calculateFees(100, {
          contractorTier: tier,
          paymentType: (e.payment_type || 'final') as PaymentType,
        }).platformFeeRate;
    const principalMinor =
      saved.data?.principal_minor ?? balance.data?.remaining_minor ?? gross;
    const breakdown = settlementBreakdown(principalMinor, feeRate, decision);
    return NextResponse.json(
      {
        escrowId,
        decision,
        ...breakdown,
        confirmation: {
          principalMinor,
          feeRate,
          payerId: e.payer_id,
          payeeId: e.payee_id,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);
