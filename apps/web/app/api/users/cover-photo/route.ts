/**
 * User Cover Photo API Route
 *
 * GET    /api/users/cover-photo — return cover_photo_url for the
 *        authenticated user (null when not set).
 * POST   /api/users/cover-photo — upload a cover image (multipart
 *        FormData with a `cover` File field) to the `profile-images`
 *        bucket and persist the public URL on
 *        profiles.cover_photo_url. Cleans up the previous file.
 * DELETE /api/users/cover-photo — clear cover_photo_url and remove
 *        the underlying object from storage.
 *
 * Mirrors the avatar endpoint at apps/web/app/api/users/avatar/route.ts.
 * The cover column was added in migration
 * 20260428213009_profiles_cover_photo_url; before this endpoint the
 * mobile/web pickers showed "coming soon" because there was no
 * destination.
 */
import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — covers are bigger than avatars
const BUCKET = 'profile-images';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: profile, error } = await serverSupabase
      .from('profiles')
      .select('cover_photo_url')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get cover photo', error, {
        service: 'users.cover-photo',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({
      cover_photo_url: profile?.cover_photo_url ?? null,
    });
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const file = formData.get('cover') as File | null;

    if (!file) {
      throw new BadRequestError('No file uploaded (expected `cover` field)');
    }
    if (
      !VALID_MIME_TYPES.includes(file.type as (typeof VALID_MIME_TYPES)[number])
    ) {
      throw new BadRequestError(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestError('File too large. Maximum size is 10MB.');
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `cover-${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await serverSupabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logger.error('Cover photo upload failed', uploadError, {
        service: 'users.cover-photo',
        userId: user.id,
      });
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = serverSupabase.storage.from(BUCKET).getPublicUrl(fileName);

    // Capture the previous URL BEFORE updating so we can clean up
    // the old file. If the update fails we'll roll back the new file
    // instead.
    const { data: before } = await serverSupabase
      .from('profiles')
      .select('cover_photo_url')
      .eq('id', user.id)
      .maybeSingle();

    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        cover_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      // Rollback the upload so we don't leak a stranded object.
      await serverSupabase.storage.from(BUCKET).remove([fileName]);
      logger.error('Failed to write cover_photo_url', updateError, {
        service: 'users.cover-photo',
        userId: user.id,
      });
      throw updateError;
    }

    // Clean up the previous file (best-effort; not fatal).
    if (
      before?.cover_photo_url &&
      typeof before.cover_photo_url === 'string' &&
      before.cover_photo_url !== publicUrl
    ) {
      const oldFile = before.cover_photo_url.split('/').pop();
      if (oldFile) {
        const { error: removeError } = await serverSupabase.storage
          .from(BUCKET)
          .remove([oldFile]);
        if (removeError) {
          logger.warn('Old cover photo cleanup failed (non-fatal)', {
            service: 'users.cover-photo',
            userId: user.id,
            oldFile,
            error: removeError.message,
          });
        }
      }
    }

    return NextResponse.json({ cover_photo_url: publicUrl }, { status: 201 });
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user }) => {
    const { data: before } = await serverSupabase
      .from('profiles')
      .select('cover_photo_url')
      .eq('id', user.id)
      .maybeSingle();

    const { error } = await serverSupabase
      .from('profiles')
      .update({
        cover_photo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      logger.error('Failed to clear cover_photo_url', error, {
        service: 'users.cover-photo',
        userId: user.id,
      });
      throw error;
    }

    if (before?.cover_photo_url && typeof before.cover_photo_url === 'string') {
      const oldFile = before.cover_photo_url.split('/').pop();
      if (oldFile) {
        await serverSupabase.storage.from(BUCKET).remove([oldFile]);
      }
    }

    return NextResponse.json({ success: true });
  }
);
