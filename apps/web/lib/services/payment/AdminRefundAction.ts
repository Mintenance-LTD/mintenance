import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, ConflictError } from '@/lib/errors/api-error';
import {
  readRefundContext,
  reserveAdminRefund,
  recoverRefund,
} from './RefundService';

interface AdminRefundEscrow {
  id: string;
  amount: number;
  payer_id: string;
}
interface AdminRefundJob {
  id: string;
}

export async function performAdminRefundAction(input: {
  escrow: AdminRefundEscrow;
  job: AdminRefundJob;
  user: { id: string };
  reason: string;
  refundAmount?: number;
  requestKey: string | null;
}): Promise<NextResponse> {
  const { escrow, job, user, reason, refundAmount } = input;
  if (!input.requestKey || input.requestKey.length > 200) {
    throw new BadRequestError('A refund request key is required');
  }
  if (!escrow.payer_id)
    throw new ConflictError('Refund payer requires reconciliation');
  const requestKey =
    'admin-refund:' +
    createHash('sha256')
      .update(JSON.stringify([user.id, escrow.id, input.requestKey]))
      .digest('hex');
  const context = await readRefundContext({
    escrowId: escrow.id,
    actorId: escrow.payer_id,
    requestKey,
    originalAmount: escrow.amount,
  });
  const grossMinor =
    refundAmount === undefined
      ? (context.existing?.gross_minor ?? context.remainingMinor)
      : Math.round(refundAmount * 100);
  if (
    !Number.isSafeInteger(grossMinor) ||
    grossMinor <= 0 ||
    (!context.existing && grossMinor > context.remainingMinor)
  ) {
    throw new BadRequestError(
      'Refund amount exceeds the available balance or is invalid'
    );
  }
  // Always reserve/revalidate, including retries. The RPC checks current admin
  // authority and binds amount, reason, payer and initiating administrator.
  const operation = await reserveAdminRefund({
    adminId: user.id,
    payerId: escrow.payer_id,
    jobId: job.id,
    escrowId: escrow.id,
    requestKey,
    grossMinor,
    reason,
  });
  let outcome;
  try {
    outcome = await recoverRefund(operation);
  } catch (error) {
    logger.error('Admin refund awaiting durable recovery', error, {
      service: 'admin-refunds',
      operationId: operation.id,
    });
    return NextResponse.json(
      {
        success: false,
        operationId: operation.id,
        status: 'processing',
        error: 'Refund is not confirmed. Retry to check the same request.',
      },
      { status: 202 }
    );
  }
  if (outcome.state !== 'succeeded') {
    return NextResponse.json(
      {
        success: false,
        operationId: outcome.id,
        status: outcome.state,
        error: 'Refund is not confirmed. Retry to check its status.',
      },
      { status: ['failed', 'canceled'].includes(outcome.state) ? 409 : 202 }
    );
  }
  const finalContext = await readRefundContext({
    escrowId: escrow.id,
    actorId: escrow.payer_id,
    requestKey,
    originalAmount: escrow.amount,
  });
  return NextResponse.json({
    success: true,
    operationId: outcome.id,
    status: 'succeeded',
    refundId: outcome.provider_refund_id,
    amount: outcome.gross_minor / 100,
    cashAmount: outcome.cash_minor / 100,
    creditReturned: outcome.credit_minor / 100,
    remainingAmount: finalContext.remainingMinor / 100,
    message: 'Refund confirmed.',
  });
}

/**
 * Writes an audit log entry for admin escrow actions.
 */
export async function writeAuditLog(
  adminId: string,
  action: string,
  escrowId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const { error: auditError } = await serverSupabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action: 'UPDATE',
        table_name: 'escrow_transactions',
        record_id: escrowId,
        new_values: { event: action, ...metadata },
      });

    if (auditError) throw auditError;
  } catch (err) {
    logger.error(
      'Failed to write audit log for admin refund action',
      err as Error,
      {
        service: 'admin-refunds',
        action,
        escrowId,
      }
    );
  }
}
