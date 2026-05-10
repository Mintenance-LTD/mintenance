import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { rateLimiter } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

/**
 * GET /api/geocoding/reverse — proxy reverse geocoding to Nominatim.
 *
 * AUDIT_PUNCH_LIST P1 #16 (B2-P1-2) — same hardening pass as the
 * `/search` sibling: IP rate-limit (30/min) + 24h public cache +
 * 7-day stale-while-revalidate. Reverse-geocoding lookups are even
 * more cache-friendly than forward search (a given lat/lon nearly
 * always maps to the same postcode).
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    const identifier = getClientIp(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `geocoding-reverse:${identifier}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Geocoding reverse rate limit exceeded', {
        service: 'geocoding',
        identifier,
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(
              Math.ceil(rateLimitResult.resetTime / 1000)
            ),
            'Retry-After': String(
              Math.ceil((rateLimitResult.retryAfter ?? 60000) / 1000)
            ),
          },
        }
      );
    }

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
        'Cache-Control':
          'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  }
);
