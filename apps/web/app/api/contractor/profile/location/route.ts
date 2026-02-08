import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/**
 * PATCH /api/contractor/profile/location
 * Updates contractor location (latitude, longitude, address, city, postcode)
 */
export async function PATCH(request: NextRequest) {
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

    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const locationSchema = z.object({
      contractorId: z.string().uuid().optional(),
      latitude: z.number().min(-90, 'Invalid latitude value').max(90, 'Invalid latitude value'),
      longitude: z.number().min(-180, 'Invalid longitude value').max(180, 'Invalid longitude value'),
      address: z.string().max(500).optional(),
      city: z.string().max(200).optional(),
      postcode: z.string().max(20).optional(),
    });

    const validation = await validateRequest(request, locationSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: validatedBody } = validation;
    const { contractorId, latitude, longitude, address, city, postcode } = validatedBody;

    // Verify user owns this contractor profile
    const { data: contractorData, error: contractorError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (contractorError || !contractorData) {
      logger.error('Failed to fetch contractor data', {
        userId: user.id,
        error: contractorError,
      });
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Verify user is a contractor
    if (contractorData.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can update location' },
        { status: 403 }
      );
    }

    // Update contractor location in users table
    const { data: updatedData, error: updateError } = await supabase
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
      .select(
        'id, latitude, longitude, address, city, postcode, updated_at'
      )
      .single();

    if (updateError) {
      logger.error('Failed to update contractor location', {
        userId: user.id,
        error: updateError,
      });
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
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
  } catch (error) {
    logger.error('Error in PATCH /api/contractor/profile/location', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/profile/location
 * Retrieves contractor's current location
 */
export async function GET(request: Request) {
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

    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch contractor location
    const { data: locationData, error: locationError } = await supabase
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
      return NextResponse.json(
        { error: 'Failed to fetch location' },
        { status: 500 }
      );
    }

    if (!locationData) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: locationData,
    });
  } catch (error) {
    logger.error('Error in GET /api/contractor/profile/location', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
