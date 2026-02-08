import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { AutomationPreferencesService } from '@/lib/services/agents/AutomationPreferencesService';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { updateProfileSchema } from '@/lib/validation/schemas';

// Type definition for user profile update data
interface UserProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  profile_image_url?: string | null;
}

const supabase = serverSupabase;

// Profile image security configuration
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/user/update-profile
 * 
 * Updates user profile information including photo upload.
 * Works for both homeowners and contractors.
 */
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    // Get current user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in.' },
        { status: 401 }
      );
    }

    // Check if request has form data (file upload) or JSON
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload + profile update
      const formData = await request.formData();
      const profileImageFile = formData.get('profileImage') as File | null;

      let profileImageUrl = null;

      // Handle profile photo upload if provided
      if (profileImageFile && profileImageFile.size > 0) {
        // Validate file type - MIME type
        if (!ALLOWED_IMAGE_TYPES.includes(profileImageFile.type)) {
          return NextResponse.json(
            { error: 'Invalid image type. Only JPEG, PNG, and WebP images are allowed.' },
            { status: 400 }
          );
        }

        // Validate file extension
        const fileExt = profileImageFile.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
          return NextResponse.json(
            { error: 'Invalid file extension. Only jpg, jpeg, png, and webp are allowed.' },
            { status: 400 }
          );
        }

        // Validate file size
        if (profileImageFile.size > MAX_IMAGE_SIZE) {
          return NextResponse.json(
            { error: 'Profile image must be less than 5MB' },
            { status: 400 }
          );
        }

        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
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

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath);

        profileImageUrl = urlData?.publicUrl || null;
      }

      // Get other form fields
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      const email = formData.get('email') as string;
      const phone = formData.get('phone') as string;
      const location = formData.get('location') as string;

      // Update user profile
      const updateData: UserProfileUpdateData = {};
      if (firstName) updateData.first_name = sanitizeText(firstName, 50);
      if (lastName) updateData.last_name = sanitizeText(lastName, 50);
      if (email) updateData.email = sanitizeText(email, 255);
      if (phone !== null && phone !== undefined) updateData.phone = phone ? sanitizeText(phone, 20) : null;
      if (location !== null && location !== undefined) updateData.location = location ? sanitizeText(location, 256) : null;
      if (profileImageUrl) updateData.profile_image_url = profileImageUrl;

      // Don't attempt update if no fields to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({
          success: true,
          profileImageUrl: null,
          message: 'No changes to update',
        });
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        logger.error('Profile update error', updateError, {
          service: 'user',
          userId: user.id,
          updateData,
        });
        return NextResponse.json(
          { error: `Failed to update profile: ${updateError.message || updateError.details || 'Unknown error'}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        profileImageUrl,
        message: 'Profile updated successfully',
      });
    } else {
      // Handle JSON update (no file upload)
      // Use extended schema that also accepts automationPreferences passthrough
      const { z } = await import('zod');
      const extendedProfileSchema = updateProfileSchema.extend({
        automationPreferences: z.record(z.string(), z.unknown()).optional(),
      });

      const validation = await validateRequest(request, extendedProfileSchema);
      if (validation instanceof NextResponse) return validation;
      const { data: validatedBody } = validation;

      const updateData: UserProfileUpdateData = {};

      if (validatedBody.firstName !== undefined) updateData.first_name = validatedBody.firstName;
      if (validatedBody.lastName !== undefined) updateData.last_name = validatedBody.lastName;
      if (validatedBody.phone !== undefined) updateData.phone = validatedBody.phone || null;
      if (validatedBody.profileImageUrl !== undefined) updateData.profile_image_url = validatedBody.profileImageUrl;

      // Handle automation preferences if provided
      if (validatedBody.automationPreferences) {
        await AutomationPreferencesService.updatePreferences(
          user.id,
          validatedBody.automationPreferences
        );
      }

      // Don't attempt update if no fields to update
      if (Object.keys(updateData).length === 0 && !validatedBody.automationPreferences) {
        return NextResponse.json({
          success: true,
          message: 'No changes to update',
        });
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        logger.error('Profile update error', updateError, {
          service: 'user',
          userId: user.id,
          updateData,
        });
        return NextResponse.json(
          { error: `Failed to update profile: ${updateError.message || updateError.details || 'Unknown error'}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
      });
    }
  } catch (error) {
    logger.error('Error updating profile', error, {
      service: 'user',
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to update profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}

