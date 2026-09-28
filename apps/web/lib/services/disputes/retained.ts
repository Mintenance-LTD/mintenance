import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { readDisputeEvidence } from './evidence';
const archiveSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  status: z.literal('archived'),
  archived: z.literal(true),
  description: z.string().nullable(),
  raised_by: z.string().uuid().nullable(),
  dispute_reason: z.string().nullable(),
  resolution: z.string().nullable(),
  created_at: z.string().nullable(),
  archived_at: z.string(),
  review_due_at: z.string(),
  requires_retention_review: z.boolean(),
});
export async function readRetainedDispute(escrowId: string, userId: string) {
  const { data, error } = await serverSupabase.rpc('read_retained_dispute', {
    p_escrow_id: escrowId,
    p_user_id: userId,
  });
  if (error?.code === '42501')
    throw new NotFoundError('Dispute not found or access denied');
  if (error)
    throw new InternalServerError(
      'Unable to load retained dispute. Please retry.'
    );
  if (!data) return null;
  const parsed = archiveSchema.safeParse(data);
  if (!parsed.success || parsed.data.id !== escrowId)
    throw new InternalServerError('Retained dispute could not be verified.');
  const record = parsed.data;
  return {
    ...record,
    priority: 'normal',
    dispute_evidence: await readDisputeEvidence(
      record.description,
      record.job_id,
      record.raised_by
    ),
  };
}
