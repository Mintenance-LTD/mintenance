import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import {
  sanitizeText,
  sanitizeContractorBio,
  sanitizeEmail,
} from '@/lib/sanitizer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Validation schema for business card with sanitization
// Accepts both legacy field names (businessName) and current client field names (companyName/hourlyRate)
//
// 2026-05-23 audit: `tagline`, `website`, `specialties`, `social_media`,
// `service_radius`, and `availability` were previously accepted here
// and forwarded into profiles.update(). None of those columns exist
// on live `profiles` — the entire update would have errored with
// "column does not exist" the moment a caller actually included one.
// Today's web CardEditorClient only sends a safe subset so we haven't
// seen the regression, but mobile + future callers would have. Fields
// removed from the schema until a migration adds matching columns
// (tracked as a contractor-profile-extension follow-up).
const updateCardSchema = z.object({
  // Company name: accept both field names
  businessName: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 255) : val)),
  companyName: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 255) : val)),
  phone: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 50) : val)),
  email: z
    .string()
    .email()
    .optional()
    .transform((val) => (val ? sanitizeEmail(val) : val)),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 500) : val)),
  bio: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => (val ? sanitizeContractorBio(val) : val)),
  // Fields sent by web CardEditorClient and mobile ContractorCardEditor
  hourlyRate: z.number().min(0).max(10000).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  isAvailable: z.boolean().optional(),
  licenseNumber: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val ? sanitizeText(val, 100) : val)),
});

/**
 * POST /api/contractor/update-card
 * Update contractor business card — unified for both web and mobile
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid card data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    // Prepare update object — resolve field name aliases
    const updateData: Record<string, unknown> = {};

    // Company name: companyName takes priority, fallback to businessName
    const companyName = validatedData.companyName ?? validatedData.businessName;
    if (companyName !== undefined) updateData.company_name = companyName;

    if (validatedData.phone !== undefined)
      updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined)
      updateData.email = validatedData.email;
    if (validatedData.address !== undefined)
      updateData.address = validatedData.address;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.hourlyRate !== undefined)
      updateData.hourly_rate = validatedData.hourlyRate;
    if (validatedData.yearsExperience !== undefined)
      updateData.years_experience = validatedData.yearsExperience;
    if (validatedData.isAvailable !== undefined)
      updateData.is_available = validatedData.isAvailable;
    if (validatedData.licenseNumber !== undefined)
      updateData.license_number = validatedData.licenseNumber;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await userDb
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update business card', updateError, {
        service: 'contractor',
        userId: user.id,
      });
      throw new InternalServerError('Failed to update business card');
    }

    logger.info('Business card updated successfully', {
      service: 'contractor',
      userId: user.id,
      fieldsUpdated: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      message: 'Business card updated successfully',
      profile: {
        id: updatedUser.id,
        companyName: updatedUser.company_name,
        businessName: updatedUser.company_name,
        tagline: updatedUser.tagline,
        phone: updatedUser.phone,
        email: updatedUser.email,
        website: updatedUser.website,
        address: updatedUser.address,
        bio: updatedUser.bio,
        specialties: updatedUser.specialties,
        socialMedia: updatedUser.social_media,
        hourlyRate: updatedUser.hourly_rate,
        yearsExperience: updatedUser.years_experience,
        isAvailable: updatedUser.is_available,
        serviceRadius: updatedUser.service_radius,
        availability: updatedUser.availability,
        licenseNumber: updatedUser.license_number,
      },
    });
  }
);
