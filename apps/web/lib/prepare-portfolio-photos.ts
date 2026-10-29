/** Re-encode uploads to remove camera metadata and fit the API request limit. */
export async function preparePortfolioPhotos(files: File[]): Promise<File[]> {
  const photos = await Promise.all(files.map(async (file, index) => {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the photo.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('Could not prepare the photo.')),
        'image/jpeg', 0.8
      ));
      return new File([blob], `portfolio-${index + 1}.jpg`, { type: 'image/jpeg' });
    } finally { bitmap.close(); }
  }));
  if (photos.reduce((total, file) => total + file.size, 0) > 3 * 1024 * 1024)
    throw new Error('These photos are too large together. Publish fewer photos in this project.');
  return photos;
}
