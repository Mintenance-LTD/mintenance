/**
 * Update training-data bucket fileSizeLimit to 50 MB.
 * The bucket was created without fileSizeLimit, which defaults to 5 MB in Supabase.
 * adapter_model.safetensors (~37 MB for rank=8) requires at least 40 MB.
 * Usage: node update-bucket-limit.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('Updating training-data bucket fileSizeLimit...');

const { data, error } = await sb.storage.updateBucket('training-data', {
  fileSizeLimit: 52428800,  // 50 MB — project-level max on Supabase free tier
  public: false,
});

if (error) {
  console.error('Failed to update bucket:', error.message);
  process.exit(1);
}

console.log('✓ Bucket updated:', data);
console.log('  fileSizeLimit: 50 MB (52,428,800 bytes)');
console.log('\nNow re-trigger training — adapter_model.safetensors (~37 MB) should upload successfully.');
