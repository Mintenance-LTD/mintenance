import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { AutomationPreferencesService } from '@/lib/services/agents/AutomationPreferencesService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { updateProfileSchema } from '@/lib/validation/schemas';

// Type definition for user profile update data
interface UserProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  bio?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  profile_image_url?: string | null;
}

// Profile image security configuration
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/user/update-profile
 * Updates user profile information including photo upload.
 *
 * Audit step 6 / 7 (2026-04-29) — image-upload path is documented
 * as **legacy**. The canonical avatar surface is now
 * `POST /api/users/avatar` (writes to the dedicated `avatars`
 * bucket, has proper before-update cleanup of the previous blob).
 * The multipart path in this route survives because:
 *   - The contractor profile-update flow bundles non-image fields
 *     alongside `profileImage` and the UI hasn't been split yet.
 *   - Older mobile builds and the web contractor settings page
 *     still POST here.
 *
 * New code should call `/api/users/avatar` for avatar uploads and
 * `PUT /api/users/profile` (or this route's JSON path) for the
 * non-image fields. Once the contractor settings UI is split,
 * the multipart branch below + the `profile-images/avatars/...`
 * upload can be deleted.
 *
 * The multipart branch had the same "old blob never cleaned up"
 * bug as the canonical avatar route did pre-fix — also closed in
 * this commit.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return handleFormDataUpdate(request, user);
    } else {
      return handleJsonUpdate(request, user);
    }
  }
);

async function handleFormDataUpdate(request: Request, user: { id: string }) {
  const formData = await (request as Request).formData();
  const profileImageFile = formData.get('profileImage') as File | null;

  let profileImageUrl = null;
  // Audit step 6 (2026-04-29): if a new image is being uploaded we
  // need the previous URL captured BEFORE the row update so the
  // orphan blob can be removed afterwards. Read it once up front
  // and reuse below — without this read, every upload leaked a
  // blob in `profile-images/avatars/...`.
  let previousImageUrl: string | null = null;
  if (profileImageFile && profileImageFile.size > 0) {
    const { data: previousProfile } = await serverSupabase
      .from('profiles')
      .select('profile_image_url')
      .eq('id', user.id)
      .maybeSingle();
    previousImageUrl =
      (previousProfile?.profile_image_url as string | null) ?? null;
  }

  if (profileImageFile && profileImageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(profileImageFile.type)) {
      return NextResponse.json(
        {
          error:
            'Invalid image type. Only JPEG, PNG, and WebP images are allowed.',
        },
        { status: 400 }
      );
    }

    const fileExt = profileImageFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        {
          error:
            'Invalid file extension. Only jpg, jpeg, png, and webp are allowed.',
        },
        { status: 400 }
      );
    }

    if (profileImageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Profile image must be less than 5MB' },
        { status: 400 }
      );
    }

    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await serverSupabase.storage
      .from('profile-images')
      .upload(filePath, profileImageFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      logger.error('Profile image upload error', uploadError, {
        service: 'user',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to upload profile image' },
        { status: 500 }
      );
    }

    const { data: urlData } = serverSupabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    profileImageUrl = urlData?.publicUrl || null;
  }

  // Get other form fields
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const bio = formData.get('bio') as string;
  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const postcode = formData.get('postcode') as string;

  const updateData: UserProfileUpdateData = {};
  if (firstName) updateData.first_name = sanitizeText(firstName, 50);
  if (lastName) updateData.last_name = sanitizeText(lastName, 50);
  if (email) updateData.email = sanitizeText(email, 255);
  if (phone !== null && phone !== undefined)
    updateData.phone = phone ? sanitizeText(phone, 20) : null;
  if (bio !== null && bio !== undefined)
    updateData.bio = bio ? sanitizeText(bio, 1000) : null;
  if (address !== null && address !== undefined)
    updateData.address = address ? sanitizeText(address, 500) : null;
  if (city !== null && city !== undefined)
    updateData.city = city ? sanitizeText(city, 100) : null;
  if (postcode !== null && postcode !== undefined)
    updateData.postcode = postcode ? sanitizeText(postcode, 20) : null;
  if (profileImageUrl) updateData.profile_image_url = profileImageUrl;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      success: true,
      profileImageUrl: null,
      message: 'No changes to update',
    });
  }

  const { error: updateError } = await serverSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    // Log full DB error server-side for triage; NEVER surface it to the
    // client. Supabase error messages include column names + constraint
    // names that help an attacker fingerprint the schema.
    logger.error('Profile update error', updateError, {
      service: 'user',
      userId: user.id,
      updateData,
    });
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }

  // Audit step 6 (2026-04-29): best-effort cleanup of the previous
  // avatar blob in `profile-images/avatars/...`. Failure is non-fatal
  // — the new avatar is already live; the old one is just an orphan
  // we'll garbage-collect on the next upload.
  if (
    profileImageUrl &&
    previousImageUrl &&
    previousImageUrl !== profileImageUrl
  ) {
    // Only clean up files we previously wrote into this bucket. The
    // canonical avatar route writes to `avatars/<file>` and the
    // legacy profile-images bucket holds `avatars/<file>` (note the
    // path-prefix overlap is intentional — same `avatars/` folder
    // inside two different buckets). Match on the legacy bucket's
    // `/profile-images/avatars/` substring so we don't accidentally
    // try to delete an `/avatars/` blob from the wrong bucket.
    if (previousImageUrl.includes('/profile-images/avatars/')) {
      const trailing = previousImageUrl.split('/profile-images/').pop();
      if (trailing) {
        const { error: removeError } = await serverSupabase.storage
          .from('profile-images')
          .remove([trailing]);
        if (removeError) {
          logger.warn('Failed to remove previous profile image (non-fatal)', {
            service: 'user',
            userId: user.id,
            path: trailing,
            error: removeError.message,
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    profileImageUrl,
    message: 'Profile updated successfully',
  });
}

async function handleJsonUpdate(request: Request, user: { id: string }) {
  const { z } = await import('zod');
  const extendedProfileSchema = updateProfileSchema.extend({
    automationPreferences: z.record(z.string(), z.unknown()).optional(),
  });

  // Strip empty/whitespace-only string fields so they are treated as "not provided".
  // This lets the client safely forward prefilled-but-unchanged form values without
  // tripping validation (e.g. empty phone failing the phone regex).
  let rawBody: Record<string, unknown>;
  try {
    rawBody = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const cleanedBody: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawBody)) {
    if (typeof value === 'string' && value.trim() === '') continue;
    cleanedBody[key] = value;
  }

  const parsed = extendedProfileSchema.safeParse(cleanedBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }
  const validatedBody = parsed.data;

  const updateData: UserProfileUpdateData = {};
  if (validatedBody.firstName !== undefined)
    updateData.first_name = validatedBody.firstName;
  if (validatedBody.lastName !== undefined)
    updateData.last_name = validatedBody.lastName;
  if (validatedBody.phone !== undefined)
    updateData.phone = validatedBody.phone || null;
  if (validatedBody.bio !== undefined)
    updateData.bio = validatedBody.bio || null;
  if (validatedBody.address !== undefined)
    updateData.address = validatedBody.address || null;
  if (validatedBody.city !== undefined)
    updateData.city = validatedBody.city || null;
  if (validatedBody.postcode !== undefined)
    updateData.postcode = validatedBody.postcode || null;
  if (validatedBody.profileImageUrl !== undefined)
    updateData.profile_image_url = validatedBody.profileImageUrl;

  if (validatedBody.automationPreferences) {
    await AutomationPreferencesService.updatePreferences(
      user.id,
      validatedBody.automationPreferences
    );
  }

  if (
    Object.keys(updateData).length === 0 &&
    !validatedBody.automationPreferences
  ) {
    return NextResponse.json({
      success: true,
      message: 'No changes to update',
    });
  }

  const { error: updateError } = await serverSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    // Log full DB error server-side for triage; NEVER surface it to the
    // client. Supabase error messages include column names + constraint
    // names that help an attacker fingerprint the schema.
    logger.error('Profile update error', updateError, {
      service: 'user',
      userId: user.id,
      updateData,
    });
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Profile updated successfully',
  });
}
