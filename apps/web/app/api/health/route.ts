import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@mintenance/shared';
import { CURRENT_API_VERSION, addVersionHeaders } from '@/lib/api-version';
import { rateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring
 *
 * Public Response: Minimal status (healthy/degraded) only
 * Server Logs: Full diagnostic details
 *
 * Security: Does not expose internal configuration details
 */
export async function GET(request: Request) {
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

  const services = {
    database: checkDatabase(),
    redis: checkRedis(),
    ai: checkAI(),
    payments: checkPayments(),
  };

  const allHealthy = Object.values(services).every((s) => s.status === 'ok');
  const hasCriticalError = Object.values(services).some((s) => s.status === 'error');

  // Log full details server-side for debugging
  logger.info('Health check performed', {
    service: 'health',
    status: allHealthy ? 'healthy' : hasCriticalError ? 'unhealthy' : 'degraded',
    services,
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.2.4',
  });

  // Public response - minimal information only
  const publicStatus = allHealthy ? 'healthy' : hasCriticalError ? 'unhealthy' : 'degraded';

  const response = NextResponse.json(
    {
      status: publicStatus,
      timestamp: new Date().toISOString(),
      version: CURRENT_API_VERSION,
    },
    {
      status: allHealthy ? 200 : hasCriticalError ? 503 : 200,
    }
  );

  // Add API version headers
  return addVersionHeaders(response);
}

function checkDatabase() {
  return {
    status: env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error',
    configured: !!env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function checkRedis() {
  const hasRedis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN;
  return {
    status: hasRedis ? 'ok' : 'warning',
    configured: hasRedis,
  };
}

function checkAI() {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  return {
    status: hasOpenAI ? 'ok' : 'warning',
    configured: hasOpenAI,
  };
}

function checkPayments() {
  const hasStripe = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET;
  return {
    status: hasStripe ? 'ok' : 'error',
    configured: hasStripe,
  };
}
