import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Secure Static Maps Proxy
 *
 * SECURITY: This endpoint generates static map images server-side
 * without exposing the API key to the client.
 *
 * Uses Google Maps Static API to generate map images.
 * Rate limited to prevent abuse.
 */

interface StaticMapParams {
  center?: string; // "lat,lng" or address
  zoom?: number;
  size?: string; // "widthxheight", max 640x640 for free tier
  markers?: string; // "lat,lng|lat,lng|..."
  maptype?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
}

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
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // 3. Parse Query Parameters
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

    // Validate size (max 640x640 for free tier)
    const [width, height] = size.split('x').map(Number);
    if (!width || !height || width > 640 || height > 640) {
      return NextResponse.json(
        { error: 'Invalid size. Maximum 640x640.' },
        { status: 400 }
      );
    }

    // 4. Check API Key
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

    // 5. Build Static Maps URL
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

    // 6. Fetch Static Map Image
    const response = await fetch(staticMapUrl);

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

    // 7. Return Image
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    logger.error('Error in static maps proxy', error, {
      service: 'maps-static',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
