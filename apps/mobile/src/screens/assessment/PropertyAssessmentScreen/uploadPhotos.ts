import { logger } from '@mintenance/shared';
import { supabase } from '../../../config/supabase';

export const uploadPhotosToStorage = async (
  photos: string[],
  assessmentDbId: string
): Promise<string[]> => {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    try {
      const uri = photos[i]!;
      const ext = uri.split('.').pop() ?? 'jpg';
      const filePath = `assessments/${assessmentDbId}/${i}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from('assessment-photos')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext}`,
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
