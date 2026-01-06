import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError, ConflictError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

// Type definition for property insert data
interface PropertyInsertData {
  owner_id: string;
  property_name: string;
  address: string;
  property_type: string;
  is_primary: boolean;
  photos?: string[];
}

/**
 * Get all properties for the current user
 * GET /api/properties
 */
export async function GET(request: NextRequest) {
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
      throw new UnauthorizedError('Authentication required to view properties');
    }

    const { data: properties, error } = await serverSupabase
      .from('properties')
      .select('id, property_name, address, property_type, is_primary, photos')
      .eq('owner_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch properties', error, {
        userId: user.id,
        service: 'properties',
      });
      throw error;
    }

    return NextResponse.json({
      properties: properties || [],
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Create a new property
 * POST /api/properties
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

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to create properties');
    }

    const body = await request.json();
    const { property_name, address, property_type, is_primary, photos } = body;

    // Validation
    if (!property_name || !property_name.trim()) {
      throw new BadRequestError('Property name is required');
    }

    if (!address || !address.trim()) {
      throw new BadRequestError('Address is required');
    }

    if (!property_type || !['residential', 'commercial', 'rental'].includes(property_type)) {
      throw new BadRequestError('Valid property type is required (residential, commercial, or rental)');
    }

    // If setting as primary, unset all other primary properties for this user
    if (is_primary) {
      await serverSupabase
        .from('properties')
        .update({ is_primary: false })
        .eq('owner_id', user.id)
        .eq('is_primary', true);
    }

    // Create the property
    const insertData: PropertyInsertData = {
      owner_id: user.id,
      property_name: property_name.trim(),
      address: address.trim(),
      property_type: property_type,
      is_primary: is_primary || false,
    };

    // Add photos if provided (as JSONB array or text array)
    if (photos && Array.isArray(photos) && photos.length > 0) {
      insertData.photos = photos;
    }

    const { data: property, error: createError } = await serverSupabase
      .from('properties')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create property', createError, {
        userId: user.id,
        service: 'properties',
        errorCode: createError.code,
        errorMessage: createError.message,
        errorDetails: createError.details,
      });

      // Handle duplicate or constraint errors
      if (createError.code === '23505') {
        throw new ConflictError('A property with this name already exists');
      }

      throw createError;
    }

    logger.info('Property created successfully', {
      propertyId: property.id,
      userId: user.id,
      service: 'properties',
    });

    return NextResponse.json({
      success: true,
      property,
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

