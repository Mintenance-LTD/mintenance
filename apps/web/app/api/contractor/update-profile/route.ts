import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf-validator';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Profile image security configuration
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Profile update validation schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  city: z.string().max(100, 'City must be less than 100 characters').optional(),
  country: z.string().max(100, 'Country must be less than 100 characters').optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format').optional(),
  isAvailable: z.boolean(),
});

/**
 * POST /api/contractor/update-profile
 * 
 * Updates contractor profile information including photo upload.
 * Following Single Responsibility Principle - only handles profile updates.
 * 
 * @filesize Target: <150 lines
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent profile update abuse
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.api);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for profile update', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
      });
      return rateLimitResult.response!;
    }

    // CSRF protection - prevent cross-site attacks
    if (!(await requireCSRF(request))) {
      logger.warn('CSRF validation failed for profile update', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
      });
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Get current user
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      logger.warn('Unauthorized profile update attempt', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
        userId: user?.id,
      });
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in as contractor.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const rawData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      bio: formData.get('bio') as string,
      city: formData.get('city') as string,
      country: formData.get('country') as string,
      phone: formData.get('phone') as string,
      isAvailable: formData.get('isAvailable') === 'true',
    };

    // Validate and sanitize input
    let validatedData;
    try {
      validatedData = profileUpdateSchema.parse(rawData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn('Profile update validation failed', {
          service: 'contractor',
          userId: user.id,
          validationErrors: validationError.issues,
        });
        return NextResponse.json(
          { error: 'Invalid input data', details: validationError.issues },
          { status: 400 }
        );
      }
      logger.error('Unexpected validation error', validationError, {
        service: 'contractor',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    // Sanitize text inputs
    const firstName = sanitizeText(validatedData.firstName, 50);
    const lastName = sanitizeText(validatedData.lastName, 50);
    const bio = validatedData.bio ? sanitizeText(validatedData.bio, 1000) : '';
    const city = validatedData.city ? sanitizeText(validatedData.city, 100) : '';
    const country = validatedData.country ? sanitizeText(validatedData.country, 100) : '';
    const phone = validatedData.phone || '';
    const isAvailable = validatedData.isAvailable;
    const profileImageFile = formData.get('profileImage') as File | null;

    let profileImageUrl = null;

    // Handle profile photo upload if provided
    if (profileImageFile && profileImageFile.size > 0) {
      // Validate file type - MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(profileImageFile.type)) {
        logger.warn('Invalid profile image type', {
          service: 'contractor',
          userId: user.id,
          fileType: profileImageFile.type,
          fileName: profileImageFile.name,
        });
        return NextResponse.json(
          { error: 'Invalid image type. Only JPEG, PNG, and WebP images are allowed.' },
          { status: 400 }
        );
      }

      // Validate file extension
      const fileExt = profileImageFile.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        logger.warn('Invalid profile image extension', {
          service: 'contractor',
          userId: user.id,
          fileExtension: fileExt,
          fileName: profileImageFile.name,
        });
        return NextResponse.json(
          { error: 'Invalid file extension. Only jpg, jpeg, png, and webp are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size
      if (profileImageFile.size > MAX_IMAGE_SIZE) {
        logger.warn('Profile image size exceeded', {
          service: 'contractor',
          userId: user.id,
          fileSize: profileImageFile.size,
          maxSize: MAX_IMAGE_SIZE,
        });
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
        logger.error('Upload error', uploadError, {
          service: 'contractor',
          userId: user.id,
          fileName: profileImageFile.name,
          filePath,
        });
        return NextResponse.json(
          { error: 'Failed to upload profile image' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      profileImageUrl = publicUrl;
    }

    // Update user profile in database
    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      bio,
      city,
      country,
      phone,
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    };

    if (city || country) {
      updateData.is_visible_on_map = true;
      updateData.last_location_visibility_at = new Date().toISOString();
    }

    if (profileImageUrl) {
      updateData.profile_image_url = profileImageUrl;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Update error', error, {
        service: 'contractor',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Profile update error', error, {
      service: 'contractor',
      endpoint: '/api/contractor/update-profile',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

