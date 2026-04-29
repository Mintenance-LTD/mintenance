import { mobileApiClient } from './mobileApiClient';

/**
 * Upload local device photo URIs (`file:///...`, `content://...`,
 * `ph://...`) to the backend's `/api/jobs/upload-photos` route and
 * return the resulting public URLs.
 *
 * Audit follow-up (2026-04-29): the create-job + service-request
 * flows kept their own copy of this loop. Two copies = two places to
 * forget when the backend changes its response envelope. This helper
 * is the single shared definition; callers just `await
 * uploadJobPhotos(localUris)` and feed the result into the create
 * payload.
 *
 * The route's response envelope has historically used three field
 * names — `urls[]`, `url`, `public_url` — depending on whether the
 * upload was batched or individual. Coalesced here so callers don't
 * have to know.
 *
 * Usage:
 *
 *   const uploadedPhotoUrls = await uploadJobPhotos(photos);
 *   await createJobMutation.mutateAsync({
 *     ...,
 *     photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
 *   });
 *
 * Each upload runs sequentially today to mirror the previous
 * `useServiceRequestForm` behaviour. If we hit perf issues with a
 * gallery of 10+ photos, this is a safe spot to switch to
 * `Promise.all` — the route has its own per-IP rate limit so we
 * shouldn't hammer it without batching anyway.
 */
export async function uploadJobPhotos(localUris: string[]): Promise<string[]> {
  if (localUris.length === 0) return [];

  const uploaded: string[] = [];
  for (const photoUri of localUris) {
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const formData = new FormData();
    formData.append('photos', {
      uri: photoUri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob);

    const response = await mobileApiClient.postFormData<{
      urls?: string[];
      url?: string;
      public_url?: string;
    }>('/api/jobs/upload-photos', formData);

    const photoUrl =
      response.urls?.[0] ?? response.public_url ?? response.url ?? '';
    if (photoUrl) uploaded.push(photoUrl);
  }
  return uploaded;
}
