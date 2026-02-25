import { NextResponse } from 'next/server';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/geocoding/reverse - proxy reverse geocoding to Nominatim.
 */
export const GET = withApiHandler({ auth: false }, async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    throw new BadRequestError('Latitude and longitude are required');
  }

  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
  nominatimUrl.searchParams.set('format', 'json');
  nominatimUrl.searchParams.set('lat', lat);
  nominatimUrl.searchParams.set('lon', lon);
  nominatimUrl.searchParams.set('zoom', '18');
  nominatimUrl.searchParams.set('addressdetails', '1');

  const response = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': 'Mintenance App (https://mintenance.app)',
      Accept: 'application/json',
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
});
