import { serverSupabase } from '@/lib/api/supabaseServer';
import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { BadRequestError, NotFoundError, ForbiddenError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const locationSchema = z.object({
  contractorId: z.string().uuid().optional(),
  latitude: z.number().min(-90, 'Invalid latitude value').max(90, 'Invalid latitude value'),
  longitude: z.number().min(-180, 'Invalid longitude value').max(180, 'Invalid longitude value'),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  postcode: z.string().max(20).optional(),
});

/**
 * PATCH /api/contractor/profile/location
 * Updates contractor location (latitude, longitude, address, city, postcode)
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, locationSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: validatedBody } = validation;
    const { latitude, longitude, address, city, postcode } = validatedBody;

    // Update contractor location in profiles table
    const { data: updatedData, error: updateError } = await serverSupabase
      .from('profiles')
      .update({
        latitude,
        longitude,
        address: address || null,
        city: city || null,
        postcode: postcode || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, latitude, longitude, address, city, postcode, updated_at')
      .single();

    if (updateError) {
      logger.error('Failed to update contractor location', {
        userId: user.id,
        error: updateError,
      });
      throw new InternalServerError('Failed to update location');
    }

    logger.info('Contractor location updated successfully', {
      userId: user.id,
      latitude,
      longitude,
      city,
    });

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Location updated successfully',
    });
  },
);

/**
 * GET /api/contractor/profile/location
 * Retrieves contractor's current location
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: locationData, error: locationError } = await serverSupabase
      .from('profiles')
      .select('id, latitude, longitude, address, city, postcode')
      .eq('id', user.id)
      .eq('role', 'contractor')
      .single();

    if (locationError) {
      logger.error('Failed to fetch contractor location', {
        userId: user.id,
        error: locationError,
      });
      throw new InternalServerError('Failed to fetch location');
    }

    if (!locationData) {
      throw new NotFoundError('Contractor not found');
    }

    return NextResponse.json({
      success: true,
      data: locationData,
    });
  },
);
