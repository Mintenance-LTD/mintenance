import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

// Validation schema for business card
const updateCardSchema = z.object({
  businessName: z.string().min(1).max(255).optional(),
  tagline: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string()).optional(),
  socialMedia: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized card update attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to update business card', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can update business cards' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCardSchema.parse(body);

    // Prepare update object
    const updateData: any = {};

    if (validatedData.businessName !== undefined) {
      updateData.business_name = validatedData.businessName;
    }
    if (validatedData.tagline !== undefined) {
      updateData.tagline = validatedData.tagline;
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email;
    }
    if (validatedData.website !== undefined) {
      updateData.website = validatedData.website;
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address;
    }
    if (validatedData.bio !== undefined) {
      updateData.bio = validatedData.bio;
    }
    if (validatedData.specialties !== undefined) {
      updateData.specialties = validatedData.specialties;
    }
    if (validatedData.socialMedia !== undefined) {
      updateData.social_media = validatedData.socialMedia;
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await serverSupabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update business card', updateError, {
        service: 'contractor',
        userId: user.id
      });
      return NextResponse.json({ error: 'Failed to update business card' }, { status: 500 });
    }

    logger.info('Business card updated successfully', {
      service: 'contractor',
      userId: user.id,
      fieldsUpdated: Object.keys(updateData)
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
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid business card update data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid card data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('Unexpected error in update-card', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
