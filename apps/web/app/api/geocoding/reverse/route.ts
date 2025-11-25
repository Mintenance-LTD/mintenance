import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * API route to proxy reverse geocoding requests to Nominatim
 * Converts GPS coordinates to readable addresses
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    // Proxy request to Nominatim for reverse geocoding
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('lat', lat);
    nominatimUrl.searchParams.set('lon', lon);
    nominatimUrl.searchParams.set('zoom', '18');
    nominatimUrl.searchParams.set('addressdetails', '1');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'Mintenance App (https://mintenance.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('Error reverse geocoding from Nominatim', error, {
      service: 'geocoding',
      lat,
      lon,
    });
    return NextResponse.json(
      { error: 'Failed to get address from location. Please try again.' },
      { status: 500 }
    );
  }
}

