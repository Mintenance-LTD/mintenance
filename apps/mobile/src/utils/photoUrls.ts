/**
 * Normalize a heterogeneous list of photo-shaped values into a flat
 * `string[]` of URLs.
 *
 * Different API routes + Supabase responses come back with the URL on
 * different keys: the create/list routes return camelCase
 * (`photoUrls`), the legacy direct-DB reads returned `file_url` /
 * `photo_url` / `image_url`, and Supabase Storage signed-URL helpers
 * return `signedUrl` / `publicUrl` (or snake_case `public_url`).
 * Audit follow-up (2026-04-29): added the signed/public variants
 * after spotting `JobCRUDService.formatJob`'s private normalizer
 * accepting them while this shared helper did not — some gallery /
 * detail-screen code paths were silently dropping signed URLs.
 *
 * Strings are kept as-is (already a URL). Empty / whitespace strings
 * are filtered out so a malformed row doesn't render a broken
 * `<Image source={{ uri: '' }} />`.
 */
type PhotoLike =
  | string
  | {
      url?: unknown;
      uri?: unknown;
      file_url?: unknown;
      photo_url?: unknown;
      image_url?: unknown;
      signedUrl?: unknown;
      publicUrl?: unknown;
      public_url?: unknown;
    };

export function normalizePhotoUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: PhotoLike) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return null;
      const candidate =
        item.url ??
        item.uri ??
        item.file_url ??
        item.photo_url ??
        item.image_url ??
        item.signedUrl ??
        item.publicUrl ??
        item.public_url;
      return typeof candidate === 'string' ? candidate : null;
    })
    .filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0
    );
}
