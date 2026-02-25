// Zero-dependency diagnostic route to isolate serverless function crashes
// If this returns 500: problem is environmental (Node version, function packaging)
// If this returns 200: problem is in the import chain of other routes

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ auth: false, rateLimit: false }, async (_request) => {
  return NextResponse.json({ ok: true, nodeVersion: process.version, env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});
