import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Get all local migration files
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const localFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({
    filename: f,
    path: join(migrationsDir, f),
    version: f.match(/^(\d{8,14})/)?.[1] || '',
  }))
  .filter((f) => f.version)
  .sort((a, b) => a.version.localeCompare(b.version));

// Applied migrations
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
  '20241220000000', // Just applied
];

// Find pending migrations
const pending = localFiles.filter((f) => !appliedVersions.includes(f.version));

// Extract migration name from filename
const getMigrationName = (filename: string): string => {
  return filename.replace(/^\d{8,14}_/, '').replace(/\.sql$/, '');
};

console.log(`\n📋 Found ${pending.length} pending migrations\n`);
console.log('Ready to apply in batches. Use Supabase MCP apply_migration tool.\n');
console.log('Batch 1 (first 15 migrations):\n');

// Display first batch
pending.slice(0, 15).forEach((m, i) => {
  console.log(`${i + 1}. ${m.filename}`);
  console.log(`   Version: ${m.version}`);
  console.log(`   Name: ${getMigrationName(m.filename)}\n`);
});

