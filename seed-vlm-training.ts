/**
 * VLM Distillation Pipeline Runner
 * ==================================
 * 1. Select a diverse sample of Roboflow building-defect images
 * 2. Call GPT-4o (teacher) for each image
 * 3. Build Qwen2.5-VL JSONL in the format expected by modal_train.py
 * 4. Upload JSONL to Supabase Storage
 * 5. Create a knowledge_distillation_jobs record
 * 6. POST to the Modal training webhook
 * 7. Poll the job record until training completes
 *
 * Usage:
 *   npx tsx seed-vlm-training.ts              # 60 images, full run
 *   npx tsx seed-vlm-training.ts --count=20   # smaller test run
 *   npx tsx seed-vlm-training.ts --dry-run    # generate JSONL only (no upload/train)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, 'apps/web/.env.local') });

// ─── Config ──────────────────────────────────────────────────────────────────

const DATASET_DIR = 'C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/Building Defect Detection 7.v3i.yolov12/train/images';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? '';
const OPENAI_MODEL   = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
const WEBHOOK_URL    = process.env.VLM_TRAINING_WEBHOOK_URL?.trim() ?? '';
const CALLBACK_SECRET = process.env.MINTENANCE_CALLBACK_SECRET?.trim() ?? '';
const NEXT_APP_URL   = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

const args     = process.argv.slice(2);
const COUNT    = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] ?? '60', 10);
const DRY_RUN  = args.includes('--dry-run');

// ─── System prompts ───────────────────────────────────────────────────────────

/** Full proprietary prompt used for GPT-4o teacher labelling */
const TEACHER_SYSTEM_PROMPT = `You are a UK-qualified building surveyor with 20+ years of experience.
Analyse the provided building photos and return a JSON assessment with this exact structure:

{
  "reasoning": "<string ≤200 words: your step-by-step diagnostic process>",
  "damageAssessment": {
    "damageType": "<string>",
    "severity": "early|midway|full",
    "confidence": <0-100>,
    "location": "<string>",
    "description": "<string>",
    "detectedItems": ["<string>"]
  },
  "safetyHazards": {
    "hazards": [{ "type": "<string>", "severity": "low|medium|high|critical", "location": "<string>", "description": "<string>", "urgency": "immediate|urgent|soon|planned|monitor" }],
    "hasCriticalHazards": <bool>,
    "overallSafetyScore": <0-100>
  },
  "urgency": {
    "urgency": "immediate|urgent|soon|planned|monitor",
    "recommendedActionTimeline": "<string>",
    "reasoning": "<string>",
    "priorityScore": <0-100>
  },
  "homeownerExplanation": {
    "whatIsIt": "<string>",
    "whyItHappened": "<string>",
    "whatToDo": "<string>"
  }
}

Return ONLY valid JSON. No markdown fences.`;

/** Generic training prompt (strips proprietary engineering from student) */
const TRAINING_SYSTEM_PROMPT =
  'You are a building damage assessment AI. Analyse the provided images and return a JSON object ' +
  'with these sections: reasoning, damageAssessment, safetyHazards, urgency, homeownerExplanation. ' +
  'Be precise, safety-conscious, and evidence-based. Return ONLY valid JSON without markdown fences.';

const USER_PROMPT = 'Assess the building damage visible in this photo.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDataUri(filepath: string): string {
  const ext  = path.extname(filepath).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(filepath).toString('base64')}`;
}

function pickDiverseSample(dir: string, n: number): string[] {
  const all = fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => path.join(dir, f));

  // Shuffle deterministically with seeded sort
  const shuffled = all.sort((a, b) => {
    const ha = crypto.createHash('md5').update(a).digest('hex');
    const hb = crypto.createHash('md5').update(b).digest('hex');
    return ha.localeCompare(hb);
  });
  return shuffled.slice(0, n);
}

async function callTeacher(dataUri: string): Promise<{ label: unknown; reasoning: string | null } | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model:   OPENAI_MODEL,
      messages: [
        { role: 'system', content: TEACHER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: dataUri, detail: 'auto' } },
          ],
        },
      ],
      max_tokens:      1200,
      temperature:     0.1,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    console.error('  GPT-4o error:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = await res.json() as Record<string, unknown>;
  const raw  = ((data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content) ?? '{}';

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reasoning = (parsed.reasoning as string | undefined) ?? null;
    // Remove reasoning from the label (it will be added as a <thinking> block separately)
    delete (parsed as Record<string, unknown>).reasoning;
    return { label: parsed, reasoning };
  } catch {
    console.error('  Parse error on GPT-4o output');
    return null;
  }
}

interface QwenMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

function buildQwenConversation(dataUri: string, label: unknown, reasoning: string | null): { messages: QwenMessage[] } {
  const assistantContent = reasoning
    ? `<thinking>\n${reasoning}\n</thinking>\n\n${JSON.stringify(label)}`
    : JSON.stringify(label);

  return {
    messages: [
      { role: 'system', content: TRAINING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
      { role: 'assistant', content: assistantContent },
    ],
  };
}

async function uploadJsonl(
  sb: ReturnType<typeof createClient>,
  jobId: string,
  jsonl: string,
): Promise<string> {
  const objectPath = `vlm-training/${jobId}/training_data.jsonl`;
  const { error } = await sb.storage
    .from('training-data')
    .upload(objectPath, Buffer.from(jsonl, 'utf-8'), {
      contentType: 'application/jsonl',
      upsert: true,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  // Return bucket/path so modal_train.py _supabase_signed_url() can split correctly
  return `training-data/${objectPath}`;
}

async function createJobRecord(
  sb: ReturnType<typeof createClient>,
  jobId: string,
  modelVersion: string,
  samplesCount: number,
): Promise<void> {
  const { error } = await sb.from('knowledge_distillation_jobs').insert({
    id:           jobId,
    job_type:     'vlm_distillation',
    status:       'pending',
    config:       { loraRank: 8, loraAlpha: 16, batchSize: 2, epochs: 3, learningRate: 0.0002 },
    triggered_by: 'manual',
    base_model_version: 'qwen2.5-vl-3b',
    model_version: modelVersion,
    training_samples_count: samplesCount,
    notes:        `Seeded from Roboflow building-defect dataset (${samplesCount} GPT-4o labeled images)`,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  });
  if (error) throw new Error(`Job record insert failed: ${error.message}`);
}

async function triggerWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(30_000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Webhook returned ${res.status}: ${body}`);
  console.log('  Webhook acknowledged:', body.slice(0, 200));
}

async function pollJobUntilDone(
  sb: ReturnType<typeof createClient>,
  jobId: string,
  maxWaitMs = 7_200_000, // 2 hours
): Promise<Record<string, unknown>> {
  const start = Date.now();
  console.log(`\n  Polling job ${jobId} (up to ${maxWaitMs / 60_000}min)...`);

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 30_000)); // check every 30s
    const { data, error } = await sb
      .from('knowledge_distillation_jobs')
      .select('status, metrics_jsonb, output_model_path, error_message, completed_at')
      .eq('id', jobId)
      .single();

    if (error) { console.warn('  DB poll error:', error.message); continue; }

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] status=${data.status}`);

    if (data.status === 'completed' || data.status === 'failed') {
      return data as Record<string, unknown>;
    }
  }
  throw new Error('Training timed out after 2 hours');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n' + '═'.repeat(70));
  console.log(' Mint AI VLM Distillation Pipeline Runner');
  console.log('═'.repeat(70) + '\n');

  // Validate prerequisites
  if (!OPENAI_API_KEY)   { console.error('OPENAI_API_KEY not set'); process.exit(1); }
  if (!SUPABASE_URL)     { console.error('NEXT_PUBLIC_SUPABASE_URL not set'); process.exit(1); }
  if (!SUPABASE_KEY)     { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
  if (!WEBHOOK_URL && !DRY_RUN) { console.warn('VLM_TRAINING_WEBHOOK_URL not set — will skip training trigger'); }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Pick images
  const images = pickDiverseSample(DATASET_DIR, COUNT);
  console.log(`Dataset : ${DATASET_DIR}`);
  console.log(`Images  : ${COUNT} selected from ${fs.readdirSync(DATASET_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).length} available`);
  console.log(`Teacher : ${OPENAI_MODEL}`);
  console.log(`Mode    : ${DRY_RUN ? 'DRY RUN (no upload/train)' : 'FULL RUN'}\n`);

  // ── Phase 1: Label with GPT-4o ──────────────────────────────────────────────
  console.log('Phase 1: Generating GPT-4o teacher labels');
  console.log('─'.repeat(70));

  const conversations: Array<{ messages: QwenMessage[] }> = [];
  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < images.length; i++) {
    const imgPath  = images[i];
    const basename = path.basename(imgPath);
    const sizeKB   = Math.round(fs.statSync(imgPath).size / 1024);
    process.stdout.write(`  [${i + 1}/${images.length}] ${basename.slice(0, 50).padEnd(52)} ${sizeKB}KB  `);

    try {
      const dataUri = toDataUri(imgPath);
      const result  = await callTeacher(dataUri);

      if (!result) { process.stdout.write('FAILED\n'); failCount++; continue; }

      const da = (result.label as Record<string, unknown>)?.damageAssessment as Record<string, unknown> | undefined;
      process.stdout.write(`OK  ${String(da?.damageType ?? '?').slice(0, 20).padEnd(22)} ${da?.severity ?? '?'}\n`);

      conversations.push(buildQwenConversation(dataUri, result.label, result.reasoning));
      successCount++;
    } catch (err) {
      process.stdout.write(`ERROR: ${err instanceof Error ? err.message.slice(0, 40) : String(err)}\n`);
      failCount++;
    }
  }

  console.log(`\n  ✓ Labeled: ${successCount}  ✗ Failed: ${failCount}\n`);

  if (successCount < 10) {
    console.error(`Insufficient data: ${successCount} examples (need >= 10). Aborting.`);
    process.exit(1);
  }

  // ── Phase 2: Build JSONL ────────────────────────────────────────────────────
  console.log('Phase 2: Building JSONL');
  console.log('─'.repeat(70));

  const jsonl      = conversations.map(c => JSON.stringify(c)).join('\n');
  const jsonlBytes = Buffer.byteLength(jsonl, 'utf-8');
  console.log(`  Conversations : ${conversations.length}`);
  console.log(`  JSONL size    : ${(jsonlBytes / 1024 / 1024).toFixed(1)} MB`);

  if (DRY_RUN) {
    const outFile = path.join(__dirname, 'training_data_preview.jsonl');
    fs.writeFileSync(outFile, jsonl);
    console.log(`\n  [DRY RUN] Written to: ${outFile}`);
    console.log('  Exiting without upload or training trigger.');
    return;
  }

  // ── Phase 3: Upload JSONL to Supabase Storage ───────────────────────────────
  console.log('\nPhase 3: Uploading JSONL to Supabase Storage');
  console.log('─'.repeat(70));

  const ts           = Date.now();
  const jobId        = `kd-${ts}-vlm_distillation`;
  const modelVersion = `mint-vlm-${ts}`;

  let storagePath: string;
  try {
    storagePath = await uploadJsonl(sb, jobId, jsonl);
    console.log(`  ✓ Uploaded to: training-data/${storagePath}`);
  } catch (err) {
    console.error('  Upload failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Phase 4: Create job record ──────────────────────────────────────────────
  console.log('\nPhase 4: Creating knowledge_distillation_jobs record');
  console.log('─'.repeat(70));

  try {
    await createJobRecord(sb, jobId, modelVersion, successCount);
    console.log(`  ✓ Job ID: ${jobId}`);
  } catch (err) {
    console.error('  Job record failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Phase 5: Trigger Modal training webhook ─────────────────────────────────
  console.log('\nPhase 5: Triggering Modal training webhook');
  console.log('─'.repeat(70));

  if (!WEBHOOK_URL) {
    console.warn('  VLM_TRAINING_WEBHOOK_URL not set — skipping. Training will not start.');
    console.warn('  Set it to: https://admin-19723--mint-vlm-train.modal.run');
    console.log(`\n  Job ${jobId} is ready. Re-run with VLM_TRAINING_WEBHOOK_URL set, or POST manually:`);
    console.log(`  curl -X POST <webhook-url> -H 'Content-Type: application/json' -d '${JSON.stringify({
      jobId,
      modelVersion,
      storagePath,
      samplesCount: successCount,
      config: { loraRank: 8, loraAlpha: 16, batchSize: 2, epochs: 3, learningRate: 0.0002 },
    })}'`);
    return;
  }

  const webhookPayload = {
    jobId,
    modelVersion,
    storagePath,
    samplesCount: successCount,
    config: { loraRank: 8, loraAlpha: 16, batchSize: 2, epochs: 3, learningRate: 0.0002 },
  };

  try {
    await triggerWebhook(WEBHOOK_URL, webhookPayload);
    console.log('  ✓ Training job accepted by Modal');
    console.log(`  Monitor: https://modal.com/apps`);
  } catch (err) {
    console.error('  Webhook failed:', err instanceof Error ? err.message : err);
    console.log('\n  Tip: Check that modal_train.py is deployed:');
    console.log('    python -m modal deploy vlm_training_worker/modal_train.py');
    process.exit(1);
  }

  // ── Phase 6: Poll for completion ────────────────────────────────────────────
  console.log('\nPhase 6: Monitoring training job');
  console.log('─'.repeat(70));
  console.log('  Training runs on Modal A100-40GB GPU (~20-60 min for 60 samples)');
  console.log('  Press Ctrl+C to stop polling (training continues on Modal)\n');

  try {
    const result = await pollJobUntilDone(sb, jobId);

    if (result.status === 'completed') {
      console.log('\n' + '═'.repeat(70));
      console.log(' Training COMPLETE');
      console.log('═'.repeat(70));
      console.log(`  Job ID         : ${jobId}`);
      console.log(`  Adapter path   : ${result.output_model_path}`);
      console.log(`  Completed at   : ${result.completed_at}`);
      const metrics = result.metrics_jsonb as Record<string, unknown> | null;
      if (metrics) {
        console.log(`  Train loss     : ${metrics.finalTrainLoss ?? 'n/a'}`);
        console.log(`  Eval loss      : ${metrics.finalEvalLoss ?? 'n/a'}`);
        console.log(`  Duration       : ${metrics.durationSeconds ?? 'n/a'}s`);
        console.log(`  Samples used   : ${metrics.samplesUsed ?? 'n/a'}`);
      }
      console.log('\n  The inference endpoint will load the new adapter on next cold start.');
      console.log('  Redeploy to force immediate reload:');
      console.log('    python -m modal deploy vlm_training_worker/modal_inference.py');
    } else {
      console.error('\n  Training FAILED:', result.error_message);
      process.exit(1);
    }
  } catch (err) {
    console.log('\n  Polling stopped:', err instanceof Error ? err.message : err);
    console.log(`  Check job status: query knowledge_distillation_jobs WHERE id = '${jobId}'`);
  }
})();
