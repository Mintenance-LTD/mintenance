import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for data archival (Issue 58)
 * Moves completed/cancelled jobs older than 12 months to archive schema.
 * Should be called monthly.
 */
export async function GET(request: NextRequest) {
  try {
    requireCronAuth(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `cron:data-archival`,
      windowMs: 3600000,
      maxRequests: 2,
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const monthsThreshold = 12;
    const batchSize = 500;

    // Call the archive function via RPC
    const { data, error } = await serverSupabase.rpc('archive_old_records', {
      months_threshold: monthsThreshold,
      batch_size: batchSize,
    });

    if (error) {
      // Fallback: try direct schema-qualified call
      logger.warn('RPC archive_old_records failed, archival may need manual setup', {
        error: error.message,
      });

      return NextResponse.json({
        success: false,
        message: 'Archival function not available. Run the migration first.',
        error: error.message,
      }, { status: 503 });
    }

    logger.info('Data archival completed', { result: data });

    return NextResponse.json({
      success: true,
      result: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleAPIError(err instanceof Error ? err : new InternalServerError('Archival failed'));
  }
}
