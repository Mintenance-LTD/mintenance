/**
 * Verify if stripe_connect_account_id column exists
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envPath = join(process.cwd(), 'apps', 'web', '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyMigration() {
  console.log('🔍 Verifying migration status...\n');
  
  try {
    // Try to query the column
    const { data, error } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Migration NOT applied - column does not exist');
        console.log('   Error:', error.message);
        console.log('\n📝 Migration needs to be applied using:');
        console.log('   1. Supabase MCP apply_migration tool');
        console.log('   2. Supabase Dashboard SQL Editor');
        console.log('   3. Supabase CLI: supabase db push');
        return false;
      }
      throw error;
    }
    
    console.log('✅ Migration already applied - column exists!');
    console.log('   Sample data:', data);
    return true;
  } catch (error) {
    console.error('❌ Error verifying migration:', (error as Error).message);
    return false;
  }
}

verifyMigration().then(success => {
  process.exit(success ? 0 : 1);
});

