#!/usr/bin/env node

/**
 * Migration Runner for Mintenance
 * Applies database migrations safely with rollback capabilities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@mintenance/shared';

interface MigrationResult {
  success: boolean;
  migration: string;
  error?: string;
  duration: number;
}

interface MigrationStatus {
  applied: string[];
  pending: string[];
  failed: string[];
}

class MigrationRunner {
  private supabase;
  private migrationsDir: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  }

  /**
   * Get list of migration files
   */
  private getMigrationFiles(): string[] {
    try {
      const files = readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      return files;
    } catch (error) {
      logger.error('Error reading migrations directory:', error);
      return [];
    }
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      // Check if migrations table exists
      const { data: tableExists } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'migrations')
        .eq('table_schema', 'public')
        .single();

      if (!tableExists) {
        logger.info('📋 Creating migrations table...');
        await this.createMigrationsTable();
        return [];
      }

      const { data, error } = await this.supabase
        .from('migrations')
        .select('filename')
        .order('applied_at', { ascending: true });

      if (error) {
        logger.error('Error fetching applied migrations:', error);
        return [];
      }

      return data?.map(row => row.filename) || [];
    } catch (error) {
      logger.error('Error checking applied migrations:', error);
      return [];
    }
  }

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64),
        rollback_sql TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_filename ON public.migrations(filename);
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON public.migrations(applied_at);
    `;

    // Use direct SQL execution instead of RPC
    const { error } = await this.supabase
      .from('migrations')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create it using raw SQL
      const { error: createError } = await this.supabase
        .rpc('exec', { sql: createTableSQL });
      
      if (createError) {
        throw new Error(`Failed to create migrations table: ${createError.message}`);
      }
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const pending = allMigrations.filter(migration => !appliedMigrations.includes(migration));
    const failed: string[] = []; // Would need to track failed migrations

    return {
      applied: appliedMigrations,
      pending,
      failed,
    };
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(filename: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Applying migration: ${filename}`);
      
      // Read migration file
      const migrationPath = join(this.migrationsDir, filename);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Calculate checksum
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(migrationSQL).digest('hex');
      
      // Apply migration
      const { error } = await this.supabase.rpc('exec_sql', { sql: migrationSQL });
      
      if (error) {
        throw new Error(`Migration failed: ${error.message}`);
      }
      
      // Record migration as applied
      const { error: recordError } = await this.supabase
        .from('migrations')
        .insert({
          filename,
          checksum,
          applied_at: new Date().toISOString(),
        });
      
      if (recordError) {
        logger.warn(`⚠️  Migration applied but failed to record: ${recordError.message}`);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Migration applied successfully: ${filename} (${duration}ms)`);
      
      return {
        success: true,
        migration: filename,
        duration,
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`❌ Migration failed: ${filename} - ${errorMessage}`);
      
      return {
        success: false,
        migration: filename,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Apply all pending migrations
   */
  async applyPending(): Promise<MigrationResult[]> {
    const status = await this.getStatus();
    const results: MigrationResult[] = [];
    
    if (status.pending.length === 0) {
      logger.info('✅ No pending migrations');
      return results;
    }
    
    logger.info(`📋 Found ${status.pending.length} pending migrations`);
    
    for (const migration of status.pending) {
      const result = await this.applyMigration(migration);
      results.push(result);
      
      if (!result.success) {
        logger.error(`❌ Stopping migration process due to failure: ${migration}`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Apply specific migration
   */
  async applySpecific(filename: string): Promise<MigrationResult> {
    const status = await this.getStatus();
    
    if (!status.pending.includes(filename)) {
      if (status.applied.includes(filename)) {
        return {
          success: true,
          migration: filename,
          duration: 0,
        };
      } else {
        return {
          success: false,
          migration: filename,
          error: 'Migration file not found',
          duration: 0,
        };
      }
    }
    
    return await this.applyMigration(filename);
  }

  /**
   * Rollback last migration (if supported)
   */
  async rollbackLast(): Promise<MigrationResult> {
    try {
      const { data: lastMigration } = await this.supabase
        .from('migrations')
        .select('filename, rollback_sql')
        .order('applied_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!lastMigration) {
        return {
          success: false,
          migration: 'none',
          error: 'No migrations to rollback',
          duration: 0,
        };
      }
      
      if (!lastMigration.rollback_sql) {
        return {
          success: false,
          migration: lastMigration.filename,
          error: 'No rollback SQL available',
          duration: 0,
        };
      }
      
      logger.info(`🔄 Rolling back migration: ${lastMigration.filename}`);
      
      const { error } = await this.supabase.rpc('exec_sql', { 
        sql: lastMigration.rollback_sql 
      });
      
      if (error) {
        throw new Error(`Rollback failed: ${error.message}`);
      }
      
      // Remove migration record
      await this.supabase
        .from('migrations')
        .delete()
        .eq('filename', lastMigration.filename);
      
      logger.info(`✅ Migration rolled back: ${lastMigration.filename}`);
      
      return {
        success: true,
        migration: lastMigration.filename,
        duration: 0,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        migration: 'unknown',
        error: errorMessage,
        duration: 0,
      };
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const command = process.argv[2];
  const migrationFile = process.argv[3];
  
  try {
    const runner = new MigrationRunner();
    
    switch (command) {
      case 'status':
        const status = await runner.getStatus();
        logger.info('📊 Migration Status:');
        logger.info(`  Applied: ${status.applied.length}`);
        logger.info(`  Pending: ${status.pending.length}`);
        logger.info(`  Failed: ${status.failed.length}`);
        
        if (status.pending.length > 0) {
          logger.info('\n📋 Pending migrations:');
          status.pending.forEach(migration => logger.info(`  - ${migration}`));
        }
        break;
        
      case 'apply':
        if (migrationFile) {
          const result = await runner.applySpecific(migrationFile);
          process.exit(result.success ? 0 : 1);
        } else {
          const results = await runner.applyPending();
          const failed = results.filter(r => !r.success);
          process.exit(failed.length > 0 ? 1 : 0);
        }
        break;
        
      case 'rollback':
        const rollbackResult = await runner.rollbackLast();
        process.exit(rollbackResult.success ? 0 : 1);
        break;
        
      default:
        logger.info('Usage:');
        logger.info('  npm run migrate status          - Show migration status');
        logger.info('  npm run migrate apply           - Apply all pending migrations');
        logger.info('  npm run migrate apply <file>    - Apply specific migration');
        logger.info('  npm run migrate rollback        - Rollback last migration');
        process.exit(1);
    }
    
  } catch (error) {
    logger.error('❌ Migration runner error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { MigrationRunner };
