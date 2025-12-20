import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * Apply SQL migrations to Supabase
 * This endpoint executes SQL migrations using the Supabase service role
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { migrationFile } = body;

    if (!migrationFile) {
      return NextResponse.json({ error: 'Migration file name is required' }, { status: 400 });
    }

    // Read the migration file
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const filePath = join(migrationsDir, migrationFile);
    
    let sql: string;
    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read migration file', {
        service: 'migrations',
        file: migrationFile,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
    }

    // Execute SQL using Supabase REST API with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Use Supabase REST API to execute SQL via rpc
    // Note: This requires a database function to execute raw SQL
    // For now, we'll return the SQL to be executed manually
    // In production, you'd use Supabase CLI or dashboard

    logger.info('Migration SQL prepared', {
      service: 'migrations',
      file: migrationFile,
      sqlLength: sql.length,
    });

    return NextResponse.json({
      message: 'Migration SQL prepared',
      file: migrationFile,
      sql,
      instructions: 'Execute this SQL in Supabase Dashboard SQL Editor or use Supabase CLI: supabase db push',
    });
  } catch (error) {
    logger.error('Error applying migration', error, { service: 'migrations' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

