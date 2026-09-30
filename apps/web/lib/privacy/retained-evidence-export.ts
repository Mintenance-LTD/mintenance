import { createHash } from 'node:crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { disputeEvidencePath } from '@/lib/services/disputes/evidence';
import { InternalServerError } from '@/lib/errors/api-error';

/** A staff review packet, never an automatically deliverable subject-access response. */
export async function buildRetainedEvidencePacket(
  kind: 'contract' | 'dispute',
  record: Record<string, unknown>
) {
  const serialized = JSON.stringify(record);
  if (Buffer.byteLength(serialized) > 1_000_000)
    throw new InternalServerError(
      'This record needs an offline evidence export.'
    );
  const evidence = record.evidence as Record<string, unknown>;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence))
    throw new InternalServerError('Archived evidence could not be verified.');
  const files: {
    path: string;
    encoding: 'base64';
    content: string;
    sha256: string;
  }[] = [];
  const unresolved: string[] = [];
  // Inventory every reference, including unfamiliar links embedded in notes.
  const references = new Set(
    serialized.match(/(?:https?:\/\/|job-attachments:)[^\s"\\<>]+/g) ?? []
  );
  const paths = new Set<string>();
  for (const reference of references) {
    const path =
      kind === 'dispute' &&
      typeof record.job_id === 'string' &&
      typeof record.claimant_id === 'string'
        ? disputeEvidencePath(reference, record.job_id, record.claimant_id)
        : null;
    if (path) paths.add(path);
    else unresolved.push(reference);
  }
  if (paths.size > 20)
    throw new InternalServerError(
      'This record needs an offline evidence export.'
    );
  let bytes = Buffer.byteLength(serialized);
  for (const path of paths) {
    const { data, error } = await serverSupabase.storage
      .from('job-attachments')
      .download(path);
    if (error || !data)
      throw new InternalServerError(
        'An evidence file is unavailable. No export was completed.'
      );
    bytes += data.size;
    // Keep the encoded response below the hosting response limit.
    if (bytes > 2_000_000)
      throw new InternalServerError(
        'This record needs an offline evidence export.'
      );
    const content = Buffer.from(await data.arrayBuffer());
    files.push({
      path,
      encoding: 'base64',
      content: content.toString('base64'),
      sha256: createHash('sha256').update(content).digest('hex'),
    });
  }
  return {
    format: 'mintenance-staff-evidence-v1',
    generated_at: new Date().toISOString(),
    requires_privacy_review_before_delivery: true,
    scope:
      'One retained record; not a complete account export or proof of erasure.',
    record,
    record_sha256: createHash('sha256').update(serialized).digest('hex'),
    files,
    external_references: unresolved,
    external_files_complete:
      references.size === paths.size &&
      !/"(?:storage_path|bucket|file_path|attachment)[^"]*"\s*:/.test(
        serialized
      ),
    disposal:
      'No files deleted. External and processor copies require separately verified disposal.',
  };
}
