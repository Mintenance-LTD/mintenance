import { serverSupabase } from './supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Signed-URL helper for the `assessment-photos` bucket.
 *
 * The bucket was flipped from `public=true` to `public=false` in migration
 * 20260726135946: it stores interior photographs of people's homes, and a
 * public URL is world-readable forever once it leaks. Nothing was lost in the
 * flip because the bucket was empty — React Native's direct-to-storage upload
 * never landed bytes, which is the same defect that put every mobile upload
 * behind the server.
 *
 * Mirrors `job-storage.ts` deliberately: same signing shape, same
 * extract-then-resign recovery, so there is one storage idiom in the codebase
 * rather than two.
 *
 * On TTL: a stored signed URL does eventually expire, but expiry is never
 * fatal here because `extractAssessmentPath` can recover the object key from a
 * stored URL and re-sign it. Render paths should call `resignAssessmentUrls`
 * rather than trusting a persisted URL indefinitely.
 */
const BUCKET = 'assessment-photos';

/**
 * 365 days, matching job-storage.
 *
 * Deliberately long because callers PERSIST these URLs into
 * `assessment_images.image_url`. A short TTL would look correct in the vision
 * call that consumes the URL immediately and then quietly break every stored
 * image an hour later — the same expiry trap the room-photo URLs are already
 * sitting in. Read paths should still call `resignAssessmentUrls` rather than
 * trusting a persisted URL forever.
 */
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * Sign an object key inside `assessment-photos`.
 *
 * Uses the service-role client: signing does not need the caller's JWT, so
 * callers are responsible for verifying ownership before calling.
 *
 * @returns the signed URL, or `null` if signing failed.
 */
export async function signAssessmentPath(
  path: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  const { data, error } = await serverSupabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    const isMissingObject =
      error != null && /object not found/i.test(error.message ?? '');
    const meta = { service: 'assessment-storage', path, ttlSeconds };

    if (isMissingObject) {
      // Expected for historical rows: assessment_images predates this bucket
      // and its 30 existing rows point at Job-storage, not here.
      logger.warn('assessment-photos object missing', meta);
    } else {
      logger.error(
        'Failed to sign assessment-photos URL',
        error ?? new Error('no signedUrl'),
        meta
      );
    }
    return null;
  }

  return data.signedUrl;
}

/**
 * Recover the object key inside `assessment-photos` from a stored URL.
 *
 * Handles the three shapes that can appear in `assessment_images.image_url`:
 *   1. Legacy public URL  `/storage/v1/object/public/assessment-photos/<path>`
 *      — dead since the bucket flip, but still recoverable to a path.
 *   2. Signed URL         `/storage/v1/object/sign/assessment-photos/<path>?token=…`
 *   3. Bare object key    `assessments/<id>/0.jpg`
 *
 * Returns null when the URL belongs to a different bucket (the existing rows
 * pointing at Job-storage) so the caller can pass it through untouched.
 */
export function extractAssessmentPath(value: string): string | null {
  if (!value) return null;
  try {
    let path = value;
    if (/^https?:/i.test(value)) {
      const url = new URL(value);
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      if (url.origin !== base.origin || url.username || url.password || url.hash) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/assessment-photos\/(.+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    }
    const parts = path.split('/');
    if (parts.length < 3 || !['assessments', 'quick-ai'].includes(parts[0]) ||
      /[%\\\x00-\x1f]/.test(path) || parts.some(p => !p || p === '.' || p === '..')) return null;
    return path;
  } catch { return null; }
}
/**
 * Re-sign persisted assessment image URLs into fresh signed URLs.
 *
 * Invalid, foreign, missing and cross-assessment references are omitted.
 * Callers mapping by index must sign one row at a time to preserve alignment.
 */
export async function resignAssessmentUrls(
  urls: Array<string | null | undefined>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  assessmentId?: string
): Promise<string[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      if (!url) return null;
      const path = extractAssessmentPath(url);
      if (!path) return null;
      if (assessmentId && !path.startsWith('assessments/' + assessmentId + '/')) {
        // Walkthroughs predate assessment-scoped paths. Their folder is either
        // the owner ID or the linked property/job ID followed by a timestamp.
        if (!path.startsWith('quick-ai/')) return null;
        const { data: assessment, error } = await serverSupabase.from('building_assessments')
          .select('user_id, property_id, job_id').eq('id', assessmentId).maybeSingle();
        if (error || !assessment) return null;
        const folder = path.split('/')[1];
        const linked = [assessment.property_id, assessment.job_id].filter(Boolean);
        const allowed = folder === assessment.user_id || linked.some(id =>
          folder.startsWith(`${id}-`) && /^\d+$/.test(folder.slice(String(id).length + 1)));
        if (!allowed) return null;
      }
      const signed = await signAssessmentPath(path, ttlSeconds);
      return signed;
    })
  );
  return results.filter((u): u is string => Boolean(u));
}
