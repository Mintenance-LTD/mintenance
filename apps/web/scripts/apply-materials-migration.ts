import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying materials migration...');

  try {
    // Read migration file
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20260202120000_add_materials_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (simple split on semicolons)
    // Note: This is a basic approach that works for this migration
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

      // Use rpc to execute raw SQL (requires a postgres function or direct connection)
      // For now, we'll use a simpler approach with the REST API
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // If exec_sql doesn't exist, we need to apply the migration manually
        if (error.message?.includes('exec_sql') || error.code === 'PGRST202') {
          console.log('\n⚠️  exec_sql function not available.');
          console.log('📋 Please apply the migration manually using Supabase SQL Editor:');
          console.log('   1. Go to https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/sql');
          console.log('   2. Copy and paste the contents of:');
          console.log('      supabase/migrations/20260202120000_add_materials_system.sql');
          console.log('   3. Execute the SQL');
          console.log('\n   Then run: npm run seed:materials');
          process.exit(1);
        }

        console.error(`❌ Error executing statement ${i + 1}:`, error);
        throw error;
      }

      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('Ready to run: npm run seed:materials');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
