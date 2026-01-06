import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { publicRateLimiter } from '@/lib/middleware/public-rate-limiter-redis';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Geocode an address to get latitude/longitude
 * GET /api/geocode?address=...
 *
 * Security:
 * - Rate limited: 10 requests/min per IP
 * - Server-side API key (never exposed to client)
 * - Input validation and sanitization
 * - All requests logged for abuse detection
 */
export async function GET(request: NextRequest) {
  try {
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

    // Apply rate limiting (10 req/min per IP)
    const rateLimitResult = await publicRateLimiter(request, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.success) {
      logger.warn('Geocode rate limit exceeded', {
        service: 'geocoding',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimitResult.resetTime / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Input validation - prevent excessively long addresses
    if (address.length > 500) {
      return NextResponse.json(
        { error: 'Address too long (max 500 characters)' },
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

      // Log successful geocoding for abuse detection
      logger.info('Geocode request successful', {
        service: 'geocoding',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        address: address.substring(0, 100), // Log first 100 chars only
        status: data.status,
      });

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
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    logger.error('Error in geocode route', error, {
      service: 'geocoding',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

