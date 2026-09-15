import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { operationFrom, recoverRefund } from './RefundService';

interface ExitOperation {
  id: string;
  job_id: string;
  actor_id: string;
  kind: 'withdraw' | 'terminate';
  reason: string;
  state: 'reserved' | 'completed';
}
interface ExitRequest {
  actorId: string;
  jobId: string;
  kind: ExitOperation['kind'];
  reason: string;
  requestKey: string | null;
}
function readExit(data: unknown, input: ExitRequest): ExitOperation {
  const row = (Array.isArray(data) ? data[0] : data) as
    | ExitOperation
    | undefined;
  if (
    !row?.id ||
    row.job_id !== input.jobId ||
    row.actor_id !== input.actorId ||
    row.kind !== input.kind ||
    row.reason !== input.reason ||
    !['reserved', 'completed'].includes(row.state)
  )
    throw new InternalServerError('Job exit operation could not be verified');
  return row;
}

export async function performJobExit(input: ExitRequest) {
  if (!input.requestKey || !/^[\x21-\x7e]{1,200}$/.test(input.requestKey))
    throw new BadRequestError(
      'A stable Idempotency-Key is required to safely retry this action'
    );
  const requestKey = createHash('sha256')
    .update(
      JSON.stringify([input.actorId, input.jobId, input.kind, input.requestKey])
    )
    .digest('hex');
  const { data, error } = await serverSupabase.rpc('reserve_job_exit', {
    p_actor_id: input.actorId,
    p_job_id: input.jobId,
    p_kind: input.kind,
    p_reason: input.reason,
    p_request_key: requestKey,
  });
  if (error) {
    if (error.code === '42501')
      throw new ForbiddenError('You cannot end this contractor assignment');
    if (['23514', '23505'].includes(error.code))
      throw new ConflictError(
        'The assignment or payment needs recovery before this action can continue'
      );
    throw new InternalServerError('Job exit could not be reserved');
  }
  let operation = readExit(data, input);
  let failed = false;
  let requiresReview = false;
  if (operation.state !== 'completed') {
    const { data: refunds, error: refundError } = await serverSupabase
      .from('escrow_refund_operations')
      .select('*')
      .eq('job_exit_id', operation.id)
      .in('state', [
        'reserved',
        'pending',
        'requires_action',
        'reconciliation_required',
      ])
      .limit(3);
    if (refundError)
      throw new InternalServerError('Refund recovery could not be loaded');
    const deadlineAt = Date.now() + 25000;
    for (const row of refunds ?? []) {
      if (row.job_exit_id !== operation.id)
        throw new InternalServerError('Refund belongs to another exit');
      try {
        const result = await recoverRefund(operationFrom(row), deadlineAt);
        if (result.state === 'reconciliation_required') requiresReview = true;
        if (['failed', 'canceled'].includes(result.state)) failed = true;
      } catch (error) {
        if (error instanceof ConflictError) requiresReview = true;
        // Provider success may have outlived the request. Keep the durable
        // operation pending; the refund worker or identical retry recovers it.
      }
    }
    const { data: current, error: currentError } = await serverSupabase
      .from('job_exit_operations')
      .select('*')
      .eq('id', operation.id)
      .single();
    if (currentError)
      throw new InternalServerError('Job exit confirmation could not be read');
    const refreshed = readExit(current, input);
    if (refreshed.id !== operation.id)
      throw new InternalServerError('Job exit confirmation identity changed');
    operation = refreshed;
  }
  if (operation.state !== 'completed')
    return NextResponse.json(
      {
        success: false,
        operationId: operation.id,
        status: requiresReview
          ? 'reconciliation_required'
          : failed
            ? 'refund_failed'
            : 'processing',
        message: requiresReview
          ? 'Payment reconciliation is required. Contact support before retrying.'
          : failed
            ? 'The refund failed. Retry the same action to attempt it again.'
            : 'The refund and assignment change are not yet confirmed. Retry the same action to check progress.',
      },
      { status: failed || requiresReview ? 409 : 202 }
    );
  const { count, error: countError } = await serverSupabase
    .from('escrow_refund_operations')
    .select('id', { count: 'exact', head: true })
    .eq('job_exit_id', operation.id)
    .eq('state', 'succeeded');
  if (
    countError ||
    typeof count !== 'number' ||
    !Number.isSafeInteger(count) ||
    count < 0
  )
    throw new InternalServerError(
      'Completed refund details could not be verified'
    );
  return NextResponse.json({
    success: true,
    status: 'completed',
    operationId: operation.id,
    escrowRefunded: count > 0,
    message: 'This contractor assignment has ended.',
  });
}
