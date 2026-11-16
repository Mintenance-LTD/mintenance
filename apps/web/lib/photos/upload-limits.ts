// Leave room for multipart headers beneath the hosting request-body limit.
export const MAX_PHOTO_BATCH_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_BATCH_COUNT = 10;

export function photoBatchError(
  files: ReadonlyArray<{ size: number }>
): string | null {
  if (files.length > MAX_PHOTO_BATCH_COUNT)
    return 'Choose up to 10 photos per upload.';
  if (
    files.reduce((total, file) => total + file.size, 0) > MAX_PHOTO_BATCH_BYTES
  ) {
    return 'Choose smaller photos or upload in smaller batches: each upload can contain up to 4 MB in total. Previously accepted photos still count.';
  }
  return null;
}
