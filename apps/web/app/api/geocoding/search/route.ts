import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { rateLimiter } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

/**
 * GET /api/geocoding/search — proxy address search to Nominatim.
 *
 * AUDIT_PUNCH_LIST P1 #16 (B2-P1-2) — Nominatim's public policy is
 * "1 request/second, no heavy use" with IP-based bans for abuse.
 * The route is `auth: false` and proxies our server IP to OSM; an
 * attacker (or a buggy client retry loop) hammering this path could
 * get our entire production IP range banned. Hardened 2026-05-09:
 *   - IP-based rate limit (30/min) wraps the upstream call.
 *   - Cache TTL bumped to 24h public + 7-day stale-while-revalidate
 *     so identical address searches are never re-fetched from OSM.
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    const identifier = getClientIp(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `geocoding-search:${identifier}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Geocoding search rate limit exceeded', {
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
      logger.error(
        'Nominatim API error',
        new Error(`Status: ${response.status}`),
        {
          service: 'geocoding',
          query,
        }
      );
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
