import { serverSupabase } from './supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Job-storage URL helper for Phase 2 storage hardening.
 *
 * Background (see audit-reports/BETA_READINESS.md Gate 1):
 *   The `Job-storage` bucket is scheduled to flip from `public=true` to
 *   `public=false`. Today upload routes call `getPublicUrl()` which returns a
 *   `/storage/v1/object/public/...` URL. Those URLs break instantly when the
 *   bucket is flipped private.
 *
 *   Signed URLs keep working after the flip for as long as their TTL allows
 *   and can be re-signed on demand.
 *
 * Phase split:
 *   - Phase 2a (this session): writer routes call `signJobStoragePath()` with
 *     a long TTL so newly uploaded objects survive the flip.
 *   - Phase 2b (separate migration): backfill legacy `photo_url` rows and
 *     flip `storage.buckets.public = false`.
 *
 * Uses the service-role client because signing does not require the caller's
 * JWT — callers are responsible for verifying participation before calling.
 *
 * @param path Object key inside the `Job-storage` bucket (no leading slash).
 * @param ttlSeconds Signed-URL validity. Defaults to one year (365d).
 * @returns The signed URL, or `null` if signing failed.
 */
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 365; // 365 days

export async function signJobStoragePath(
  path: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  const { data, error } = await serverSupabase.storage
    .from('Job-storage')
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    // "Object not found" is an expected condition: production has 12+
    // job_attachments rows referencing seeded building-surveyor demo
    // images (Rotten_*, Penetrating_*) whose actual files were never
    // uploaded to the Job-storage bucket. The caller (resignJobStorageUrls)
    // already falls back to the original URL so the UI handles it
    // gracefully — demote to `warn` so prod logs aren't noisy with
    // false-alarm errors. Other signing failures (auth, network) keep
    // the `error` level so they surface properly.
    const isMissingObject =
      error != null && /object not found/i.test(error.message ?? '');
    const meta = { service: 'job-storage', path, ttlSeconds };

    if (isMissingObject) {
      logger.warn('Job-storage object missing — orphan attachment row', meta);
    } else {
      logger.error(
        'Failed to sign Job-storage URL',
        error ?? new Error('no signedUrl'),
        meta
      );
    }
    return null;
  }

  return data.signedUrl;
}

/**
 * Extract the object key inside `Job-storage` from a stored `file_url`.
 *
 * Supports three historical shapes because `job_attachments.file_url`
 * accumulated rows from multiple eras:
 *   1. Legacy public URL: `/storage/v1/object/public/Job-storage/<path>`
 *      — broken after the 2026-04-17 audit flipped the bucket to
 *      `public=false`.
 *   2. Signed URL:        `/storage/v1/object/sign/Job-storage/<path>?token=…`
 *      — works until the embedded `expires` stamp.
 *   3. Bare object path:  `job-photos/<file>.jpeg` or `<jobId>/<file>.jpeg`.
 *
 * Returns null if the URL doesn't reference the Job-storage bucket (e.g.
 * an external CDN link that a seeded dataset used).
 */
export function extractJobStoragePath(fileUrl: string): string | null {
  if (!fileUrl) return null;

  // Bare path — already an object key.
  if (!fileUrl.startsWith('http')) {
    return fileUrl.replace(/^\/+/, '');
  }

  // Match both public and signed URL shapes with a single regex. The
  // `?token=` query string on signed URLs drops off because capture
  // group 1 stops at `?`.
  const match = fileUrl.match(
    /\/storage\/v1\/object\/(?:public|sign)\/Job-storage\/([^?]+)/
  );
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Re-sign one or more persisted `file_url` values into fresh signed URLs.
 *
 * Use this on server-rendered pages that display job photos. Legacy rows
 * (public URLs from before the bucket flip) become reachable again, and
 * signed-URL rows get a fresh TTL without forcing a schema migration on
 * `job_attachments`. Unrecognised URLs pass through unchanged so the
 * caller's render doesn't lose external images.
 *
 * Skips the re-sign round-trip for empty/null inputs.
 */
export async function resignJobStorageUrls(
  fileUrls: Array<string | null | undefined>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string[]> {
  const results = await Promise.all(
    fileUrls.map(async (url) => {
      if (!url) return null;
      const path = extractJobStoragePath(url);
      if (!path) {
        // Not a Job-storage URL — pass through (external image, CDN, etc.)
        return url;
      }
      const signed = await signJobStoragePath(path, ttlSeconds);
      // Fall back to the original (possibly broken) URL rather than
      // dropping the photo entirely — the UI already shows a graceful
      // "couldn't be loaded" state and dropping would hide that it
      // was supposed to render.
      return signed ?? url;
    })
  );
  return results.filter((u): u is string => Boolean(u));
}
