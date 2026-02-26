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
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const filePath = join(process.cwd(), 'supabase', 'migrations', '20250228000000_combined_platform_enhancements.sql');

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

    logger.info('Combined migration SQL prepared', { service: 'migrations', sqlLength: sql.length });

    return NextResponse.json({
      message: 'Combined migration SQL ready',
      sql,
      instructions: [
        'Option 1: Copy this SQL and paste it into Supabase Dashboard > SQL Editor',
        'Option 2: Use Supabase CLI: supabase db push',
        'Option 3: The migration files are in supabase/migrations/ directory',
      ],
    });
  }
);
