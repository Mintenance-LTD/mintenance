import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
} from '@/lib/errors/api-error';
import { operationFrom, recoverRefund } from './RefundService';
import {
  readAdminReleaseOperation,
  recoverAdminRelease,
} from './AdminReleaseService';

const resolutionSchema = z
  .object({
    id: z.string().uuid(),
    escrow_id: z.string().uuid(),
    decision: z.enum(['refund_homeowner', 'pay_contractor', 'split_50_50']),
    reason: z.string().min(5).max(500),
    principal_minor: z.number().int().positive(),
    refund_minor: z.number().int().nonnegative(),
    release_minor: z.number().int().nonnegative(),
    state: z.enum(['processing', 'completed']),
  })
  .refine((r) => r.refund_minor + r.release_minor === r.principal_minor)
  .refine((r) => {
    if (r.decision === 'refund_homeowner')
      return r.refund_minor === r.principal_minor;
    if (r.decision === 'pay_contractor')
      return r.release_minor === r.principal_minor;
    return (
      r.refund_minor > 0 && r.refund_minor === Math.floor(r.principal_minor / 2)
    );
  });

export type DisputeResolution = z.infer<typeof resolutionSchema>;

export function readDisputeResolution(data: unknown): DisputeResolution {
  if (Array.isArray(data) && data.length !== 1) {
    throw new InternalServerError('Dispute resolution could not be verified');
  }
  const result = resolutionSchema.safeParse(
    Array.isArray(data) ? data[0] : data
  );
  if (!result.success)
    throw new InternalServerError('Dispute resolution could not be verified');
  return result.data;
}

/** All money operations are durably reserved before invoking existing provider recovery. */
export async function recoverDisputeSettlement(
  adminId: string,
  resolution: DisputeResolution,
  deadlineAt = Date.now() + 25000
): Promise<{
  status: 'completed' | 'processing' | 'requires_intervention';
  resolutionId: string;
}> {
  resolution = readDisputeResolution(resolution);
  const result = (
    status: 'completed' | 'processing' | 'requires_intervention'
  ) => ({
    status,
    resolutionId: resolution.id,
  });
  if (resolution.state === 'completed') return result('completed');
  const checkDeadline = () => {
    if (Date.now() >= deadlineAt)
      throw new ServiceUnavailableError(
        'Dispute recovery time budget exhausted'
      );
  };
  checkDeadline();
  if (resolution.refund_minor > 0) {
    const { data, error } = await serverSupabase.rpc('reserve_dispute_refund', {
      p_admin_id: adminId,
      p_resolution_id: resolution.id,
    });
    if (error?.code === '42501' || error?.code === '23514') {
      throw new ConflictError(
        'Dispute refund requires administrator reconciliation'
      );
    }
    if (error)
      throw new InternalServerError(
        'Dispute refund reservation requires recovery'
      );
    const refund = operationFrom(data);
    if (
      refund.escrow_id !== resolution.escrow_id ||
      refund.gross_minor !== resolution.refund_minor
    ) {
      throw new InternalServerError(
        'Dispute refund does not match the reserved decision'
      );
    }
    const outcome = await recoverRefund(refund, deadlineAt);
    if (outcome.state !== 'succeeded') {
      return result(
        ['failed', 'canceled', 'reconciliation_required'].includes(
          outcome.state
        )
          ? 'requires_intervention'
          : 'processing'
      );
    }
  }
  if (resolution.release_minor > 0) {
    checkDeadline();
    const { data, error } = await serverSupabase.rpc(
      'reserve_dispute_release',
      {
        p_admin_id: adminId,
        p_resolution_id: resolution.id,
      }
    );
    if (error?.code === '42501' || error?.code === '23514') {
      throw new ConflictError(
        'Dispute release requires administrator reconciliation'
      );
    }
    if (error)
      throw new InternalServerError(
        'Dispute release reservation requires recovery'
      );
    const release = readAdminReleaseOperation(data);
    if (
      release.escrow_id !== resolution.escrow_id ||
      release.principal_minor !== resolution.release_minor
    ) {
      throw new InternalServerError(
        'Dispute release does not match the reserved decision'
      );
    }
    await recoverAdminRelease(release, deadlineAt);
  }
  checkDeadline();
  const { data, error } = await serverSupabase.rpc(
    'finalize_dispute_resolution',
    {
      p_resolution_id: resolution.id,
    }
  );
  if (error)
    throw new InternalServerError('Dispute finalization requires recovery');
  const final = readDisputeResolution(data);
  if (
    final.id !== resolution.id ||
    final.escrow_id !== resolution.escrow_id ||
    final.state !== 'completed' ||
    final.refund_minor !== resolution.refund_minor ||
    final.release_minor !== resolution.release_minor ||
    final.decision !== resolution.decision ||
    final.reason !== resolution.reason
  ) {
    throw new InternalServerError(
      'Dispute finalization does not match the reserved decision'
    );
  }
  return result('completed');
}
