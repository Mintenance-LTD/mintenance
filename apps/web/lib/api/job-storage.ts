import { serverSupabase } from './supabaseServer';
import { logger } from '@mintenance/shared';

// Short-lived URLs are refreshed by authorized readers. Upload callers sign
// only the server-generated path they have just uploaded.
const DEFAULT_TTL_SECONDS = 60 * 60;
export const PRIVATE_PHOTO_PLACEHOLDER = '/placeholder-property.svg';

export async function signJobStoragePath(
  path: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  const { data, error } = await serverSupabase.storage
    .from('Job-storage')
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    // Missing objects render a placeholder; other failures remain errors.
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
  if (!fileUrl || fileUrl.startsWith('//')) return null;
  const validPath = (path: string): string | null => {
    if (
      !path ||
      /[\\\x00-\x1f\x7f?#]/.test(path) ||
      path.split('/').some((part) => !part || part === '.' || part === '..')
    )
      return null;
    return path;
  };
  // Legacy bare keys are supported, but URL schemes are never object keys.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(fileUrl)) {
    return validPath(fileUrl.replace(/^\//, ''));
  }
  try {
    const url = new URL(fileUrl);
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configured) return null;
    const expected = new URL(configured);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.origin !== expected.origin ||
      url.username ||
      url.password
    )
      return null;
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:public|sign)\/Job-storage\/(.+)$/
    );
    return match ? validPath(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

/**
 * Refresh private images only after checking the viewer against trusted storage
 * ownership and resource access. Preserve positions for callers batching photos.
 * Denied or unavailable private images render a placeholder; external URLs pass
 * through unchanged. A null viewer cannot obtain private signed URLs.
 */
export async function resignJobStorageUrls(
  fileUrls: Array<string | null | undefined>,
  viewerId: string | null,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string[]> {
  const paths = [
    ...new Set(
      fileUrls.flatMap((url) => {
        const path = url ? extractJobStoragePath(url) : null;
        return path ? [path] : [];
      })
    ),
  ];
  const allowed = new Set<string>();
  if (viewerId && paths.length) {
    const { data, error } = await serverSupabase.rpc(
      'authorized_private_photo_paths',
      {
        p_actor_id: viewerId,
        p_paths: paths,
      }
    );
    if (!error && Array.isArray(data)) {
      for (const row of data)
        if (typeof row.path === 'string') allowed.add(row.path);
    }
  }
  // Preserve cardinality: callers re-chunk flat batches into individual jobs.
  // Never fall back to an old private signed URL after failed authorization.
  return Promise.all(
    fileUrls.map(async (url) => {
      if (!url) return PRIVATE_PHOTO_PLACEHOLDER;
      const path = extractJobStoragePath(url);
      if (!path) return url;
      if (!allowed.has(path)) return PRIVATE_PHOTO_PLACEHOLDER;
      return (
        (await signJobStoragePath(
          path,
          Math.min(ttlSeconds, DEFAULT_TTL_SECONDS)
        )) ?? PRIVATE_PHOTO_PLACEHOLDER
      );
    })
  );
}
