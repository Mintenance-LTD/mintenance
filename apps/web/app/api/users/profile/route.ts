/**
 * User Profile API Route
 * GET /api/users/profile - Get authenticated user's profile
 * PUT /api/users/profile - Update authenticated user's profile
 *
 * Security: Authentication, CSRF (mutations), Zod validation, rate limiting
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * Zod schema for profile update validation.
 * All fields are optional so users can do partial updates.
 */
const profileUpdateSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  bio: z
    .string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .optional(),
  phone: z
    .string()
    .max(20, 'Phone must be less than 20 characters')
    .optional()
    .nullable(),
  location: z
    .string()
    .max(256, 'Location must be less than 256 characters')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(256, 'Address must be less than 256 characters')
    .optional()
    .nullable(),
  postcode: z
    .string()
    .max(10, 'Postcode must be less than 10 characters')
    .optional()
    .nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile data.
 */
export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  // Fetch user profile from database
  const { data: profile, error } = await serverSupabase
    .from('profiles')
    .select(
      'id, first_name, last_name, email, bio, city, country, phone, location, profile_image_url, role, created_at, updated_at, address, postcode, latitude, longitude, verified, phone_verified'
    )
    .eq('id', user.id)
    .single();

  if (error) {
    logger.error('Failed to fetch user profile', error, {
      service: 'users',
      userId: user.id,
    });
    throw error;
  }

  return NextResponse.json({ profile });
});

/**
 * PUT /api/users/profile
 * Updates the authenticated user's profile.
 * Requires CSRF token for cross-site forgery protection.
 */
export const PUT = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  // Validate and sanitize input using Zod schema
  const validation = await validateRequest(request, profileUpdateSchema);
  if ('headers' in validation) {
    logger.warn('Profile update validation failed', {
      service: 'users',
      userId: user.id,
    });
    return validation;
  }

  const validatedData = validation.data;

  // Build update payload with sanitized values
  const updateData: Record<string, string | number | null> = {};

  if (validatedData.first_name !== undefined) {
    updateData.first_name = sanitizeText(validatedData.first_name, 50);
  }
  if (validatedData.last_name !== undefined) {
    updateData.last_name = sanitizeText(validatedData.last_name, 50);
  }
  if (validatedData.bio !== undefined) {
    updateData.bio = sanitizeText(validatedData.bio, 1000);
  }
  if (validatedData.city !== undefined) {
    updateData.city = sanitizeText(validatedData.city, 100);
  }
  if (validatedData.country !== undefined) {
    updateData.country = sanitizeText(validatedData.country, 100);
  }
  if (validatedData.phone !== undefined) {
    updateData.phone = validatedData.phone
      ? sanitizeText(validatedData.phone, 20)
      : null;
  }
  if (validatedData.location !== undefined) {
    updateData.location = validatedData.location
      ? sanitizeText(validatedData.location, 256)
      : null;
  }
  if (validatedData.address !== undefined) {
    updateData.address = validatedData.address
      ? sanitizeText(validatedData.address, 256)
      : null;
  }
  if (validatedData.postcode !== undefined) {
    updateData.postcode = validatedData.postcode
      ? sanitizeText(validatedData.postcode, 10).toUpperCase()
      : null;
  }
  if (validatedData.latitude !== undefined) {
    updateData.latitude = validatedData.latitude ?? null;
  }
  if (validatedData.longitude !== undefined) {
    updateData.longitude = validatedData.longitude ?? null;
  }

  // Nothing to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No changes to update',
    });
  }

  // Set updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  // Update profile -- scoped to authenticated user's own row
  const { data: updatedProfile, error } = await serverSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update user profile', error, {
      service: 'users',
      userId: user.id,
      updateFields: Object.keys(updateData),
    });
    throw error;
  }

  logger.info('User profile updated successfully', {
    service: 'users',
    userId: user.id,
    updatedFields: Object.keys(updateData),
  });

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
  });
});
