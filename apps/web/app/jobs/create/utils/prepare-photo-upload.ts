// Leave room for multipart headers below the hosting function's 4.5 MB limit.
export const PHOTO_BATCH_BYTES = 4_000_000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** Preserve small originals; resize large camera photos before sending them. */
export async function preparePhotoUpload(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error(
      `${file.name} exceeds 10 MB. Please choose a smaller photo.`
    );
  if (file.size <= PHOTO_BATCH_BYTES) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `${file.name} could not be resized. Please save it as JPEG or PNG and try again.`
    );
  }
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error(
        'Photo resizing is unavailable. Please choose a photo smaller than 4 MB.'
      );
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (blob && blob.size <= PHOTO_BATCH_BYTES)
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
    }
    throw new Error(
      `${file.name} is still too large after resizing. Please choose a smaller photo.`
    );
  } finally {
    bitmap.close();
  }
}

export function photoUploadBatches(files: File[]): File[][] {
  const batches: File[][] = [];
  let current: File[] = [],
    bytes = 0;
  for (const file of files) {
    if (file.size > PHOTO_BATCH_BYTES)
      throw new Error('Resize the photo before uploading.');
    if (bytes + file.size > PHOTO_BATCH_BYTES) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length) batches.push(current);
  return batches;
}
