import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

/** Capture a completion version, then let the transaction recheck it and commit all evidence. */
export async function recordCompletionReview(input: {
  escrowId: string;
  actorId: string;
  action: 'request' | 'inspect' | 'reject';
  completedAt?: string | null;
  reason?: string;
}): Promise<boolean> {
  const { data: escrow, error } = await serverSupabase
    .from('escrow_transactions')
    .select('job_id, jobs!inner(id, completed_at)')
    .eq('id', input.escrowId)
    .single();
  if (error || !escrow) throw new NotFoundError('Escrow not found');
  const joined = escrow.jobs as unknown as
    | { id: string; completed_at: string | null }
    | { id: string; completed_at: string | null }[];
  const job = Array.isArray(joined) ? joined[0] : joined;
  if (!job) throw new NotFoundError('Job not found');
  const { data, error: reviewError } = await serverSupabase.rpc(
    'record_completion_review',
    {
      p_job_id: job.id,
      p_escrow_id: input.escrowId,
      p_actor_id: input.actorId,
      p_expected_completed_at:
        input.completedAt === undefined ? job.completed_at : input.completedAt,
      p_action: input.action,
      p_reason: input.reason ?? null,
    }
  );
  if (reviewError?.code === '42501')
    throw new ForbiddenError('Not authorized to review this completion');
  if (reviewError?.code === '23514')
    throw new ConflictError(reviewError.message);
  if (reviewError?.code === 'P0002')
    throw new NotFoundError('Current job or escrow not found');
  if (reviewError || typeof data !== 'boolean')
    throw new InternalServerError('Unable to confirm review. Please retry.');
  return data;
}
