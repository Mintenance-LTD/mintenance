import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Building Surveyor service
 * Returns configuration status without exposing sensitive data
 */
export async function GET() {
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

    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'NOT_SET';
    
    return NextResponse.json({
        status: hasApiKey ? 'configured' : 'not_configured',
        hasApiKey,
        apiKeyLength,
        apiKeyPrefix,
        message: hasApiKey 
            ? 'OpenAI API key is configured' 
            : 'OpenAI API key is missing. Add OPENAI_API_KEY to .env.local',
    });
}

