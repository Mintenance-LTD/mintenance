#!/usr/bin/env node
/**
 * Phase 2b: Re-sign all Job-storage public URLs with 1-year signed URLs.
 *
 * Reads `storage_path` (populated by migration
 * 20260416000001_job_storage_phase2b_storage_path.sql), calls
 * `createSignedUrl(path, 365d)` for each row, and updates the URL column.
 *
 * After this script succeeds, it's safe to flip `Job-storage.public = false`
 * via migration 20260416000002_job_storage_flip_private.sql.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/backfill-signed-urls.mjs [--dry-run]
 *
 * Flags:
 *   --dry-run   Show what would be signed without updating the DB.
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'Job-storage';
const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

// ---------------------------------------------------------------------------
// Tables to process — each entry describes where to find paths + URLs.
// ---------------------------------------------------------------------------

const TABLES = [
  {
    table: 'job_photos_metadata',
    pathColumn: 'storage_path',
    urlColumn: 'photo_url',
  },
  {
    table: 'assessment_images',
    pathColumn: 'storage_path',
    urlColumn: 'image_url',
  },
  {
    table: 'property_room_photos',
    pathColumn: 'storage_path',
    urlColumn: 'photo_url',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let totalSigned = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { table, pathColumn, urlColumn } of TABLES) {
    console.log(`\n── ${table}.${urlColumn} ──`);

    // Fetch rows that have a storage_path but still hold a public URL.
    // Rows already holding a signed URL (token= parameter) are skipped.
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, ${pathColumn}, ${urlColumn}`)
      .not(pathColumn, 'is', null)
      .not(pathColumn, 'eq', '');

    if (error) {
      console.error(`  ERROR fetching ${table}:`, error.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log('  No rows with storage_path — skipping.');
      continue;
    }

    console.log(`  Found ${rows.length} row(s) with storage_path.`);

    for (const row of rows) {
      const path = row[pathColumn];
      const currentUrl = row[urlColumn];

      // Skip if already signed (contains token= query parameter)
      if (currentUrl && currentUrl.includes('token=')) {
        console.log(`  [skip] ${row.id} — already signed.`);
        totalSkipped++;
        continue;
      }

      // Sign the path
      const { data: signData, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, TTL_SECONDS);

      if (signError || !signData?.signedUrl) {
        console.error(`  [FAIL] ${row.id} — sign error:`, signError?.message ?? 'no signedUrl');
        totalFailed++;
        continue;
      }

      if (args['dry-run']) {
        console.log(`  [dry-run] ${row.id}`);
        console.log(`    path:       ${path}`);
        console.log(`    old URL:    ${currentUrl?.slice(0, 80)}...`);
        console.log(`    signed URL: ${signData.signedUrl.slice(0, 80)}...`);
        totalSigned++;
        continue;
      }

      // Update the URL column with the signed URL
      const { error: updateError } = await supabase
        .from(table)
        .update({ [urlColumn]: signData.signedUrl })
        .eq('id', row.id);

      if (updateError) {
        console.error(`  [FAIL] ${row.id} — update error:`, updateError.message);
        totalFailed++;
        continue;
      }

      console.log(`  [OK] ${row.id} — signed (${path.slice(0, 60)})`);
      totalSigned++;
    }
  }

  console.log('\n── Summary ──');
  console.log(`  Signed:  ${totalSigned}`);
  console.log(`  Skipped: ${totalSkipped} (already signed)`);
  console.log(`  Failed:  ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\n⚠️  Some rows failed to sign. Do NOT flip the bucket until all rows are signed.');
    process.exit(1);
  }

  if (args['dry-run']) {
    console.log('\n[dry-run] No rows were updated. Remove --dry-run to apply.');
  } else if (totalSigned > 0) {
    console.log('\n✅ All rows signed. Safe to flip the bucket:');
    console.log('   Run: supabase migration apply 20260416000002_job_storage_flip_private');
    console.log('   Or via MCP: apply_migration(name="job_storage_flip_private", query=<see file>)');
  } else {
    console.log('\nNothing to do — all rows already signed or no rows found.');
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
