import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * PATCH /api/contractor/profile/location
 * Updates contractor location (latitude, longitude, address, city, postcode)
 */
export async function PATCH(request: Request) {
  try {
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

    // Parse request body
    const body = await request.json();
    const {
      contractorId,
      latitude,
      longitude,
      address,
      city,
      postcode,
    } = body;

    // Validate required fields
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude ranges
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude value' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude value' },
        { status: 400 }
      );
    }

    // Verify user owns this contractor profile
    const { data: contractorData, error: contractorError } = await supabase
      .from('users')
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
      .from('users')
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
      .from('users')
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
