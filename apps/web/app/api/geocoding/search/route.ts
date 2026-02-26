import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/geocoding/search - proxy address search to Nominatim.
 */
export const GET = withApiHandler({ auth: false }, async (request) => {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.trim().length < 3) {
    throw new BadRequestError('Query must be at least 3 characters');
  }

  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('format', 'json');
  nominatimUrl.searchParams.set('q', query);
  nominatimUrl.searchParams.set('countrycodes', 'gb');
  nominatimUrl.searchParams.set('limit', '5');
  nominatimUrl.searchParams.set('addressdetails', '1');

  const response = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': 'Mintenance App (https://mintenance.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    logger.error('Nominatim API error', new Error(`Status: ${response.status}`), {
      service: 'geocoding',
      query,
    });
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data = await response.json();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
});
