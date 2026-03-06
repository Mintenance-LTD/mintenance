import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';

const applyMigrationSchema = z.object({
  migrationFile: z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_\-]+\.sql$/, 'Migration file must be a valid .sql filename (no path separators)'),
});

/**
 * POST /api/admin/migrations/apply
 * Prepare SQL migration for execution
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const body = await request.json();
    const parsed = applyMigrationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('migrationFile must be a valid .sql filename (no path separators)');
    }

    const { migrationFile } = parsed.data;
    const filePath = join(process.cwd(), 'supabase', 'migrations', migrationFile);

    let sql: string;
    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read migration file', {
        service: 'migrations',
        file: migrationFile,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new NotFoundError('Migration file not found');
    }

    logger.info('Migration SQL prepared', { service: 'migrations', file: migrationFile, sqlLength: sql.length });

    // SECURITY FIX: Never return raw SQL in response — it leaks the full DB schema
    // to any compromised admin account. Admins must execute via Supabase Dashboard.
    return NextResponse.json({
      success: true,
      file: migrationFile,
      message: 'Migration file validated. Copy SQL from Supabase Dashboard to execute.',
    });
  }
);
