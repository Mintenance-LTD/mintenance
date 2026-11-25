import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { NotFoundError, ServiceUnavailableError } from '@/lib/errors/api-error';
import { isPropertyRoomPhotoPath } from '@/lib/api/storage-object-path';
import { databaseError } from './property-inspections';

// Call only after the actor has been authorized for the exact inspection.
export async function getInspectionPhotoBytes(
  propertyId: string,
  sourceId: string
) {
  const photo = await db
    .from('property_room_photos')
    .select('storage_path,mime_type')
    .eq('property_id', propertyId)
    .eq('id', sourceId)
    .maybeSingle();
  databaseError(photo.error);
  const mime = photo.data?.mime_type;
  if (
    !photo.data ||
    !isPropertyRoomPhotoPath(photo.data.storage_path, propertyId) ||
    !mime ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)
  )
    throw new NotFoundError('Photo unavailable');
  const { data, error } = await db.storage
    .from('Job-storage')
    .download(photo.data.storage_path);
  if (error || !data || data.size > 5 * 1024 * 1024)
    throw new ServiceUnavailableError('Inspection photo');
  return { data, mime };
}
