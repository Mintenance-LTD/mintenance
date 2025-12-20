/**
 * Create exec_sql function using direct database connection
 * This uses the Supabase connection string to execute SQL directly
 * 
 * Usage: npx tsx scripts/create-exec-sql-via-direct-connection.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Load environment variables
function loadEnvFile() {
  const envPaths = [
    join(process.cwd(), 'apps', 'web', '.env.local'),
    join(process.cwd(), 'apps', 'web', '.env'),
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      
      console.log(`📄 Loaded environment variables from: ${envPath}\n`);
      return;
    }
  }
  
  console.warn('⚠️  No .env.local file found.\n');
}

loadEnvFile();

// Get database connection string
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Extract project ref from URL (e.g., https://xxxxx.supabase.co -> xxxxx)
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL');
  console.error('   URL format should be: https://[project-ref].supabase.co');
  process.exit(1);
}

// Construct direct database connection string
// Supabase direct connection: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const dbHost = `db.${projectRef}.supabase.co`;
const dbConnectionString = process.env.DATABASE_URL || 
  (dbPassword ? `postgresql://postgres:${dbPassword}@${dbHost}:5432/postgres` : null);

if (!dbConnectionString) {
  console.error('❌ Missing database connection string');
  console.error('   Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local');
  console.error('   Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres');
  process.exit(1);
}

const execSqlFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;

COMMENT ON FUNCTION public.exec_sql(TEXT) IS 'Executes raw SQL for migrations. Use with caution.';
`;

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function via direct database connection...\n');

  const client = new Client({
    connectionString: dbConnectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📝 Creating exec_sql function...');
    await client.query(execSqlFunctionSQL);
    
    console.log('✅ exec_sql function created successfully!\n');
    console.log('🎉 You can now run: npm run migrate:push\n');

  } catch (error) {
    console.error('❌ Error creating exec_sql function:', error);
    console.error('\n📝 Alternative: Create it manually in Supabase Dashboard:\n');
    console.error('   1. Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
    console.error('   2. Copy and paste the SQL above');
    console.error('   3. Click "Run"\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

createExecSqlFunction();

