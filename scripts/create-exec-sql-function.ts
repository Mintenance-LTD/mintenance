/**
 * Create exec_sql function in Supabase
 * This must be run first before applying migrations
 * 
 * Usage: npx tsx scripts/create-exec-sql-function.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local files
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
  
  console.warn('⚠️  No .env.local file found. Using system environment variables.\n');
}

// Load environment variables first
loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Expected in: apps/web/.env.local or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function in Supabase...\n');

  const execSqlFunctionSQL = `
-- Create exec_sql helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.exec_sql(TEXT) IS 'Executes raw SQL for migrations. Use with caution.';
  `;

  try {
    // Try to execute via REST API directly
    console.log('📡 Attempting to create function via Supabase REST API...\n');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql: execSqlFunctionSQL }),
    });

    if (response.ok) {
      console.log('✅ exec_sql function created successfully via RPC!\n');
      return true;
    }

    // If that doesn't work, try using pg_rest or direct connection
    console.log('⚠️  RPC method failed. Trying alternative approach...\n');

    // Use Supabase's management API if available
    const mgmtResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/exec-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql: execSqlFunctionSQL }),
    });

    if (mgmtResponse.ok) {
      console.log('✅ exec_sql function created successfully via Edge Function!\n');
      return true;
    }

    // If all automated methods fail, provide manual instructions
    console.error('❌ Could not create exec_sql function automatically.\n');
    console.error('📝 Please create it manually in Supabase Dashboard:\n');
    console.error('   1. Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
    console.error('   2. Copy and paste the following SQL:\n');
    console.error(execSqlFunctionSQL);
    console.error('\n   3. Click "Run" to execute\n');
    
    return false;

  } catch (error) {
    console.error('❌ Error creating exec_sql function:', error);
    console.error('\n📝 Please create it manually in Supabase Dashboard:\n');
    console.error('   1. Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
    console.error('   2. Copy and paste the following SQL:\n');
    console.error(execSqlFunctionSQL);
    console.error('\n   3. Click "Run" to execute\n');
    
    return false;
  }
}

createExecSqlFunction()
  .then(success => {
    if (success) {
      console.log('🎉 Setup complete! You can now run: npx tsx scripts/push-all-migrations-to-supabase.ts\n');
      process.exit(0);
    } else {
      console.log('⚠️  Please create the function manually, then run: npx tsx scripts/push-all-migrations-to-supabase.ts\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

