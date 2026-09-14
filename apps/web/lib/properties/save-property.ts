import { serverSupabase } from '@/lib/api/supabaseServer';
import { extractJobStoragePath } from '@/lib/api/job-storage';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

/** Save fields and trusted private-photo attachments in one transaction. */
export async function saveProperty(
  actorId: string,
  propertyId: string,
  fields: Record<string, unknown>,
  create = false
) {
  const paths = Array.isArray(fields.photos)
    ? [
        ...new Set(
          fields.photos.flatMap((url: unknown) => {
            const path =
              typeof url === 'string' ? extractJobStoragePath(url) : null;
            return path ? [path] : [];
          })
        ),
      ]
    : [];
  const { data, error } = await serverSupabase.rpc(
    'save_property_with_photo_bindings',
    {
      p_actor_id: actorId,
      p_property_id: propertyId,
      p_fields: fields,
      p_paths: paths,
      p_create: create,
    }
  );
  if (error?.code === '42501') {
    throw new ForbiddenError(
      'Unable to save these photos. Remove unavailable photos or upload your own replacements.'
    );
  }
  if (error?.code === 'P0002') throw new NotFoundError('Property not found');
  if (error?.code === '22023' || error?.code === '23514') {
    throw new BadRequestError(
      'Some property details are invalid. Check the form and try again.'
    );
  }
  if (error) throw error;
  if (!data) throw new Error('Property save returned no record');
  return data;
}
