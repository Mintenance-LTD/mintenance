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
    logger.error(
      'Failed to sign Job-storage URL',
      error ?? new Error('no signedUrl'),
      {
        service: 'job-storage',
        path,
        ttlSeconds,
      }
    );
    return null;
  }

  return data.signedUrl;
}
