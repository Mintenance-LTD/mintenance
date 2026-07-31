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
export function extractAssessmentPath(url: string): string | null {
  if (!url) return null;

  if (!url.startsWith('http')) {
    return url.replace(/^\/+/, '');
  }

  const match = url.match(
    /\/storage\/v1\/object\/(?:public|sign)\/assessment-photos\/([^?]+)/
  );
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Re-sign persisted assessment image URLs into fresh signed URLs.
 *
 * Unrecognised URLs (e.g. the historical Job-storage rows) pass through
 * unchanged rather than being dropped, so a render never silently loses an
 * image it was supposed to show.
 */
export async function resignAssessmentUrls(
  urls: Array<string | null | undefined>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      if (!url) return null;
      const path = extractAssessmentPath(url);
      if (!path) return url;
      const signed = await signAssessmentPath(path, ttlSeconds);
      return signed ?? url;
    })
  );
  return results.filter((u): u is string => Boolean(u));
}
