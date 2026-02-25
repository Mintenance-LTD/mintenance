import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerError('Supabase configuration missing');
    }

    logger.info('Migration SQL prepared', { service: 'migrations', file: migrationFile, sqlLength: sql.length });

    return NextResponse.json({
      message: 'Migration SQL prepared',
      file: migrationFile,
      sql,
      instructions: 'Execute this SQL in Supabase Dashboard SQL Editor or use Supabase CLI: supabase db push',
    });
  }
);
