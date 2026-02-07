const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'MISSING');
  console.error('\nEnsure .env.local is configured or set these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📋 Reading migration file...');

  // Read migration
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20251213000003_budget_visibility_improvements.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration file loaded');
  console.log('📊 Creating exec_sql function...');

  // First, create exec_sql function
  const helperSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  try {
    const { error: helperError } = await supabase.rpc('exec_sql', { sql: helperSQL });

    if (helperError && helperError.message.includes('could not find')) {
      console.log('⚠️  exec_sql function does not exist, cannot create it via RPC');
      console.log('   Please run the following SQL in Supabase SQL Editor:');
      console.log('');
      console.log(helperSQL);
      console.log('');
      console.log('   Then run the budget migration SQL:');
      console.log('');
      console.log(migrationSQL);
      process.exit(1);
    }

    console.log('✅ Helper function created');
    console.log('🔄 Applying budget visibility migration...');

    // Apply migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 New columns added to jobs table:');
    console.log('  - budget_min (for showing range)');
    console.log('  - budget_max (for showing range)');
    console.log('  - show_budget_to_contractors (default: false)');
    console.log('  - require_itemized_bids (default: true)');
    console.log('');
    console.log('📋 New columns added to bids table:');
    console.log('  - has_itemization');
    console.log('  - itemization_quality_score (0-100)');
    console.log('  - materials_breakdown (JSONB)');
    console.log('  - labor_breakdown (JSONB)');
    console.log('  - other_costs_breakdown (JSONB)');
    console.log('  - bid_to_budget_ratio');
    console.log('  - within_typical_range');
    console.log('');
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
