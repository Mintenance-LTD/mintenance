import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Geocode an address to get latitude/longitude
 * GET /api/geocode?address=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.error('GOOGLE_MAPS_API_KEY not configured', new Error('Missing API key'), {
        service: 'geocoding',
      });
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address,
      });
    } else {
      logger.error('Geocoding error', new Error(`Geocoding status: ${data.status}`), {
        service: 'geocoding',
        status: data.status,
        errorMessage: data.error_message,
        address,
      });
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    logger.error('Error in geocode route', error, {
      service: 'geocoding',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

