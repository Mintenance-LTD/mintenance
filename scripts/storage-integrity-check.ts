/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Storage Integrity Check (P1 audit follow-up — 2026-04-30)
 *
 * Walks every image-bearing reference in the database and verifies the
 * underlying Supabase Storage object actually exists. Findings are
 * grouped per source so a developer can decide whether to backfill,
 * re-sign, or drop the orphan rows.
 *
 * Sources covered:
 *   - `job_attachments.file_url` (job photos)
 *   - `assessment_images.image_url` (building-assessment photos)
 *   - `properties.photos` (jsonb array of property photos)
 *
 * Exits 0 if every referenced object resolves; 1 if any orphan rows are
 * found (so this can be wired into CI). The detailed report is written
 * to `scripts/.storage-integrity-report.json` for later inspection.
 *
 * Usage (from repo root):
 *
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt> \
 *   npx tsx scripts/storage-integrity-check.ts
 *
 * Falls back to NEXT_PUBLIC_SUPABASE_URL if SUPABASE_URL is unset, so
 * the standard `apps/web/.env.local` works out-of-the-box for local
 * runs.
 */
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface OrphanRow {
  source: 'job_attachments' | 'assessment_images' | 'properties.photos';
  rowId: string;
  rawValue: string;
  bucket: string | null;
  objectPath: string | null;
  reason: string;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set both before running.'
  );
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/**
 * Best-effort URL → bucket+key parser. Storage URLs come in three flavours:
 *   1. https://<host>/storage/v1/object/public/<bucket>/<key>
 *   2. https://<host>/storage/v1/object/sign/<bucket>/<key>?token=…
 *   3. Bare relative path like `job-photos/abc.jpeg` (treat as Job-storage)
 */
function parseStorageUrl(
  url: string
): { bucket: string; objectPath: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct supabase URL
  const m = trimmed.match(
    /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/
  );
  if (m && m[1] && m[2]) {
    return { bucket: m[1], objectPath: decodeURIComponent(m[2]) };
  }

  // External CDN/HTTP — not in our Supabase storage, skip
  if (/^https?:\/\//i.test(trimmed)) return null;

  // Bare path — assume Job-storage
  return { bucket: 'Job-storage', objectPath: trimmed.replace(/^\/+/, '') };
}

async function objectExists(
  bucket: string,
  objectPath: string
): Promise<boolean> {
  // Use list() against the parent directory and look for the basename.
  // `download(...)` would pull the bytes, which is wasteful for ~1000s
  // of objects.
  const lastSlash = objectPath.lastIndexOf('/');
  const folder = lastSlash > 0 ? objectPath.slice(0, lastSlash) : '';
  const filename = lastSlash > 0 ? objectPath.slice(lastSlash + 1) : objectPath;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000, search: filename });

  if (error) return false;
  return Array.isArray(data) && data.some((entry) => entry.name === filename);
}

async function checkJobAttachments(orphans: OrphanRow[]): Promise<number> {
  const { data, error } = await supabase
    .from('job_attachments')
    .select('id, file_url')
    .limit(5000);
  if (error) {
    console.error('job_attachments query failed:', error.message);
    return 0;
  }
  let checked = 0;
  for (const row of (data ?? []) as Array<{
    id: string;
    file_url: string | null;
  }>) {
    if (!row.file_url) continue;
    checked++;
    const parsed = parseStorageUrl(row.file_url);
    if (!parsed) continue;
    const exists = await objectExists(parsed.bucket, parsed.objectPath);
    if (!exists) {
      orphans.push({
        source: 'job_attachments',
        rowId: row.id,
        rawValue: row.file_url,
        bucket: parsed.bucket,
        objectPath: parsed.objectPath,
        reason: 'object_missing',
      });
    }
  }
  return checked;
}

async function checkAssessmentImages(orphans: OrphanRow[]): Promise<number> {
  const { data, error } = await supabase
    .from('assessment_images')
    .select('id, image_url')
    .limit(5000);
  if (error) {
    console.error('assessment_images query failed:', error.message);
    return 0;
  }
  let checked = 0;
  for (const row of (data ?? []) as Array<{
    id: string;
    image_url: string | null;
  }>) {
    if (!row.image_url) continue;
    checked++;
    const parsed = parseStorageUrl(row.image_url);
    if (!parsed) continue;
    const exists = await objectExists(parsed.bucket, parsed.objectPath);
    if (!exists) {
      orphans.push({
        source: 'assessment_images',
        rowId: row.id,
        rawValue: row.image_url,
        bucket: parsed.bucket,
        objectPath: parsed.objectPath,
        reason: 'object_missing',
      });
    }
  }
  return checked;
}

async function checkPropertyPhotos(orphans: OrphanRow[]): Promise<number> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, photos')
    .not('photos', 'is', null)
    .limit(5000);
  if (error) {
    console.error('properties query failed:', error.message);
    return 0;
  }
  let checked = 0;
  for (const row of (data ?? []) as Array<{
    id: string;
    photos: unknown;
  }>) {
    const photos = Array.isArray(row.photos) ? (row.photos as unknown[]) : [];
    for (const raw of photos) {
      if (typeof raw !== 'string') continue;
      checked++;
      const parsed = parseStorageUrl(raw);
      if (!parsed) continue;
      const exists = await objectExists(parsed.bucket, parsed.objectPath);
      if (!exists) {
        orphans.push({
          source: 'properties.photos',
          rowId: row.id,
          rawValue: raw,
          bucket: parsed.bucket,
          objectPath: parsed.objectPath,
          reason: 'object_missing',
        });
      }
    }
  }
  return checked;
}

async function main() {
  const orphans: OrphanRow[] = [];

  console.log('Checking job_attachments…');
  const jobs = await checkJobAttachments(orphans);
  console.log(`  ${jobs} rows checked.`);

  console.log('Checking assessment_images…');
  const assessments = await checkAssessmentImages(orphans);
  console.log(`  ${assessments} rows checked.`);

  console.log('Checking properties.photos…');
  const properties = await checkPropertyPhotos(orphans);
  console.log(`  ${properties} entries checked.`);

  const reportPath = path.join(
    process.cwd(),
    'scripts',
    '.storage-integrity-report.json'
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: {
          job_attachments_checked: jobs,
          assessment_images_checked: assessments,
          properties_photos_checked: properties,
          orphans_found: orphans.length,
        },
        orphans,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\nReport written to ${reportPath}`);

  if (orphans.length === 0) {
    console.log('All referenced storage objects resolved.');
    process.exit(0);
  }

  console.log(`\n${orphans.length} orphan reference(s) found:`);
  for (const orphan of orphans.slice(0, 25)) {
    console.log(
      `  [${orphan.source}] row=${orphan.rowId} ` +
        `bucket=${orphan.bucket ?? 'n/a'} path=${orphan.objectPath ?? 'n/a'}`
    );
  }
  if (orphans.length > 25) {
    console.log(`  …and ${orphans.length - 25} more (see report).`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('Storage integrity check threw:', err);
  process.exit(2);
});
