import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * Secure Maps Configuration Endpoint
 *
 * SECURITY: This endpoint provides a display-only API key for Google Maps
 * that should have HTTP referrer restrictions in Google Cloud Console.
 *
 * IMPORTANT: The key returned here should be DIFFERENT from GOOGLE_MAPS_API_KEY
 * and should ONLY have permissions for:
 * - Maps JavaScript API (for displaying maps)
 * - NO geocoding permissions (use /api/geocode-proxy instead)
 *
 * Requires authentication to prevent abuse.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, we'll disable client-side map loading entirely
    // Maps should only be displayed via server-side rendering or iframe embeds
    return NextResponse.json(
      {
        error: 'Client-side map loading is disabled for security',
        message: 'Use server-side geocoding via /api/geocode-proxy',
      },
      { status: 403 }
    );

    // FUTURE: If you need client-side maps, create a separate restricted key:
    // const displayKey = process.env.GOOGLE_MAPS_DISPLAY_KEY;
    // if (!displayKey) {
    //   return NextResponse.json(
    //     { error: 'Maps display not configured' },
    //     { status: 500 }
    //   );
    // }
    //
    // return NextResponse.json(
    //   { apiKey: displayKey },
    //   {
    //     headers: {
    //       'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
    //     },
    //   }
    // );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
