/**
 * Script to create the exec_sql RPC function in Supabase
 * Run with: npx tsx scripts/create-exec-sql-function.ts
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envPath = join(process.cwd(), 'apps', 'web', '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  const rootEnvPath = join(process.cwd(), '.env.local');
  if (existsSync(rootEnvPath)) {
    config({ path: rootEnvPath });
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...\n');

  const createFunctionSQL = `
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
  `.trim();

  try {
    // Execute via REST API directly since we can't use RPC yet
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql: createFunctionSQL }),
    });

    if (!response.ok) {
      // Function doesn't exist yet, so we need to use Supabase Management API
      // or execute via psql/direct connection
      console.log('⚠️  Cannot create exec_sql via REST API (circular dependency)');
      console.log('📝 Please create it manually in Supabase Dashboard:\n');
      console.log(createFunctionSQL);
      console.log('\nOr use Supabase CLI: supabase db push\n');
      return false;
    }

    console.log('✅ exec_sql function created successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Error creating exec_sql function:', error);
    console.log('\n📝 Please create it manually in Supabase Dashboard SQL Editor:\n');
    console.log(createFunctionSQL);
    return false;
  }
}

createExecSqlFunction();
