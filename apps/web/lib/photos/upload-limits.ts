// Leave room for multipart headers beneath the hosting request-body limit.
export const MAX_PHOTO_BATCH_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_BATCH_COUNT = 10;

export function photoBatchError(
  files: ReadonlyArray<{ size: number }>
): string | null {
  if (files.length > MAX_PHOTO_BATCH_COUNT)
    return 'Choose up to 10 photos per upload.';
  if (files.some((file) => file.size > MAX_PHOTO_BATCH_BYTES)) {
    return 'Each photo must be 4 MB or smaller. Choose a smaller image; photos upload individually.';
  }
  return null;
}
