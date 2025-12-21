import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring
 *
 * Public Response: Minimal status (healthy/degraded) only
 * Server Logs: Full diagnostic details
 *
 * Security: Does not expose internal configuration details
 */
export async function GET() {
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

  return NextResponse.json(
    {
      status: publicStatus,
      timestamp: new Date().toISOString(),
    },
    {
      status: allHealthy ? 200 : hasCriticalError ? 503 : 200,
    }
  );
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
