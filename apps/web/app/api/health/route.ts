import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@mintenance/shared';
import { CURRENT_API_VERSION, addVersionHeaders } from '@/lib/api-version';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const dynamic = 'force-dynamic';

const SERVICE_TIMEOUT_MS = 5000;

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async () => {
    const startTime = Date.now();

    const [database, redis, payments] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkPayments(),
    ]);

    const services = { database, redis, payments };
    const allHealthy = Object.values(services).every((s) => s.status === 'ok');
    const hasCriticalError = Object.values(services).some((s) => s.status === 'error');
    const publicStatus = allHealthy ? 'healthy' : hasCriticalError ? 'unhealthy' : 'degraded';
    const totalLatencyMs = Date.now() - startTime;

    logger.info('Health check performed', {
      service: 'health',
      status: publicStatus,
      totalLatencyMs,
      services: Object.fromEntries(
        Object.entries(services).map(([name, result]) => [
          name,
          { status: result.status, latencyMs: result.latencyMs },
        ])
      ),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.2.4',
    });

    const response = NextResponse.json(
      {
        status: publicStatus,
        timestamp: new Date().toISOString(),
        version: CURRENT_API_VERSION,
        latencyMs: totalLatencyMs,
      },
      { status: hasCriticalError ? 503 : 200 }
    );

    return addVersionHeaders(response);
  }
);

// ── Service Check Types ──────────────────────────────────────────────

interface ServiceCheckResult {
  status: 'ok' | 'warning' | 'error';
  latencyMs: number;
}

// ── Database (Supabase PostgreSQL) ───────────────────────────────────

async function checkDatabase(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return { status: 'error', latencyMs: Date.now() - start };
    }

    const result = await Promise.race([
      serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), SERVICE_TIMEOUT_MS)
      ),
    ]);

    const latencyMs = Date.now() - start;

    if ('error' in result && result.error) {
      logger.warn('Supabase health check returned error', {
        service: 'health',
        error: (result as { error: { message: string } }).error.message,
        latencyMs,
      });
      return { status: 'error', latencyMs };
    }

    return { status: latencyMs > 2000 ? 'warning' : 'ok', latencyMs };
  } catch (error) {
    logger.error('Supabase health check failed', error, { service: 'health' });
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

// ── Redis / Upstash ──────────────────────────────────────────────────

async function checkRedis(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      return { status: env.NODE_ENV === 'production' ? 'error' : 'warning', latencyMs: Date.now() - start };
    }

    // Probe Redis directly: the rate limiter can fall back and conceal an outage.
    const response = await fetch(`${env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '')}/ping`, {
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
    });
    if (!response.ok || (await response.json()).result !== 'PONG') {
      throw new Error('Redis health probe failed');
    }

    const latencyMs = Date.now() - start;
    return { status: latencyMs > 2000 ? 'warning' : 'ok', latencyMs };
  } catch (error) {
    logger.warn('Redis health check failed', {
      service: 'health',
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

// ── Stripe Payments ──────────────────────────────────────────────────

async function checkPayments(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return { status: 'error', latencyMs: Date.now() - start };
    }

    const response = await Promise.race([
      fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stripe timeout')), SERVICE_TIMEOUT_MS)
      ),
    ]);

    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: latencyMs > 3000 ? 'warning' : 'ok', latencyMs };
    }

    if (response.status === 401) {
      logger.error('Stripe health check: invalid API key', { service: 'health' });
      return { status: 'error', latencyMs };
    }

    logger.warn('Stripe health check returned non-200', {
      service: 'health', status: response.status, latencyMs,
    });
    return { status: 'warning', latencyMs };
  } catch (error) {
    logger.error('Stripe health check failed', error, { service: 'health' });
    return { status: 'error', latencyMs: Date.now() - start };
  }
}
