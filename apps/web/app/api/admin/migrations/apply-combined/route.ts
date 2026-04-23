import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';

/**
 * POST /api/admin/migrations/apply-combined
 * Prepare the combined platform enhancements migration SQL
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // Same threat model as /api/admin/migrations/apply — require fresh
    // MFA proof before surfacing any migration metadata to the caller.
    requireMfaVerifiedWithinMinutes: 15,
  },
  async () => {
    const filePath = join(
      process.cwd(),
      'supabase',
      'migrations',
      '20250228000000_combined_platform_enhancements.sql'
    );

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

    logger.info('Combined migration SQL prepared', {
      service: 'migrations',
      sqlLength: sql.length,
    });

    return NextResponse.json({
      message: 'Combined migration SQL ready',
      sqlLength: sql.length,
      fileName: '20250228000000_combined_platform_enhancements.sql',
      instructions: [
        'Run via Supabase CLI: supabase db push',
        'Or open the file directly: supabase/migrations/20250228000000_combined_platform_enhancements.sql',
        'Or paste the file contents into Supabase Dashboard > SQL Editor',
      ],
    });
  }
);
