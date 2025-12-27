import { readdirSync } from 'fs';
import { join } from 'path';

// Get all local migration files
const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const localFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => f.replace('.sql', ''))
  .sort();

// Extract version numbers (format: YYYYMMDDHHMMSS or YYYYMMDD)
const extractVersion = (filename: string): string => {
  const match = filename.match(/^(\d{8,14})/);
  return match ? match[1] : filename;
};

const localVersions = localFiles.map((f) => ({
  filename: f,
  version: extractVersion(f),
}));

// Applied migrations from Supabase (from the list_migrations call)
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

// Find missing migrations
const missing = localVersions.filter(
  (local) => !appliedVersions.includes(local.version)
);

console.log('\n=== Pending Migrations ===\n');
if (missing.length === 0) {
  console.log('✅ All migrations have been applied!');
} else {
  console.log(`Found ${missing.length} pending migration(s):\n`);
  missing.forEach((m) => {
    console.log(`  ❌ ${m.filename}.sql (version: ${m.version})`);
  });
}

console.log(`\nTotal local migrations: ${localFiles.length}`);
console.log(`Total applied migrations: ${appliedVersions.length}`);
console.log(`Pending migrations: ${missing.length}\n`);

