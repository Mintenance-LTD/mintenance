/**
 * User Avatar API Route
 * GET /api/users/avatar - Get user avatar URL
 * POST /api/users/avatar - Upload user avatar
 * DELETE /api/users/avatar - Delete user avatar
 */

import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/users/avatar
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: profile, error } = await serverSupabase
      .from('profiles')
      .select('profile_image_url')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Failed to get user avatar:', error);
      throw error;
    }

    return NextResponse.json({
      profile_image_url: profile?.profile_image_url || null,
    });
  }
);

/**
 * POST /api/users/avatar
 *
 * Audit step 6 (2026-04-29): the cleanup logic used to read the
 * previous `profile_image_url` AFTER updating the row to the new
 * URL — at which point `oldProfile.profile_image_url === publicUrl`
 * always, so the old file in Storage was never removed and the
 * `avatars` bucket grew with one orphan blob per user upload.
 * Now: read the existing row first, then update, then delete the
 * old blob.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new BadRequestError(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestError('File too large. Maximum size is 5MB.');
    }

    // Read the existing avatar URL BEFORE we overwrite the row so we
    // can clean up the old blob after the update succeeds.
    const { data: previousProfile } = await serverSupabase
      .from('profiles')
      .select('profile_image_url')
      .eq('id', user.id)
      .single();
    const previousAvatarUrl = previousProfile?.profile_image_url ?? null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await serverSupabase.storage
      .from('avatars')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logger.error('Failed to upload avatar:', uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = serverSupabase.storage.from('avatars').getPublicUrl(fileName);

    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        profile_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      // Roll back the storage upload so we don't leak the new blob
      // when the row update fails.
      await serverSupabase.storage.from('avatars').remove([fileName]);
      logger.error('Failed to update user profile:', updateError);
      throw updateError;
    }

    // Best-effort cleanup of the previous avatar. Failure here is
    // not fatal — the user's new avatar is already live, the old
    // blob is just an orphan we'll garbage-collect on next upload.
    if (previousAvatarUrl && previousAvatarUrl !== publicUrl) {
      const oldFileName = previousAvatarUrl.split('/').pop();
      if (oldFileName) {
        const { error: removeError } = await serverSupabase.storage
          .from('avatars')
          .remove([oldFileName]);
        if (removeError) {
          logger.warn('Failed to remove previous avatar blob', {
            service: 'users.avatar',
            userId: user.id,
            oldFileName,
            error: removeError.message,
          });
        }
      }
    }

    return NextResponse.json({ success: true, profile_image_url: publicUrl });
  }
);

/**
 * DELETE /api/users/avatar
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: profile, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('profile_image_url')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Failed to get user profile:', fetchError);
      throw fetchError;
    }

    if (profile?.profile_image_url) {
      const fileName = profile.profile_image_url.split('/').pop();
      if (fileName) {
        const { error: deleteError } = await serverSupabase.storage
          .from('avatars')
          .remove([fileName]);

        if (deleteError) {
          logger.error('Failed to delete avatar file:', deleteError);
        }
      }
    }

    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        profile_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Failed to update user profile:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  }
);
