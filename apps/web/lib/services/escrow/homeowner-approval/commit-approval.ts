import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

const approvalResult = z.object({
  applied: z.boolean(),
  escrowId: z.string().uuid(),
  amount: z.number().nonnegative(),
  coolingOffEndsAt: z.string().nullable(),
  notificationId: z.string().uuid().nullable(),
});

/** The database rechecks parties, completion version, photos and payment state under locks. */
export async function commitCompletionApproval(input: {
  jobId: string;
  actorId: string;
  completedAt: string | null;
  escrowId?: string;
  comments?: string;
  automatic?: boolean;
  waiveCoolingOff?: boolean;
}) {
  const { data, error } = await serverSupabase.rpc('approve_job_completion', {
    p_job_id: input.jobId,
    p_actor_id: input.actorId,
    p_expected_completed_at: input.completedAt,
    p_escrow_id: input.escrowId ?? null,
    p_comments: input.comments ?? null,
    p_automatic: input.automatic === true,
    p_waive_cooling_off: input.waiveCoolingOff === true,
  });
  if (error) {
    if (error.code === '42501')
      throw new ForbiddenError(
        'Only the designated payer can approve completion'
      );
    if (error.code === 'P0002')
      throw new NotFoundError('Job or payment record not found');
    if (error.code === '23514') throw new ConflictError(error.message);
    logger.error('Atomic completion approval failed', error, {
      service: 'escrow',
      jobId: input.jobId,
    });
    throw new InternalServerError(
      'Unable to confirm completion approval. Please retry.'
    );
  }
  const result = approvalResult.safeParse(data);
  if (!result.success)
    throw new InternalServerError(
      'Unable to confirm completion approval. Please retry.'
    );
  return result.data;
}
