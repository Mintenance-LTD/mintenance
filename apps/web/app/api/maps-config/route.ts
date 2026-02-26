import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/maps-config - secure maps configuration endpoint.
 * Currently disabled: returns 403 directing to server-side geocoding.
 */
export const GET = withApiHandler({}, async () => {
  return NextResponse.json(
    {
      error: 'Client-side map loading is disabled for security',
      message: 'Use server-side geocoding via /api/geocode-proxy',
    },
    { status: 403 },
  );
});
