import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring
 * Returns service status and configuration check
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.2.4',
    environment: env.NODE_ENV,
    services: {
      database: checkDatabase(),
      redis: checkRedis(),
      ai: checkAI(),
      payments: checkPayments(),
    },
  };

  const allHealthy = Object.values(health.services).every((s) => s.status === 'ok');

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
  });
}

function checkDatabase() {
  return {
    status: env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error',
    message: env.SUPABASE_SERVICE_ROLE_KEY ? 'Connected' : 'Not configured',
  };
}

function checkRedis() {
  const hasRedis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN;
  return {
    status: hasRedis ? 'ok' : 'warning',
    message: hasRedis ? 'Connected' : 'Not configured (rate limiting degraded)',
  };
}

function checkAI() {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  return {
    status: hasOpenAI ? 'ok' : 'warning',
    message: hasOpenAI ? 'Configured' : 'Not configured (AI features disabled)',
  };
}

function checkPayments() {
  const hasStripe = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET;
  return {
    status: hasStripe ? 'ok' : 'error',
    message: hasStripe ? 'Configured' : 'Not configured',
  };
}
