import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, NotFoundError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to update properties');
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      postcode,
      type,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      photos,
    } = body;

    // Update the property in the database
    const { data, error } = await serverSupabase
      .from('properties')
      .update({
        property_name: name,
        address,
        city,
        postcode,
        property_type: type,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        square_footage: squareFeet || null,
        year_built: yearBuilt || null,
        photos: photos || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating property', error, {
        service: 'properties',
        propertyId: resolvedParams.id,
        userId: user.id,
      });
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Property not found or not authorized');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to delete properties');
    }

    // Delete the property from the database
    const { error } = await serverSupabase
      .from('properties')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('owner_id', user.id);

    if (error) {
      logger.error('Error deleting property', error, {
        service: 'properties',
        propertyId: resolvedParams.id,
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}