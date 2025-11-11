import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * Apply the combined platform enhancements migration
 * This reads the combined SQL file and returns it for execution
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
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
    logger.error('Error preparing migration', error, { service: 'migrations' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

