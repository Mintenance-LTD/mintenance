import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

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
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: properties, error } = await serverSupabase
      .from('properties')
      .select('id, property_name, address, property_type, is_primary')
      .eq('owner_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch properties', error, {
        userId: user.id,
        service: 'properties',
      });
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      properties: properties || [],
    });
  } catch (error) {
    logger.error('Error fetching properties', error, { service: 'properties' });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Create a new property
 * POST /api/properties
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { property_name, address, property_type, is_primary, photos } = body;

    // Validation
    if (!property_name || !property_name.trim()) {
      return NextResponse.json(
        { error: 'Property name is required' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!property_type || !['residential', 'commercial', 'rental'].includes(property_type)) {
      return NextResponse.json(
        { error: 'Valid property type is required (residential, commercial, or rental)' },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: 'A property with this name already exists' },
          { status: 409 }
        );
      }

      // Return more detailed error information
      return NextResponse.json(
        { 
          error: 'Failed to create property. Please try again.',
          details: createError.message || 'Database error occurred',
          code: createError.code,
        },
        { status: 500 }
      );
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
    logger.error('Error creating property', error, { service: 'properties' });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

