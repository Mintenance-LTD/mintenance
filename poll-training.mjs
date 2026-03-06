/**
 * Poll training job completion.
 * Since MINTENANCE_CALLBACK_URL is localhost (unreachable from Modal), we poll
 * Supabase Storage directly — when the LoRA adapter files appear there,
 * we mark the job as completed in knowledge_distillation_jobs ourselves.
 *
 * Usage: node poll-training.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JOB_ID       = 'kd-1772411881368-vlm_distillation';

// The training worker uploads adapter to: training-data/vlm-adapters/{jobId}/lora-adapter/
// (see modal_train.py config.output_adapter_path = f"vlm-adapters/{job_id}/lora-adapter")
const ADAPTER_BUCKET = 'training-data';
const ADAPTER_PREFIX = `vlm-adapters/${JOB_ID}/lora-adapter`;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('Polling for training completion...');
console.log(`Job ID       : ${JOB_ID}`);
console.log(`Adapter path : ${ADAPTER_BUCKET}/${ADAPTER_PREFIX}`);
console.log(`(Modal cold start + A100 training = ~30-90 min total)\n`);

const start = Date.now();
const MAX_WAIT_MS = 7_200_000; // 2h

while (Date.now() - start < MAX_WAIT_MS) {
  await new Promise(r => setTimeout(r, 30_000));
  const elapsed = Math.round((Date.now() - start) / 1000);

  // First check if DB was updated (maybe callback worked or we already marked it)
  const { data: job } = await sb
    .from('knowledge_distillation_jobs')
    .select('status, output_model_path, metrics_jsonb, error_message, completed_at')
    .eq('id', JOB_ID)
    .single();

  if (job?.status === 'completed') {
    console.log(`\n✓ Training COMPLETE (DB already updated)`);
    console.log(`  Adapter: ${job.output_model_path}`);
    console.log(`  Metrics: ${JSON.stringify(job.metrics_jsonb ?? {})}`);
    process.exit(0);
  }

  if (job?.status === 'failed') {
    console.error(`\n✗ Training FAILED: ${job.error_message}`);
    process.exit(1);
  }

  // Check Supabase Storage for adapter file presence
  const { data: files, error: storageError } = await sb.storage
    .from(ADAPTER_BUCKET)
    .list(ADAPTER_PREFIX, { limit: 10 });

  if (!storageError && files && files.length > 0) {
    // Adapter files appeared — training completed but callback was skipped (no callback URL)
    // Manually mark the job as completed
    console.log(`\n  [${elapsed}s] Adapter files found in Storage (${files.length} files):`);
    for (const f of files) console.log(`    - ${f.name} (${f.metadata?.size ?? '?'} bytes)`);

    const adapterPath = `${ADAPTER_BUCKET}/${ADAPTER_PREFIX}`;
    const { error: updateError } = await sb
      .from('knowledge_distillation_jobs')
      .update({
        status:             'completed',
        completed_at:       new Date().toISOString(),
        output_model_path:  adapterPath,
        metrics_jsonb:      { note: 'callback skipped — manually completed via poll-training.mjs' },
      })
      .eq('id', JOB_ID);

    if (updateError) {
      console.error('  Failed to update DB:', updateError.message);
    } else {
      console.log(`\n══════════════════════════════════════════════════════════════════════`);
      console.log(` Training COMPLETE`);
      console.log(`══════════════════════════════════════════════════════════════════════`);
      console.log(`  Job ID       : ${JOB_ID}`);
      console.log(`  Adapter path : ${adapterPath}`);
      console.log(`  Completed at : ${new Date().toISOString()}`);
      console.log(`\n  Redeploy inference endpoint to pick up new adapter:`);
      console.log(`    python -m modal deploy vlm_training_worker/modal_inference.py`);
      process.exit(0);
    }
  } else {
    // No adapter files yet — still training
    const storageMsg = storageError ? `storage error: ${storageError.message}` : `no adapter files yet`;
    console.log(`  [${elapsed}s] status=${job?.status ?? 'unknown'} — ${storageMsg}`);
  }
}

console.log('\nPolling timed out after 2h. Check Modal dashboard for job status.');
console.log(`Job ID: ${JOB_ID}`);
