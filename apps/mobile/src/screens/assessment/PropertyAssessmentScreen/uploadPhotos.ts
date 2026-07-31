import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../../utils/mobileApiClient';

/**
 * Upload assessment photos through the server.
 *
 * This used to read the file in JS (`fetch(uri)` -> blob -> arrayBuffer) and
 * push it straight to Supabase Storage from the device. That path never landed
 * bytes on Hermes — the `assessment-photos` bucket held zero objects for its
 * entire life — and every failure was swallowed into a `logger.warn`, so the
 * wizard cheerfully told people their assessment was saved when no photo had
 * been attached and AI analysis had been skipped.
 *
 * The phone now streams each file over the Bearer-authed API as a multipart
 * part and the server owns storage, matching KeyframeWalkthroughService and
 * PhotoUploadService. An RN `{uri,name,type}` part is streamed by the native
 * layer, so the unreliable JS read never happens.
 */

const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Camera/gallery URIs are not guaranteed to carry a usable extension
 * (content:// URIs often have none — naive `split('.').pop()` returns the whole
 * URI). This only labels the multipart part; the server sniffs the real format
 * from the leading bytes and stores accordingly.
 */
const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const normalizeImageExt = (uri: string): string => {
  const raw = uri.split('.').pop()?.toLowerCase() ?? '';
  return EXT_CONTENT_TYPES[raw] ? raw : 'jpg';
};

/**
 * @throws when the upload fails. The caller must surface this — an assessment
 *   with no photos is not a successful assessment, and silently continuing is
 *   what hid the broken upload for so long.
 */
export const uploadPhotosToStorage = async (
  photos: string[],
  assessmentDbId: string
): Promise<string[]> => {
  if (photos.length === 0) return [];

  const form = new FormData();
  photos.forEach((uri, i) => {
    const ext = normalizeImageExt(uri);
    form.append('photos', {
      uri,
      name: `${i}.${ext}`,
      type: EXT_CONTENT_TYPES[ext]!,
    } as unknown as Blob);
  });
  form.append('assessmentId', assessmentDbId);

  const result = await mobileApiClient.postFormData<{
    urls: string[];
    stored: number;
    skipped: number[];
  }>('/api/assessments/photo-upload', form, UPLOAD_TIMEOUT_MS);

  const urls = result?.urls ?? [];
  if (urls.length === 0) {
    throw new Error('Photos could not be uploaded');
  }

  if (result.skipped?.length) {
    logger.warn('Some assessment photos were rejected by the server', {
      service: 'uploadPhotos',
      assessmentDbId,
      skipped: result.skipped.length,
      stored: urls.length,
    });
  }

  return urls;
};
