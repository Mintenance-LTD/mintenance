import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.SUPABASE_PROJECT_ID || 'ukrjudtlvapiajkjbcrd';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

// Get all local migration files
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const localFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({
    filename: f,
    path: join(migrationsDir, f),
    version: f.match(/^(\d{8,14})/)?.[1] || '',
  }))
  .filter((f) => f.version) // Only files with valid version numbers
  .sort((a, b) => a.version.localeCompare(b.version)); // Sort chronologically

// Applied migrations from Supabase
const appliedVersions = [
  '20241208000001',
  '20250101000000',
  '20250101000001',
  '20250101000003',
  '20250106000001',
  '20250107000002',
  '20250108000001',
  '20250108000002',
  '20250108000003',
  '20250108000004',
  '20250111000001',
  '20250111000002',
  '20250120000001',
  '20250120000002',
  '20251209093020',
  '20251209093024',
  '20251209093029',
  '20251209162223',
  '20251209162232',
  '20251209165520',
  '20251213114311',
  '20251213114342',
  '20251213133247',
  '20251217100523',
  '20251217100557',
  '20251217100650',
  '20251217103855',
  '20251217103924',
  '20251217104002',
  '20251217104322',
  '20251217111126',
  '20251217111219',
  '20251217111310',
  '20251217111416',
  '20251217111515',
  '20251217111842',
  '20251217112225',
  '20251217112817',
  '20251217113051',
  '20251217113144',
  '20251217113503',
  '20251217113549',
  '20251217113721',
  '20251217114006',
  '20251217114126',
  '20251217192159',
  '20251217211048',
  '20251220182251',
  '20251220182328',
  '20251220182400',
  '20251220182428',
  '20251220224924',
  '20251221192700',
  '20251221201336',
];

// Find pending migrations
const pending = localFiles.filter((f) => !appliedVersions.includes(f.version));

console.log(`\n📋 Found ${pending.length} pending migrations\n`);

if (pending.length === 0) {
  console.log('✅ All migrations are already applied!');
  process.exit(0);
}

// Extract migration name from filename (remove version and .sql extension)
const getMigrationName = (filename: string): string => {
  return filename.replace(/^\d{8,14}_/, '').replace(/\.sql$/, '');
};

// Apply migrations one by one
async function applyMigrations() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  for (let i = 0; i < pending.length; i++) {
    const migration = pending[i];
    const migrationName = getMigrationName(migration.filename);
    
    console.log(`\n[${i + 1}/${pending.length}] Applying: ${migration.filename}`);
    console.log(`   Version: ${migration.version}`);
    console.log(`   Name: ${migrationName}`);
    
    try {
      // Read migration SQL
      const sql = readFileSync(migration.path, 'utf-8');
      
      // Apply migration using Supabase MCP (we'll use direct SQL execution)
      // Note: In a real scenario, you'd use the Supabase MCP apply_migration tool
      // For now, we'll use the Supabase client's RPC or direct SQL
      
      console.log(`   ⏳ Executing SQL...`);
      
      // Execute SQL directly (this is a simplified approach)
      // In production, use Supabase MCP apply_migration tool
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If RPC doesn't exist, try direct query (this won't work for DDL)
        // We need to use the MCP tool instead
        console.log(`   ⚠️  Direct SQL execution not available. Use Supabase MCP apply_migration tool.`);
        console.log(`   📝 Migration SQL preview (first 200 chars):`);
        console.log(`   ${sql.substring(0, 200)}...`);
        break;
      }
      
      console.log(`   ✅ Migration applied successfully`);
    } catch (error) {
      console.error(`   ❌ Error applying migration:`, error);
      console.error(`   Stopping migration process.`);
      process.exit(1);
    }
  }
  
  console.log(`\n✅ All migrations applied successfully!`);
}

// Note: This script is a template. Actual migration application should use
// Supabase MCP apply_migration tool for proper migration tracking.
console.log('\n⚠️  NOTE: This script is a template.');
console.log('   Use Supabase MCP apply_migration tool to apply migrations properly.');
console.log('   This script shows which migrations need to be applied.\n');

// List pending migrations
console.log('Pending migrations to apply:');
pending.forEach((m, i) => {
  console.log(`  ${i + 1}. ${m.filename} (${m.version})`);
});

console.log(`\nTotal: ${pending.length} migrations\n`);

