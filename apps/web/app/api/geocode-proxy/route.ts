import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Secure Server-Side Geocoding Proxy
 *
 * SECURITY FEATURES:
 * - Server-side API key (never exposed to client)
 * - User authentication required
 * - Rate limiting (10 requests per minute per user)
 * - Input validation and sanitization
 * - CSRF protection via auth token validation
 *
 * This endpoint replaces direct client-side Google Maps API calls
 * to prevent API key exposure in JavaScript bundles.
 */

interface GeocodeRequest {
  address?: string;
  lat?: number;
  lng?: number;
}

interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

/**
 * POST /api/geocode-proxy
 *
 * Geocode an address or reverse geocode coordinates
 *
 * Request body:
 * - Forward geocoding: { address: "123 Main St, London, UK" }
 * - Reverse geocoding: { lat: 51.5074, lng: -0.1278 }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      logger.warn('Unauthorized geocoding attempt', {
        service: 'geocode-proxy',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `geocode:${user.id}`,
      windowMs: 60000,
      maxRequests: 10,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for geocoding', {
        service: 'geocode-proxy',
        userId: user.id,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter ?? 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter ?? 60),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

    // 3. Parse and Validate Request Body
    let body: GeocodeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // 4. Input Validation
    const hasAddress = body.address && typeof body.address === 'string';
    const hasCoordinates =
      typeof body.lat === 'number' &&
      typeof body.lng === 'number' &&
      body.lat >= -90 && body.lat <= 90 &&
      body.lng >= -180 && body.lng <= 180;

    if (!hasAddress && !hasCoordinates) {
      return NextResponse.json(
        {
          error: 'Either address or coordinates (lat, lng) are required',
          details: {
            addressProvided: !!body.address,
            coordinatesProvided: !!(body.lat && body.lng),
          },
        },
        { status: 400 }
      );
    }

    // Validate address string length
    if (hasAddress && body.address!.length > 500) {
      return NextResponse.json(
        { error: 'Address must be less than 500 characters' },
        { status: 400 }
      );
    }

    // 5. Check API Key Configuration
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.error('GOOGLE_MAPS_API_KEY not configured', new Error('Missing API key'), {
        service: 'geocode-proxy',
      });
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    // 6. Build Google Maps API Request
    let googleMapsUrl: string;
    if (hasAddress) {
      // Forward geocoding
      const encodedAddress = encodeURIComponent(body.address!.trim());
      googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    } else {
      // Reverse geocoding
      googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.lat},${body.lng}&key=${apiKey}`;
    }

    // 7. Call Google Maps API
    const startTime = Date.now();
    const response = await fetch(googleMapsUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    // 8. Handle API Response
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      const geocodeResponse: GeocodeResponse = {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: result.formatted_address,
      };

      // Log successful geocoding
      logger.info('Geocoding successful', {
        service: 'geocode-proxy',
        userId: user.id,
        duration,
        type: hasAddress ? 'forward' : 'reverse',
      });

      return NextResponse.json(geocodeResponse, {
        headers: {
          'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      });
    } else {
      // Handle Google Maps API errors
      const errorMessage = data.error_message || 'Geocoding failed';

      logger.warn('Geocoding error from Google Maps API', {
        service: 'geocode-proxy',
        userId: user.id,
        status: data.status,
        errorMessage,
        duration,
      });

      // Map Google Maps API errors to appropriate HTTP status codes
      let statusCode = 404;
      if (data.status === 'ZERO_RESULTS') {
        statusCode = 404;
      } else if (data.status === 'INVALID_REQUEST') {
        statusCode = 400;
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        statusCode = 429;
      } else if (data.status === 'REQUEST_DENIED') {
        statusCode = 403;
      } else if (data.status === 'UNKNOWN_ERROR') {
        statusCode = 500;
      }

      return NextResponse.json(
        {
          error: statusCode === 404 ? 'Location not found' : errorMessage,
          status: data.status,
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    logger.error('Unexpected error in geocode proxy', error, {
      service: 'geocode-proxy',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geocode-proxy?address=...
 *
 * Legacy support for GET requests (less secure, use POST instead)
 * Maintained for backward compatibility
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

  const address = request.nextUrl.searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  // Convert GET to POST internally
  const mockPostRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ address }),
  });

  return POST(mockPostRequest as NextRequest);
}
