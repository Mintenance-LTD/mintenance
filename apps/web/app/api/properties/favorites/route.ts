import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { propertyFavoriteSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/properties/favorites
 * List the current user's favorited property ids.
 */
export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('property_favorites')
      .select('property_id')
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error listing property favorites', error, {
        service: 'properties',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({
      favorites: (data || []).map((f) => f.property_id),
    });
  }
);

/**
 * POST /api/properties/favorites
 * Add a property to user's favorites
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, propertyFavoriteSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { property_id } = validation.data;

    // Verify the property exists and belongs to the user
    const { data: property, error: propertyError } = await serverSupabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('owner_id', user.id)
      .single();

    if (propertyError || !property) {
      throw new BadRequestError('Property not found or not authorized');
    }

    // Add favorite (will ignore if already exists due to UNIQUE constraint)
    const { data, error } = await serverSupabase
      .from('property_favorites')
      .insert({
        user_id: user.id,
        property_id,
      })
      .select()
      .single();

    if (error) {
      // If the error is a duplicate key error, treat it as success
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Property already favorited',
        });
      }

      logger.error('Error adding property favorite', error, {
        service: 'properties',
        propertyId: property_id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true, data });
  }
);

/**
 * DELETE /api/properties/favorites?property_id=<uuid>
 * Remove a property from user's favorites. Accepts property_id via query string
 * (DELETE requests commonly have no body) or JSON body for backwards compatibility.
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const url = new URL(request.url);
    let property_id = url.searchParams.get('property_id') || undefined;

    // Fall back to JSON body for clients that send it that way.
    if (!property_id) {
      const validation = await validateRequest(request, propertyFavoriteSchema);
      if ('headers' in validation) {
        return validation;
      }
      property_id = validation.data.property_id;
    } else {
      // Validate the query-string uuid against the same schema for consistency.
      const parsed = propertyFavoriteSchema.safeParse({ property_id });
      if (!parsed.success) {
        throw new BadRequestError('Invalid property_id');
      }
      property_id = parsed.data.property_id;
    }

    // Remove favorite
    const { error } = await serverSupabase
      .from('property_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', property_id);

    if (error) {
      logger.error('Error removing property favorite', error, {
        service: 'properties',
        propertyId: property_id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true });
  }
);
