/**
 * Verified-selfie upload.
 * POST /api/users/selfie — camera-captured profile photo.
 *
 * Why this exists as its own route rather than a flag on
 * /api/users/avatar:
 *
 * `profiles.profile_photo_is_selfie` is a TRUST SIGNAL (it marks the
 * photo as a live capture rather than a stock image), so the client
 * must never be able to set it. The column is deliberately excluded
 * from the `authenticated` UPDATE grant list — see
 * 20260508100543_lock_profiles_privileged_columns_table_level.sql —
 * which is why the mobile SelfieCaptureScreen's direct
 * `profiles.update({ profile_photo_is_selfie: true })` could never
 * succeed (42501) and every selfie ended in "Could not save your
 * selfie". Widening that grant would let any client flag ANY image as
 * a live selfie, defeating the anti-stock-photo intent of the
 * camera-only capture screen. Instead the flag is written here, with
 * the service role, on a route that only accepts a freshly uploaded
 * image.
 *
 * Mirrors POST /api/users/avatar (magic-byte validation, size cap,
 * rollback on row-update failure, best-effort cleanup of the previous
 * blob) but sets the flag TRUE where the avatar route sets it FALSE.
 *
 * NOTE: this does not attempt liveness/face detection — the guarantee
 * is "arrived through the camera-only capture screen", the same
 * guarantee the previous client-side implementation intended.
 */

import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  validateImageUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';

const BUCKET = 'profile-images';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const rawFile = formData.get('selfie');
    const file =
      typeof rawFile === 'object' &&
      rawFile !== null &&
      'size' in rawFile &&
      'arrayBuffer' in rawFile
        ? rawFile
        : null;

    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    // Validate by magic number, never the client-declared MIME type.
    const validation = await validateImageUpload(
      file,
      MAX_FILE_SIZES.profileImage
    );
    if (!validation.valid) {
      throw new BadRequestError(
        validation.error ||
          'Invalid file. Only JPEG, PNG, and WebP are allowed.'
      );
    }

    // Read the existing photo BEFORE overwriting so the old blob can be
    // cleaned up after a successful update.
    const { data: previousProfile, error: previousProfileError } =
      await serverSupabase
      .from('profiles')
      .select('profile_image_url')
      .eq('id', user.id)
      .single();
    if (previousProfileError) {
      logger.error(
        'Failed to read existing profile before selfie replacement',
        previousProfileError,
        { service: 'users.selfie', userId: user.id }
      );
      throw new InternalServerError(
        'Unable to prepare selfie replacement. Please try again.'
      );
    }
    const previousUrl = previousProfile?.profile_image_url ?? null;

    // Extension from the DETECTED type, never the client filename.
    const fileExt = validation.detectedType?.split('/')[1] || 'jpg';
    const filePath = `selfies/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await serverSupabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: validation.detectedType,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload selfie', uploadError, {
        service: 'users.selfie',
        userId: user.id,
      });
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = serverSupabase.storage.from(BUCKET).getPublicUrl(filePath);

    const { error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        profile_image_url: publicUrl,
        profile_photo_is_selfie: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      // Roll back the blob so a failed row update doesn't leak it.
      await serverSupabase.storage.from(BUCKET).remove([filePath]);
      logger.error(
        'Failed to update profile after selfie upload',
        updateError,
        {
          service: 'users.selfie',
          userId: user.id,
        }
      );
      throw updateError;
    }

    // Best-effort cleanup of the previous image; an orphan blob is not
    // worth failing an otherwise-successful upload.
    if (previousUrl && previousUrl !== publicUrl) {
      const marker = `/${BUCKET}/`;
      const idx = previousUrl.indexOf(marker);
      if (idx !== -1) {
        const oldPath = previousUrl.slice(idx + marker.length);
        const { error: removeError } = await serverSupabase.storage
          .from(BUCKET)
          .remove([oldPath]);
        if (removeError) {
          logger.warn('Failed to remove previous selfie blob', {
            service: 'users.selfie',
            userId: user.id,
            oldPath,
          });
        }
      }
    }

    logger.info('Selfie uploaded', {
      service: 'users.selfie',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      profile_image_url: publicUrl,
      profile_photo_is_selfie: true,
    });
  }
);
