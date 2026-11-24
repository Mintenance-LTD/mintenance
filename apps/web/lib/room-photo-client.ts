import { getCsrfHeaders } from '@/lib/csrf-client';

export async function uploadRoomPhotos(
  propertyId: string,
  roomType: string,
  files: File[]
) {
  if (
    !files.length ||
    files.length > 10 ||
    files.some((file) => file.size > 5 * 1024 * 1024)
  )
    throw new Error('Choose up to 10 photos, each no larger than 5 MB.');
  if (
    files.some(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
          file.type
        )
    )
  )
    throw new Error('Choose JPEG, PNG, WebP or GIF photos.');

  const form = new FormData();
  form.append('room_type', roomType);
  files.forEach((file) => form.append('photos', file));
  const response = await fetch(
    '/api/properties/' + propertyId + '/room-photos',
    {
      method: 'POST',
      headers: await getCsrfHeaders(),
      body: form,
    }
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Upload failed. Please try again.'
    );
  if (
    !Number.isInteger(data.uploaded) ||
    data.uploaded < 1 ||
    data.uploaded > files.length ||
    !Array.isArray(data.photos) ||
    data.photos.length !== data.uploaded ||
    data.photos.some(
      (photo: { id?: string; room_type?: string }) =>
        !photo?.id || photo.room_type !== roomType
    )
  ) {
    throw new Error(
      'Upload was not confirmed. Refresh photos before retrying.'
    );
  }
  return {
    ids: data.photos.map((photo: { id: string }) => photo.id) as string[],
    failed: (files.length - data.uploaded) as number,
  };
}
