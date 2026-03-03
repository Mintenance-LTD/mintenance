/**
 * Resume training for an already-uploaded JSONL.
 * Inserts the job record and POSTs to the Modal webhook.
 * Usage: node trigger-training.mjs
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

// From the previous upload run
// NOTE: storagePath must be bucket/path so modal_train.py _supabase_signed_url() splits correctly
const JOB_ID       = 'kd-1772411881368-vlm_distillation';
const STORAGE_PATH = 'training-data/vlm-training/kd-1772411881368-vlm_distillation/training_data.jsonl';
const MODEL_VERSION  = 'mint-vlm-1772411881368';
const SAMPLES_COUNT  = 60;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('Job ID:', JOB_ID);
console.log('Storage path:', STORAGE_PATH);
console.log('Webhook:', WEBHOOK_URL);
console.log('');

// 1. Insert job record
console.log('Phase 4: Creating knowledge_distillation_jobs record...');
const { error: insertError } = await sb.from('knowledge_distillation_jobs').insert({
  id:                     JOB_ID,
  job_type:               'vlm_distillation',
  status:                 'pending',
  config:                 { loraRank: 16, loraAlpha: 32, batchSize: 2, epochs: 3, learningRate: 0.0002 },
  triggered_by:           'manual',
  base_model_version:     'qwen2.5-vl-3b',
  model_version:          MODEL_VERSION,
  training_samples_count: SAMPLES_COUNT,
  notes:                  `Seeded from Roboflow building-defect dataset (${SAMPLES_COUNT} GPT-4o labeled images)`,
  created_at:             new Date().toISOString(),
  updated_at:             new Date().toISOString(),
});

if (insertError) {
  if (insertError.message.includes('duplicate') || insertError.code === '23505') {
    console.log('  Job record already exists — continuing with webhook trigger.');
  } else {
    console.error('  Insert failed:', insertError.message);
    process.exit(1);
  }
} else {
  console.log(`  ✓ Job ID: ${JOB_ID}`);
}

// 2. Trigger webhook
console.log('\nPhase 5: Triggering Modal training webhook...');
const payload = {
  jobId:        JOB_ID,
  modelVersion: MODEL_VERSION,
  storagePath:  STORAGE_PATH,
  samplesCount: SAMPLES_COUNT,
  config:       { loraRank: 16, loraAlpha: 32, batchSize: 2, epochs: 3, learningRate: 0.0002 },
};

const res = await fetch(WEBHOOK_URL, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(payload),
  signal:  AbortSignal.timeout(30_000),
});
const body = await res.text();
if (!res.ok) {
  console.error('  Webhook error', res.status, body.slice(0, 200));
  process.exit(1);
}
console.log('  ✓ Accepted by Modal:', body.slice(0, 200));

// 3. Poll
console.log('\nPhase 6: Polling for training completion (up to 2h, every 30s)...');
console.log('  Training runs on Modal A100-40GB (~20-60 min for 60 samples)');
console.log('  Press Ctrl+C to stop polling — training continues on Modal\n');

const start = Date.now();
while (Date.now() - start < 7_200_000) {
  await new Promise(r => setTimeout(r, 30_000));
  const { data, error } = await sb
    .from('knowledge_distillation_jobs')
    .select('status, metrics_jsonb, output_model_path, error_message, completed_at')
    .eq('id', JOB_ID)
    .single();

  if (error) { console.warn('  DB poll error:', error.message); continue; }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`  [${elapsed}s] status=${data.status}`);

  if (data.status === 'completed') {
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log(' Training COMPLETE');
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log(`  Adapter path : ${data.output_model_path}`);
    console.log(`  Completed at : ${data.completed_at}`);
    const m = data.metrics_jsonb;
    if (m) {
      console.log(`  Train loss   : ${m.finalTrainLoss ?? 'n/a'}`);
      console.log(`  Eval loss    : ${m.finalEvalLoss ?? 'n/a'}`);
      console.log(`  Duration     : ${m.durationSeconds ?? 'n/a'}s`);
    }
    console.log('\n  Redeploy inference endpoint to pick up new adapter:');
    console.log('    python -m modal deploy vlm_training_worker/modal_inference.py');
    process.exit(0);
  }

  if (data.status === 'failed') {
    console.error('\n  Training FAILED:', data.error_message);
    process.exit(1);
  }
}

console.log('\n  Polling timed out — check job in Supabase or Modal dashboard.');
console.log(`  Job ID: ${JOB_ID}`);
