import { serverSupabase } from '@/lib/api/supabaseServer';

const BUCKET = 'job-attachments';

/** Only the claimant's evidence for this exact job may be re-signed. */
export function disputeEvidencePath(
  value: string,
  jobId: string,
  claimantId: string
): string | null {
  let path: string;
  if (value.startsWith(`${BUCKET}:`)) {
    path = value.slice(BUCKET.length + 1);
  } else {
    try {
      const url = new URL(value);
      const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
      if (
        url.origin !== origin ||
        url.username ||
        url.password ||
        !['http:', 'https:'].includes(url.protocol)
      )
        return null;
      const match = url.pathname.match(
        /^\/storage\/v1\/object\/(?:sign|public)\/job-attachments\/(.+)$/
      );
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  if (/[\\\x00-\x1f\x7f%?#]/.test(path)) return null;
  const parts = path.split('/');
  if (
    parts.length !== 4 ||
    parts.some((part) => !part || part === '.' || part === '..')
  )
    return null;
  return parts[0] === jobId &&
    parts[1] === 'disputes' &&
    parts[2] === claimantId
    ? path
    : null;
}

export interface DisputeEvidenceItem {
  label: string;
  url: string | null;
}

/** Called only after dispute reader authorization and exact escrow-link lookup. */
export async function readDisputeEvidence(
  description: string | null,
  jobId: string,
  claimantId: string | null
): Promise<DisputeEvidenceItem[]> {
  if (!description || !claimantId) return [];
  const marker = description.lastIndexOf('\n\nEvidence:\n');
  if (marker < 0) return [];
  const values = description
    .slice(marker + '\n\nEvidence:\n'.length)
    .split('\n')
    .slice(0, 20)
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());
  const paths = [
    ...new Set(
      values
        .map((value) => disputeEvidencePath(value, jobId, claimantId))
        .filter((path): path is string => path !== null)
    ),
  ];
  return Promise.all(
    paths.map(async (path, index) => {
      try {
        const { data, error } = await serverSupabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 600);
        return {
          label: `Evidence ${index + 1}`,
          url: error ? null : (data?.signedUrl ?? null),
        };
      } catch {
        return { label: `Evidence ${index + 1}`, url: null };
      }
    })
  );
}
