type PhotoLike =
  | string
  | {
      url?: unknown;
      uri?: unknown;
      file_url?: unknown;
      photo_url?: unknown;
      image_url?: unknown;
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
        item.image_url;
      return typeof candidate === 'string' ? candidate : null;
    })
    .filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0
    );
}
