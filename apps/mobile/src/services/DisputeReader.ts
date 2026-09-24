import { z } from 'zod';
import Constants from 'expo-constants';
import { mobileApiClient } from '../utils/mobileApiClient';

const recordSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  status: z.string(),
  archived: z.boolean().optional(),
  dispute_record_id: z.string().uuid().nullable().optional(),
  dispute_record_status: z.string().nullable().optional(),
  dispute_reason: z.string().nullable(),
  description: z.string().nullable(),
  resolution: z.string().nullable(),
  dispute_evidence: z
    .array(z.object({ label: z.string(), url: z.string().nullable() }))
    .max(20),
});
export type DisputeRecord = z.infer<typeof recordSchema>;
export type DisputeTarget =
  | { escrowId: string; jobId?: never }
  | { jobId: string; escrowId?: never };

export async function readDispute(
  target: DisputeTarget,
  signal?: AbortSignal
): Promise<DisputeRecord | null> {
  let escrowId = target.escrowId;
  if (!escrowId) {
    const jobId = z.string().uuid().parse(target.jobId);
    const response = await mobileApiClient.get<unknown>(
      `/api/jobs/${jobId}/escrow`,
      { signal }
    );
    const { escrow } = z
      .object({ escrow: z.object({ id: z.string().uuid() }).nullable() })
      .parse(response);
    if (!escrow) return null;
    escrowId = escrow.id;
  }
  z.string().uuid().parse(escrowId);
  const response = await mobileApiClient.get<unknown>(
    `/api/disputes/${escrowId}`,
    { signal }
  );
  const record = recordSchema.parse(response);
  if (
    record.id !== escrowId ||
    (target.jobId && record.job_id !== target.jobId)
  ) {
    throw new Error('Dispute record could not be verified');
  }
  if (!record.archived && !record.dispute_record_id) {
    if (record.status === 'disputed')
      throw new Error('Dispute record needs review');
    return null;
  }
  return record;
}

/** Open only a fresh private storage link issued by the authorized reader. */
export function safeEvidenceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const origin =
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      Constants.expoConfig?.extra?.supabaseUrl;
    if (typeof origin !== 'string') return null;
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.origin !== new URL(origin).origin ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/storage/v1/object/sign/job-attachments/')
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function disputeStatement(description: string | null): string {
  const marker = description?.lastIndexOf('\n\nEvidence:\n') ?? -1;
  return (
    (marker < 0 ? description : description?.slice(0, marker))?.trim() ||
    'No statement recorded.'
  );
}
