import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Building Surveyor service
 * Returns configuration status without exposing sensitive data
 */
export const GET = withApiHandler({ auth: false }, async () => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'configured' : 'not_configured',
    hasApiKey,
    message: hasApiKey
      ? 'OpenAI API key is configured'
      : 'OpenAI API key is missing. Add OPENAI_API_KEY to .env.local',
  });
});
