import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Apply the combined platform enhancements migration
 * This reads the combined SQL file and returns it for execution
 */
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Read the combined migration file
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const filePath = join(migrationsDir, '20250228000000_combined_platform_enhancements.sql');
    
    let sql: string;
    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read combined migration file', {
        service: 'migrations',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new NotFoundError('Migration file not found');
    }

    // Note: Supabase JS client doesn't support raw SQL execution
    // The SQL needs to be executed via:
    // 1. Supabase Dashboard SQL Editor
    // 2. Supabase CLI (supabase db push)
    // 3. Direct database connection with psql

    logger.info('Combined migration SQL prepared', {
      service: 'migrations',
      sqlLength: sql.length,
    });

    return NextResponse.json({
      message: 'Combined migration SQL ready',
      sql,
      instructions: [
        'Option 1: Copy this SQL and paste it into Supabase Dashboard > SQL Editor',
        'Option 2: Use Supabase CLI: supabase db push',
        'Option 3: The migration files are in supabase/migrations/ directory',
      ],
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

