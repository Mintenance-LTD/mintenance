import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/version - returns current build ID for version checking.
 */
export const GET = withApiHandler({ auth: false }, async () => {
  const buildId =
    process.env.NEXT_PUBLIC_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD_ID ||
    'dev';

  return NextResponse.json(
    { buildId, timestamp: new Date().toISOString(), env: process.env.NODE_ENV },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    },
  );
});
