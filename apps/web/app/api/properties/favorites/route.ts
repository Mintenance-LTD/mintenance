import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * POST /api/properties/favorites
 * Add a property to user's favorites
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

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to favorite properties');
    }

    const body = await request.json();
    const { property_id } = body;

    if (!property_id) {
      throw new BadRequestError('property_id is required');
    }

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
        return NextResponse.json({ success: true, message: 'Property already favorited' });
      }

      logger.error('Error adding property favorite', error, {
        service: 'properties',
        propertyId: property_id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/properties/favorites
 * Remove a property from user's favorites
 */
export async function DELETE(request: NextRequest) {
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

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to manage favorites');
    }

    const body = await request.json();
    const { property_id } = body;

    if (!property_id) {
      throw new BadRequestError('property_id is required');
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
  } catch (error) {
    return handleAPIError(error);
  }
}
