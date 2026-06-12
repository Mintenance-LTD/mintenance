import { logger } from '@mintenance/shared';
import { supabase } from '../../../config/supabase';

/**
 * The assessment-photos bucket enforces an image mime allowlist, and
 * camera/gallery URIs are not guaranteed to carry a usable extension
 * (content:// URIs often have none — naive `split('.').pop()` returns
 * the whole URI). Normalise to a known extension + standard mime type.
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

export const uploadPhotosToStorage = async (
  photos: string[],
  assessmentDbId: string
): Promise<string[]> => {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    try {
      const uri = photos[i]!;
      const ext = normalizeImageExt(uri);
      const filePath = `assessments/${assessmentDbId}/${i}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from('assessment-photos')
        .upload(filePath, arrayBuffer, {
          contentType: EXT_CONTENT_TYPES[ext]!,
          upsert: true,
        });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('assessment-photos')
          .getPublicUrl(filePath);
        urls.push(urlData.publicUrl);
      } else {
        logger.warn('Photo upload failed', { error, index: i });
      }
    } catch (err) {
      logger.warn('Photo upload error', { err, index: i });
    }
  }
  return urls;
};
