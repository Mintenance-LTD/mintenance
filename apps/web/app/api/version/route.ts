import { NextResponse } from 'next/server';

/**
 * Version API endpoint
 *
 * Returns the current build ID for version checking
 * This helps detect when a new deployment has occurred
 */
export async function GET() {
  // In production, this would be set by the build process
  // For now, we'll use an environment variable or timestamp
  const buildId =
    process.env.NEXT_PUBLIC_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD_ID ||
    'dev';

  return NextResponse.json(
    {
      buildId,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  );
}
