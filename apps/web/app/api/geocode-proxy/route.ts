import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * Secure Server-Side Geocoding Proxy
 *
 * SECURITY FEATURES:
 * - Server-side API key (never exposed to client)
 * - User authentication required
 * - Rate limiting (10 requests per minute per user)
 * - Input validation and sanitization
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
export const POST = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom per-user rate limiting (10/min)
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

    // Parse and Validate Request Body
    let body: GeocodeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Input Validation
    const hasAddress = body.address && typeof body.address === 'string';
    const hasCoordinates =
      typeof body.lat === 'number' &&
      typeof body.lng === 'number' &&
      body.lat >= -90 &&
      body.lat <= 90 &&
      body.lng >= -180 &&
      body.lng <= 180;

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

    // Try Google Maps first, fallback to Nominatim (OpenStreetMap)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const startTime = Date.now();

    // --- Attempt Google Maps if API key is available ---
    if (apiKey) {
      let googleMapsUrl: string;
      if (hasAddress) {
        const encodedAddress = encodeURIComponent(body.address!.trim());
        googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
      } else {
        googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.lat},${body.lng}&key=${apiKey}`;
      }

      const response = await fetch(googleMapsUrl, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      const duration = Date.now() - startTime;

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        return NextResponse.json(
          {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formatted_address: result.formatted_address,
          } satisfies GeocodeResponse,
          {
            headers: {
              'Cache-Control': 'private, max-age=86400',
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            },
          }
        );
      }

      logger.warn('Google Maps geocoding failed, trying Nominatim fallback', {
        service: 'geocode-proxy',
        status: data.status,
        duration,
      });
    }

    // --- Fallback: Nominatim (OpenStreetMap) — free, no API key needed ---
    try {
      let nominatimUrl: string;
      if (hasAddress) {
        const encodedAddress = encodeURIComponent(body.address!.trim());
        nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=gb`;
      } else {
        nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${body.lat}&lon=${body.lng}&format=json`;
      }

      const nomResponse = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Mintenance/1.0 (property maintenance platform)',
          Accept: 'application/json',
        },
      });
      const nomData = await nomResponse.json();
      const duration = Date.now() - startTime;

      if (hasAddress && Array.isArray(nomData) && nomData.length > 0) {
        return NextResponse.json(
          {
            latitude: parseFloat(nomData[0].lat),
            longitude: parseFloat(nomData[0].lon),
            formatted_address: nomData[0].display_name || body.address!,
          } satisfies GeocodeResponse,
          {
            headers: {
              'Cache-Control': 'private, max-age=86400',
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            },
          }
        );
      } else if (!hasAddress && nomData && nomData.lat) {
        return NextResponse.json({
          latitude: parseFloat(nomData.lat),
          longitude: parseFloat(nomData.lon),
          formatted_address: nomData.display_name || '',
        } satisfies GeocodeResponse);
      }

      logger.warn('Nominatim geocoding returned no results', {
        service: 'geocode-proxy',
        duration,
      });
    } catch (nomError) {
      logger.error(
        'Nominatim geocoding failed',
        nomError instanceof Error ? nomError : new Error(String(nomError)),
        {
          service: 'geocode-proxy',
        }
      );
    }

    return NextResponse.json(
      { error: 'Location not found', status: 'ZERO_RESULTS' },
      { status: 404 }
    );
  }
);

/**
 * GET /api/geocode-proxy?address=...
 *
 * Legacy support for GET requests (less secure, use POST instead)
 * Maintained for backward compatibility
 */
export const GET = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Legacy GET uses IP-based rate limiting (30/min)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
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
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
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

    return POST(mockPostRequest as NextRequest, {
      params: Promise.resolve({}),
    });
  }
);
