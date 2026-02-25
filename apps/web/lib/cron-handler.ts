/**
 * Cron Route Handler Wrapper
 *
 * Eliminates boilerplate from cron route handlers by providing:
 * - Rate limiting (1 request/minute)
 * - Cron secret authentication
 * - Execution logging to cron_job_runs table
 * - Consistent error handling
 * - Duration tracking
 *
 * Usage:
 *   import { withCronHandler } from '@/lib/cron-handler';
 *
 *   export const GET = withCronHandler('payment-setup-reminders', async () => {
 *     const results = await SomeService.process();
 *     return { sent: results.sent, failed: results.failed };
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { serverSupabase } from '@/lib/api/supabaseServer';

// ── Types ────────────────────────────────────────────────────────────

// Internal type for serialized result storage. Uses `any` intentionally since
// service methods return typed interfaces that get JSON-serialized for storage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CronResult = Record<string, any>;

interface CronHandlerConfig {
  /** Max requests per minute. Defaults to 1 (standard cron protection). */
  maxRequests?: number;
  /** Rate limit window in ms. Defaults to 60000 (1 minute). */
  windowMs?: number;
}

// ── Execution Logging ────────────────────────────────────────────────

async function startCronRun(jobName: string): Promise<string | null> {
  try {
    const { data, error } = await serverSupabase
      .from('cron_job_runs')
      .insert({
        job_name: jobName,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.warn('Failed to log cron start — proceeding without tracking', {
        service: 'cron-handler',
        jobName,
        error: error.message,
      });
      return null;
    }

    return data.id;
  } catch (error) {
    // Non-fatal: don't let logging failures block cron execution
    logger.warn('Failed to log cron start — proceeding without tracking', {
      service: 'cron-handler',
      jobName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function completeCronRun(
  runId: string | null,
  jobName: string,
  status: 'success' | 'failed',
  durationMs: number,
  result?: CronResult | null,
  errorMessage?: string
): Promise<void> {
  if (!runId) return;

  try {
    await serverSupabase
      .from('cron_job_runs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        records_processed: extractRecordCount(result),
        error_message: errorMessage?.substring(0, 1000) || null,
        metadata: result ? JSON.parse(JSON.stringify(result)) : null,
      })
      .eq('id', runId);
  } catch (error) {
    // Non-fatal: log but don't throw
    logger.warn('Failed to log cron completion', {
      service: 'cron-handler',
      jobName,
      runId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Extract a meaningful record count from the cron result.
 * Looks for common patterns: sent, processed, checked, evaluated, total
 */
function extractRecordCount(result?: CronResult | null): number | null {
  if (!result) return null;

  // Check common count field names
  const countFields = [
    'sent', 'processed', 'checked', 'evaluated', 'total',
    'released', 'matched', 'records', 'count',
  ];

  for (const field of countFields) {
    if (typeof result[field] === 'number') {
      return result[field] as number;
    }
  }

  // Check nested results object
  if (result.results && typeof result.results === 'object') {
    for (const field of countFields) {
      const nested = result.results as Record<string, unknown>;
      if (typeof nested[field] === 'number') {
        return nested[field] as number;
      }
    }
  }

  return null;
}

// ── Main Wrapper ─────────────────────────────────────────────────────

export function withCronHandler(
  jobName: string,
  handler: () => Promise<CronResult>,
  config?: CronHandlerConfig
) {
  const maxRequests = config?.maxRequests ?? 1;
  const windowMs = config?.windowMs ?? 60000;

  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${ip}:cron:${jobName}`,
      windowMs,
      maxRequests,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // 2. Cron secret authentication
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    // 3. Start execution tracking
    const startTime = Date.now();
    const runId = await startCronRun(jobName);

    logger.info(`Starting cron job: ${jobName}`, {
      service: jobName,
      runId,
    });

    try {
      // 4. Execute the handler
      const result = await handler();
      const durationMs = Date.now() - startTime;

      // 5. Log success
      await completeCronRun(runId, jobName, 'success', durationMs, result);

      logger.info(`Cron job completed: ${jobName}`, {
        service: jobName,
        runId,
        durationMs,
        result,
      });

      return NextResponse.json({ success: true, results: result });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 6. Log failure
      await completeCronRun(runId, jobName, 'failed', durationMs, null, errorMessage);

      logger.error(`Cron job failed: ${jobName}`, error, {
        service: jobName,
        runId,
        durationMs,
      });

      return handleAPIError(error);
    }
  };
}
