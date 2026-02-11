import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for data retention cleanup (Issue 29)
 * Runs the database retention_cleanup function which handles:
 * - Old email history purge (>180 days)
 * - Expired password reset tokens
 * - Old login attempts (>90 days)
 * - Old webhook events (>7 days)
 * - Soft-deleted profile anonymisation (>90 days)
 * Should be called daily.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 1,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } },
      );
    }

    const authError = requireCronAuth(request);
    if (authError) return authError;

    logger.info('Retention cleanup started', { service: 'retention' });

    // Call the database retention cleanup function
    const { error: rpcError } = await serverSupabase.rpc('run_retention_cleanup');

    if (rpcError) {
      // Fallback: run cleanup queries directly if the RPC function doesn't exist
      logger.warn('RPC run_retention_cleanup failed, running cleanup directly', {
        service: 'retention',
        error: rpcError.message,
      });

      // Clean expired password reset tokens
      await serverSupabase
        .from('password_reset_tokens')
        .delete()
        .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Clean old login attempts (>90 days)
      await serverSupabase
        .from('login_attempts')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    }

    logger.info('Retention cleanup completed', { service: 'retention' });

    return NextResponse.json({ message: 'Retention cleanup complete' });
  } catch (error) {
    return handleAPIError(error);
  }
}
