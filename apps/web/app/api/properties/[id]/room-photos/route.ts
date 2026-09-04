import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { validateImageUpload } from '@/lib/utils/fileValidation';

const supabase = serverSupabase;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_UPLOAD = 10;

async function removeUploadedObject(path: string, userId: string) {
  const { error } = await supabase.storage.from('Job-storage').remove([path]);
  if (error) {
    logger.error('Failed to clean up orphaned room photo', error, {
      service: 'room_photos',
      userId,
      path,
    });
  }
}

const VALID_ROOM_TYPES = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'dining_room',
  'garage',
  'garden',
  'exterior',
  'roof',
  'hallway',
  'office',
  'utility',
  'other',
] as const;

async function verifyPropertyAccess(
  propertyId: string,
  userId: string,
  permission: 'view' | 'edit',
  isAdmin: boolean
) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    throw new NotFoundError('Property not found');
  }
  const { authorized } = await PropertyTeamService.authorize(
    userId,
    propertyId,
    permission
  );
  if (!authorized && !isAdmin) {
    throw new ForbiddenError('You do not have access to this property');
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
    await verifyPropertyAccess(
      propertyId,
      user.id,
      'view',
      user.role === 'admin'
    );

    const { data, error } = await supabase
      .from('property_room_photos')
      .select('*')
      .eq('property_id', propertyId)
      .order('room_type')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch room photos', error, {
        service: 'room_photos',
        propertyId,
      });
      return NextResponse.json(
        { error: 'Failed to fetch room photos' },
        { status: 500 }
      );
    }

    // Refresh from the persisted object path rather than returning an old
    // signed URL. Room-photo rows retain `storage_path`, so this remains
    // reliable after the original URL expires or the bucket is private.
    const freshPhotos = await Promise.all(
      (data || []).map(async (photo) => ({
        ...photo,
        photo_url:
          (await signJobStoragePath(photo.storage_path)) ?? photo.photo_url,
      }))
    );

    // Group by room_type
    const grouped: Record<string, typeof data> = {};
    for (const photo of freshPhotos) {
      if (!grouped[photo.room_type]) grouped[photo.room_type] = [];
      grouped[photo.room_type].push(photo);
    }

    return NextResponse.json({ photos: freshPhotos, grouped });
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
    await verifyPropertyAccess(
      propertyId,
      user.id,
      'edit',
      user.role === 'admin'
    );

    const formData = await request.formData();
    const photoFiles = formData.getAll('photos') as File[];
    const roomType = formData.get('room_type') as string;

    if (
      !roomType ||
      !VALID_ROOM_TYPES.includes(roomType as (typeof VALID_ROOM_TYPES)[number])
    ) {
      return NextResponse.json({ error: 'Invalid room_type' }, { status: 400 });
    }

    if (!photoFiles.length) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      );
    }

    if (photoFiles.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} photos per upload` },
        { status: 400 }
      );
    }

    const uploaded: Array<{
      id: string;
      photo_url: string;
      room_type: string;
    }> = [];
    const errors: string[] = [];

    for (const file of photoFiles) {
      // Validate magic bytes and extension together; client-declared MIME
      // types are forgeable and must not decide what gets stored.
      const validation = await validateImageUpload(file, MAX_FILE_SIZE);
      if (!validation.valid || !validation.detectedType) {
        errors.push(`${file.name}: ${validation.error || 'Invalid image file'}`);
        continue;
      }

      const fileExt = validation.detectedType.split('/')[1] || 'jpg';

      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.\./g, '')
        .substring(0, 100);
      const safeName = `${sanitizedName}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `property-room-photos/${user.id}/${propertyId}/${roomType}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('Job-storage')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: validation.detectedType,
        });

      if (uploadError) {
        logger.error('Room photo upload error', uploadError, {
          service: 'room_photos',
          fileName: file.name,
        });
        errors.push(`${file.name}: Upload failed`);
        continue;
      }

      // Phase 2 storage hardening: issue a signed URL instead of a public URL
      // so the photo stays reachable once `Job-storage` flips to private.
      const photoUrl = await signJobStoragePath(storagePath);
      if (!photoUrl) {
        await removeUploadedObject(storagePath, user.id);
        errors.push(`${file.name}: Failed to sign URL`);
        continue;
      }

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
        logger.error('Room photo insert error', insertError, {
          service: 'room_photos',
        });
        await removeUploadedObject(storagePath, user.id);
        errors.push(`${file.name}: Failed to save metadata`);
        continue;
      }

      uploaded.push(row);
    }

    if (!uploaded.length) {
      return NextResponse.json(
        { error: 'All uploads failed', details: errors },
        { status: 500 }
      );
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
    await verifyPropertyAccess(
      propertyId,
      user.id,
      'edit',
      user.role === 'admin'
    );

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json(
        { error: 'photoId is required' },
        { status: 400 }
      );
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
      logger.warn('Failed to delete room photo from storage', {
        service: 'room_photos',
        path: photo.storage_path,
      });
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from('property_room_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      logger.error('Failed to delete room photo record', deleteError, {
        service: 'room_photos',
      });
      return NextResponse.json(
        { error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }
);
