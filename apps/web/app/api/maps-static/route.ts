import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * Secure Static Maps Proxy
 *
 * SECURITY: This endpoint generates static map images server-side
 * without exposing the API key to the client.
 *
 * Uses Google Maps Static API to generate map images.
 * Rate limited per-user to prevent abuse.
 */

interface StaticMapParams {
  center?: string; // "lat,lng" or address
  zoom?: number;
  size?: string; // "widthxheight", max 640x640 for free tier
  markers?: string; // "lat,lng|lat,lng|..."
  maptype?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
}

const STATIC_MAP_REQUEST_TIMEOUT_MS = 8_000;

/**
 * GET /api/maps-static
 *
 * Query params:
 * - center: "51.5074,-0.1278" or "London, UK"
 * - zoom: 10 (default)
 * - size: "600x400" (default, max 640x640)
 * - markers: "51.5074,-0.1278" (optional)
 * - maptype: "roadmap" (default)
 */
export const GET = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom per-user rate limiting (20/min)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `maps-static:${user.id}`,
      windowMs: 60000,
      maxRequests: 20,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter ?? 60),
          },
        }
      );
    }

    // Parse Query Parameters
    const searchParams = request.nextUrl.searchParams;
    const center = searchParams.get('center');
    const zoom = parseInt(searchParams.get('zoom') || '10', 10);
    const size = searchParams.get('size') || '600x400';
    const markers = searchParams.get('markers');
    const maptype = (searchParams.get('maptype') || 'roadmap') as StaticMapParams['maptype'];

    if (!center) {
      return NextResponse.json(
        { error: 'center parameter is required' },
        { status: 400 }
      );
    }

    if (center.length > 200 || (markers && markers.length > 2_000)) {
      return NextResponse.json(
        { error: 'Map location parameters are too long' },
        { status: 400 }
      );
    }

    // Validate size (max 640x640 for free tier)
    const sizeMatch = /^(\d{1,3})x(\d{1,3})$/.exec(size);
    const width = sizeMatch ? Number(sizeMatch[1]) : 0;
    const height = sizeMatch ? Number(sizeMatch[2]) : 0;
    if (width < 1 || height < 1 || width > 640 || height > 640) {
      return NextResponse.json(
        { error: 'Invalid size. Maximum 640x640.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(zoom) || zoom < 0 || zoom > 21) {
      return NextResponse.json(
        { error: 'Invalid zoom. Must be between 0 and 21.' },
        { status: 400 }
      );
    }

    const allowedMapTypes = new Set<NonNullable<StaticMapParams['maptype']>>([
      'roadmap',
      'satellite',
      'terrain',
      'hybrid',
    ]);
    if (!allowedMapTypes.has(maptype as NonNullable<StaticMapParams['maptype']>)) {
      return NextResponse.json(
        { error: 'Invalid map type' },
        { status: 400 }
      );
    }

    // Check API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.error('GOOGLE_MAPS_API_KEY not configured', new Error('Missing API key'), {
        service: 'maps-static',
      });
      return NextResponse.json(
        { error: 'Maps service not configured' },
        { status: 500 }
      );
    }

    // Build Static Maps URL
    const params = new URLSearchParams({
      center,
      zoom: zoom.toString(),
      size,
      maptype: maptype ?? 'roadmap',
      key: apiKey,
    });

    if (markers) {
      params.append('markers', markers);
    }

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

    // Fetch Static Map Image
    const response = await fetch(staticMapUrl, {
      signal: AbortSignal.timeout(STATIC_MAP_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error('Failed to fetch static map', new Error(`Status: ${response.status}`), {
        service: 'maps-static',
        status: response.status,
      });
      return NextResponse.json(
        { error: 'Failed to generate map image' },
        { status: 500 }
      );
    }

    // Return Image
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        // The URL contains user-supplied property coordinates. Do not allow
        // a shared CDN cache to serve one authenticated user's map to another
        // requester who knows the URL.
        'Cache-Control': 'private, max-age=86400',
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });
  }
);
