import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { sanitizeText, sanitizeContractorBio, sanitizeUrl, sanitizeEmail } from '@/lib/sanitizer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Validation schema for business card with sanitization
const updateCardSchema = z.object({
  businessName: z.string().min(1).max(255).optional().transform(val => val ? sanitizeText(val, 255) : val),
  tagline: z.string().max(500).optional().transform(val => val ? sanitizeText(val, 500) : val),
  phone: z.string().max(50).optional().transform(val => val ? sanitizeText(val, 50) : val),
  email: z.string().email().optional().transform(val => val ? sanitizeEmail(val) : val),
  website: z.string().url().optional().nullable().transform(val => val ? sanitizeUrl(val) : val),
  address: z.string().max(500).optional().transform(val => val ? sanitizeText(val, 500) : val),
  bio: z.string().max(2000).optional().transform(val => val ? sanitizeContractorBio(val) : val),
  specialties: z.array(z.string().transform(s => sanitizeText(s, 100))).optional(),
  socialMedia: z.object({
    facebook: z.string().optional().transform(val => val ? sanitizeUrl(val) : val),
    instagram: z.string().optional().transform(val => val ? sanitizeUrl(val) : val),
    linkedin: z.string().optional().transform(val => val ? sanitizeUrl(val) : val),
    twitter: z.string().optional().transform(val => val ? sanitizeUrl(val) : val),
  }).optional(),
});

/**
 * POST /api/contractor/update-card
 * Update contractor business card
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Parse and validate request body
    const body = await request.json();
    const validation = updateCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid card data', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const validatedData = validation.data;

    // Prepare update object
    const updateData: {
      business_name?: string;
      tagline?: string;
      phone?: string;
      email?: string;
      website?: string | null;
      address?: string;
      bio?: string;
      specialties?: string[];
      social_media?: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
      };
    } = {};

    if (validatedData.businessName !== undefined) updateData.business_name = validatedData.businessName;
    if (validatedData.tagline !== undefined) updateData.tagline = validatedData.tagline;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.website !== undefined) updateData.website = validatedData.website;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.specialties !== undefined) updateData.specialties = validatedData.specialties;
    if (validatedData.socialMedia !== undefined) updateData.social_media = validatedData.socialMedia;

    // Update user profile
    const { data: updatedUser, error: updateError } = await serverSupabase
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
        businessName: updatedUser.business_name,
        tagline: updatedUser.tagline,
        phone: updatedUser.phone,
        email: updatedUser.email,
        website: updatedUser.website,
        address: updatedUser.address,
        bio: updatedUser.bio,
        specialties: updatedUser.specialties,
        socialMedia: updatedUser.social_media,
      },
    });
  },
);
