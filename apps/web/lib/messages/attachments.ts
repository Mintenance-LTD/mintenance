import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const BUCKET = 'job-attachments';

/** Only our storage origin and bucket are accepted; never fetch supplied URLs. */
export function parseMessageAttachment(value: string): string {
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    const url = new URL(value);
    const local = process.env.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if (url.origin !== base.origin || url.username || url.password || url.hash ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error();
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/job-attachments\/(.+)$/);
    if (!match) throw new Error();
    const path = decodeURIComponent(match[1]);
    if (path.includes('%') || path.includes('\\') || /[\x00-\x1f]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..') ||
      !/\.(pdf|docx?|jpe?g|png|gif|webp|heic)$/i.test(path)) throw new Error();
    return path;
  } catch {
    throw new BadRequestError('Attachment must be a supported file from official storage');
  }
}

async function verifyAttachment(value: string, senderId: string, jobId: string) {
  const path = parseMessageAttachment(value);
  const parts = path.split('/');
  if (parts[0] !== senderId && parts[0] !== jobId) {
    throw new ForbiddenError('You may only attach files you uploaded yourself');
  }
  // Storage list/info responses omit ownership. A service-only, invoker RPC
  // verifies it without exposing the storage schema through the Data API.
  const { data, error } = await serverSupabase.rpc('can_attach_message_file', {
    p_path: path, p_sender: senderId, p_job: jobId,
  });
  if (error || data !== true) {
    throw new ForbiddenError('You may only attach files you uploaded yourself');
  }
  return path;
}

export async function prepareMessageAttachment(value: string, senderId: string, jobId: string) {
  const path = await verifyAttachment(value, senderId, jobId);
  // Existing mobile realtime subscribers render the database value directly.
  // Persist a fresh short-lived link; history reads renew it after authorization.
  const { data, error } = await serverSupabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new BadRequestError('Attachment is currently unavailable');
  return data.signedUrl;
}

/** Caller must authorize thread access before renewing any attachment. */
export async function refreshMessageAttachment<T extends {
  attachment_url?: string | null; sender_id: string; job_id: string;
}>(row: T): Promise<T> {
  if (!row.attachment_url) return row;
  try {
    const path = await verifyAttachment(row.attachment_url, row.sender_id, row.job_id);
    const { data, error } = await serverSupabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    return { ...row, attachment_url: error ? null : data?.signedUrl ?? null };
  } catch {
    // Do not pass through an unverified legacy URL or break the entire thread.
    return { ...row, attachment_url: null };
  }
}
