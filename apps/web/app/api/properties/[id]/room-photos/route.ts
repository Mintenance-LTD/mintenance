import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const supabase = serverSupabase;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_UPLOAD = 10;

const VALID_ROOM_TYPES = [
  'kitchen', 'bathroom', 'bedroom', 'living_room', 'dining_room',
  'garage', 'garden', 'exterior', 'roof', 'hallway', 'office',
  'utility', 'other',
] as const;

async function verifyPropertyOwnership(propertyId: string, userId: string) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    throw new NotFoundError('Property not found');
  }
  if (property.owner_id !== userId) {
    throw new ForbiddenError('You do not own this property');
  }
  return property;
}

/**
 * GET /api/properties/[id]/room-photos
 * List all room photos for a property
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (_request, { user, params }) => {
    const propertyId = (await params).id as string;
    await verifyPropertyOwnership(propertyId, user.id);

    const { data, error } = await supabase
      .from('property_room_photos')
      .select('*')
      .eq('property_id', propertyId)
      .order('room_type')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch room photos', error, { service: 'room_photos', propertyId });
      return NextResponse.json({ error: 'Failed to fetch room photos' }, { status: 500 });
    }

    // Group by room_type
    const grouped: Record<string, typeof data> = {};
    for (const photo of data || []) {
      if (!grouped[photo.room_type]) grouped[photo.room_type] = [];
      grouped[photo.room_type].push(photo);
    }

    return NextResponse.json({ photos: data || [], grouped });
  }
);

/**
 * POST /api/properties/[id]/room-photos
 * Upload photos to a specific room
 */
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const propertyId = (await params).id as string;
    await verifyPropertyOwnership(propertyId, user.id);

    const formData = await request.formData();
    const photoFiles = formData.getAll('photos') as File[];
    const roomType = formData.get('room_type') as string;

    if (!roomType || !VALID_ROOM_TYPES.includes(roomType as typeof VALID_ROOM_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid room_type' }, { status: 400 });
    }

    if (!photoFiles.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (photoFiles.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES_PER_UPLOAD} photos per upload` }, { status: 400 });
    }

    const uploaded: Array<{ id: string; photo_url: string; room_type: string }> = [];
    const errors: string[] = [];

    for (const file of photoFiles) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 5MB)`);
        continue;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        errors.push(`${file.name}: Invalid extension`);
        continue;
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.\./g, '').substring(0, 100);
      const safeName = `${sanitizedName}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `property-room-photos/${user.id}/${propertyId}/${roomType}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('Job-storage')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        logger.error('Room photo upload error', uploadError, { service: 'room_photos', fileName: file.name });
        errors.push(`${file.name}: Upload failed`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('Job-storage').getPublicUrl(storagePath);
      const photoUrl = urlData?.publicUrl || '';

      const { data: row, error: insertError } = await supabase
        .from('property_room_photos')
        .insert({
          property_id: propertyId,
          room_type: roomType,
          storage_path: storagePath,
          photo_url: photoUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select('id, photo_url, room_type')
        .single();

      if (insertError) {
        logger.error('Room photo insert error', insertError, { service: 'room_photos' });
        errors.push(`${file.name}: Failed to save metadata`);
        continue;
      }

      uploaded.push(row);
    }

    if (!uploaded.length) {
      return NextResponse.json({ error: 'All uploads failed', details: errors }, { status: 500 });
    }

    return NextResponse.json({
      photos: uploaded,
      uploaded: uploaded.length,
      total: photoFiles.length,
      ...(errors.length > 0 && { warnings: errors }),
    });
  }
);

/**
 * DELETE /api/properties/[id]/room-photos
 * Delete a room photo by photoId query param
 */
export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (request, { user, params }) => {
    const propertyId = (await params).id as string;
    await verifyPropertyOwnership(propertyId, user.id);

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 });
    }

    // Fetch photo to get storage path
    const { data: photo, error: fetchError } = await supabase
      .from('property_room_photos')
      .select('id, storage_path')
      .eq('id', photoId)
      .eq('property_id', propertyId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('Job-storage')
      .remove([photo.storage_path]);

    if (storageError) {
      logger.warn('Failed to delete room photo from storage', { service: 'room_photos', path: photo.storage_path });
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from('property_room_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      logger.error('Failed to delete room photo record', deleteError, { service: 'room_photos' });
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }
);
