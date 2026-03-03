/**
 * One-time migration script: extend knowledge_distillation_jobs.job_type check constraint.
 * Run: node apply-vlm-migration.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('Cannot extract project ref from', SUPABASE_URL);
  process.exit(1);
}

console.log('Project ref:', projectRef);

// Use the Supabase Management API to run SQL
// https://supabase.com/docs/reference/management-api/run-query
const sql = `
ALTER TABLE knowledge_distillation_jobs
  DROP CONSTRAINT IF EXISTS knowledge_distillation_jobs_job_type_check;

ALTER TABLE knowledge_distillation_jobs
  ADD CONSTRAINT knowledge_distillation_jobs_job_type_check
    CHECK (job_type IN ('damage_classifier', 'segmentation_model', 'yolo_enhancement', 'vlm_distillation'));

ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS model_version TEXT;

ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS base_model_version TEXT;

ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS training_samples_count INTEGER;

ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';
`;

// Try via pg query endpoint (Management API)
const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await res.text();
console.log('Management API status:', res.status);
console.log('Response:', body.slice(0, 500));

if (!res.ok) {
  console.error('Management API failed - trying supabase-js RPC fallback...');
  // Fallback: try each ALTER via a custom RPC if one exists
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  // Try using pg_meta endpoint which the Dashboard uses
  const res2 = await fetch(
    `${SUPABASE_URL}/pg/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body2 = await res2.text();
  console.log('pg/query status:', res2.status, 'body:', body2.slice(0, 300));
}
