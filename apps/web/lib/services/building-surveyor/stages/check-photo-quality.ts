import { logger } from '@mintenance/shared';
import { safeFetch } from '@/lib/security/safe-fetch';
import { inspectPhotoQuality } from '../photo-quality';
import {
  PhotoRecaptureError,
  type CaptureWarning,
} from '../recapture-guidance';

/** Staging opt-in. Retain photo ordering; never silently drop evidence. */
export async function checkPhotoQuality(
  urls: string[]
): Promise<CaptureWarning[]> {
  if (process.env.MINT_PHOTO_QUALITY_GATE_ENABLED !== 'true') return [];
  const warnings: CaptureWarning[] = [];
  for (const [index, url] of urls.entries()) {
    let bytes: Buffer;
    if (url.startsWith('data:')) {
      const match =
        /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
      if (!match || match[1].length > 14_000_000)
        throw new Error('Unsupported photo encoding');
      bytes = Buffer.from(match[1], 'base64');
    } else {
      bytes = (
        await safeFetch(url, {
          maxBytes: 10 * 1024 * 1024,
          timeoutMs: 8000,
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        })
      ).buffer;
    }
    // Download/decode failures remain technical errors, never healthy or recapture labels.
    const quality = await inspectPhotoQuality(bytes);
    logger.info('Assessment photo capture check', {
      service: 'BuildingSurveyorService',
      index,
      ...quality,
    });
    if (quality.issue) {
      throw new PhotoRecaptureError({
        photoIndex: index,
        issue: quality.issue,
      });
    }
    if (quality.softFocusWarning || quality.lowDetailWarning)
      warnings.push({
        photoIndex: index,
        reason: quality.softFocusWarning ? 'soft_focus' : 'low_detail',
      });
  }
  return warnings;
}
