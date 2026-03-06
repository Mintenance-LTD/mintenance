/**
 * Re-trigger VLM training — run 2.
 *
 * The first run (kd-1772411881368-vlm_distillation) trained successfully but the
 * adapter_model.safetensors upload failed with 400 because the training-data bucket
 * defaulted to a 5 MB fileSizeLimit. The adapter (~37 MB at rank=8) exceeded it.
 *
 * Fix applied before this run:
 *   1. node update-bucket-limit.mjs  — sets fileSizeLimit to 50 MB on the bucket
 *   2. modal deploy vlm_training_worker/modal_train.py  — now also saves to Modal Volume
 *
 * Usage: node trigger-training-v2.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_URL   = process.env.VLM_TRAINING_WEBHOOK_URL;

// JSONL is already in Storage from the first run — reuse it
const TIMESTAMP     = Date.now();
const JOB_ID        = `kd-${TIMESTAMP}-vlm_distillation`;
const STORAGE_PATH  = 'training-data/vlm-training/kd-1772411881368-vlm_distillation/training_data.jsonl';
const MODEL_VERSION = `mint-vlm-${TIMESTAMP}`;
const SAMPLES_COUNT = 60;

// LoRA rank=8 → adapter ~37 MB — under 50 MB bucket limit after update-bucket-limit.mjs
const LORA_CONFIG = { loraRank: 8, loraAlpha: 16, batchSize: 2, epochs: 3, learningRate: 0.0002 };

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('VLM Training Run 2');
console.log('==================');
console.log(`Job ID       : ${JOB_ID}`);
console.log(`JSONL path   : ${STORAGE_PATH} (reused from run 1)`);
console.log(`LoRA rank    : ${LORA_CONFIG.loraRank} (adapter ~37 MB, bucket limit 50 MB)`);
console.log(`Webhook      : ${WEBHOOK_URL}`);
console.log('');

// 1. Verify JSONL exists in Storage
console.log('Checking JSONL exists in Storage...');
const { data: files, error: listErr } = await sb.storage
  .from('training-data')
  .list('vlm-training/kd-1772411881368-vlm_distillation', { limit: 5 });

if (listErr || !files?.length) {
  console.error('JSONL not found in Storage:', listErr?.message ?? 'empty directory');
  process.exit(1);
}
const jsonlFile = files.find(f => f.name === 'training_data.jsonl');
if (!jsonlFile) {
  console.error('training_data.jsonl not found. Files:', files.map(f => f.name).join(', '));
  process.exit(1);
}
console.log(`  ✓ Found training_data.jsonl (${(jsonlFile.metadata?.size / 1024 / 1024).toFixed(1)} MB)`);

// 2. Insert job record
console.log('\nInserting knowledge_distillation_jobs record...');
const { error: insertError } = await sb.from('knowledge_distillation_jobs').insert({
  id:                     JOB_ID,
  job_type:               'vlm_distillation',
  status:                 'pending',
  config:                 LORA_CONFIG,
  triggered_by:           'manual',
  base_model_version:     'qwen2.5-vl-3b',
  model_version:          MODEL_VERSION,
  training_samples_count: SAMPLES_COUNT,
  notes:                  `Run 2: re-training with bucket fileSizeLimit=50MB fix. Reuses JSONL from run 1 (${SAMPLES_COUNT} GPT-4o labeled Roboflow images).`,
  created_at:             new Date().toISOString(),
  updated_at:             new Date().toISOString(),
});

if (insertError) {
  console.error('Insert failed:', insertError.message);
  process.exit(1);
}
console.log(`  ✓ Job ID: ${JOB_ID}`);

// 3. Trigger webhook
console.log('\nTriggering Modal training webhook...');
const payload = {
  jobId:        JOB_ID,
  modelVersion: MODEL_VERSION,
  storagePath:  STORAGE_PATH,
  samplesCount: SAMPLES_COUNT,
  config:       LORA_CONFIG,
};

const res = await fetch(WEBHOOK_URL, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(payload),
  signal:  AbortSignal.timeout(30_000),
});
const body = await res.text();
if (!res.ok) {
  console.error('Webhook error', res.status, body.slice(0, 200));
  process.exit(1);
}
console.log('  ✓ Accepted by Modal:', body.slice(0, 200));

// 4. Poll
console.log('\nPolling for training completion (up to 2h, every 30s)...');
console.log('  Training runs on Modal A100-40GB (~20-40 min — model already cached)');
console.log('  Press Ctrl+C to stop polling — training continues on Modal\n');

const ADAPTER_BUCKET = 'training-data';
const ADAPTER_PREFIX = `vlm-adapters/${JOB_ID}/lora-adapter`;
const start = Date.now();

while (Date.now() - start < 7_200_000) {
  await new Promise(r => setTimeout(r, 30_000));
  const elapsed = Math.round((Date.now() - start) / 1000);

  // Check DB first
  const { data: job } = await sb
    .from('knowledge_distillation_jobs')
    .select('status, output_model_path, metrics_jsonb, error_message, completed_at')
    .eq('id', JOB_ID)
    .single();

  if (job?.status === 'completed') {
    console.log(`\n✓ Training COMPLETE (callback received)`);
    console.log(`  Adapter : ${job.output_model_path}`);
    const m = job.metrics_jsonb;
    if (m) {
      console.log(`  Loss    : train=${m.finalTrainLoss ?? 'n/a'} eval=${m.finalEvalLoss ?? 'n/a'}`);
      console.log(`  Duration: ${m.durationSeconds ?? 'n/a'}s`);
    }
    process.exit(0);
  }

  if (job?.status === 'failed') {
    console.error(`\n✗ Training FAILED: ${job.error_message}`);
    process.exit(1);
  }

  // Check Storage for adapter files (fallback if callback failed)
  const { data: adapterFiles, error: storageError } = await sb.storage
    .from(ADAPTER_BUCKET)
    .list(ADAPTER_PREFIX, { limit: 20 });

  const safetensorsFile = adapterFiles?.find(f => f.name === 'adapter_model.safetensors');

  if (!storageError && safetensorsFile) {
    const sizeMb = (safetensorsFile.metadata?.size / 1_048_576).toFixed(1);
    console.log(`\n  [${elapsed}s] ✓ adapter_model.safetensors uploaded (${sizeMb} MB)`);
    console.log(`  All adapter files: ${adapterFiles.map(f => f.name).join(', ')}`);

    // Mark job complete manually
    await sb.from('knowledge_distillation_jobs').update({
      status:            'completed',
      completed_at:      new Date().toISOString(),
      output_model_path: `${ADAPTER_BUCKET}/${ADAPTER_PREFIX}`,
      metrics_jsonb:     { note: 'callback skipped — marked complete via trigger-training-v2.mjs' },
    }).eq('id', JOB_ID);

    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log(' Training COMPLETE');
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log(`  Job ID       : ${JOB_ID}`);
    console.log(`  Adapter path : ${ADAPTER_BUCKET}/${ADAPTER_PREFIX}`);
    console.log(`  Completed at : ${new Date().toISOString()}`);
    console.log('\n  Redeploy inference endpoint to pick up new adapter:');
    console.log('    python -m modal deploy vlm_training_worker/modal_inference.py');
    process.exit(0);
  }

  const storageMsg = storageError
    ? `storage error: ${storageError.message}`
    : adapterFiles?.length
      ? `${adapterFiles.length} files (${adapterFiles.map(f => f.name).join(', ')}) — waiting for safetensors`
      : 'no adapter files yet';
  console.log(`  [${elapsed}s] status=${job?.status ?? 'unknown'} — ${storageMsg}`);
}

console.log('\nPolling timed out after 2h. Check Modal dashboard for job status.');
console.log(`Job ID: ${JOB_ID}`);
