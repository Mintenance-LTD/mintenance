import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET() {
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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    logger.info('🔵 Testing Edge Function');

    const { data, error } = await serverSupabase.functions.invoke('test-payout', {
      body: { test: true },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    logger.info('🔍 Test Response:', JSON.stringify({ data, error }, null, 2));

    return NextResponse.json({
      data,
      error: error ? { name: error.name, message: error.message } : null,
    });
  } catch (error) {
    logger.error('🔴 Test Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
