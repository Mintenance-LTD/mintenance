#!/usr/bin/env node
/**
 * Bootstrap training dataset export for Mint AI VLM (Qwen2.5-VL).
 *
 * Reads directly from building_assessments + assessment_evidence +
 * assessment_images (+ optional building_assessment_outcomes overlay) and
 * writes Qwen2.5-VL conversation JSONL ready for LoRA fine-tuning.
 *
 * Unlike TrainingDataExporter.ts (which reads from vlm_training_buffer,
 * populated only by StudentShadowService once MINT_AI_VLM_ENDPOINT is set),
 * this bootstraps the FIRST training run from the assessments already in
 * the DB — breaking the chicken-and-egg problem.
 *
 * Output format matches TrainingDataExporter.toQwenConversation so both
 * paths produce compatible JSONL.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/vlm-training/export_bootstrap_dataset.mjs \
 *       --output ./training_data.jsonl \
 *       --limit 1000 \
 *       --min-confidence 0.7 \
 *       --balance-categories \
 *       --split 0.9
 *
 * Optional flags:
 *   --include-needs-review   Include validation_status='needs_review' (default: validated only)
 *   --with-outcomes          Overlay human corrections from building_assessment_outcomes
 *   --val-output PATH        Write validation split to PATH (defaults to <output>.val.jsonl)
 *   --dry-run                Count + preview without writing
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Configuration — must match TrainingDataExporter.ts exactly so the student
// trained on bootstrap data and shadow-comparison data sees the same schema.
// ---------------------------------------------------------------------------

const TRAINING_SYSTEM_PROMPT =
  'You are a UK building damage assessment AI. Analyze the provided images and return a JSON object with these sections: damageAssessment, safetyHazards, compliance, insuranceRisk, urgency, homeownerExplanation, contractorAdvice. ' +
  'Use 4-tier severity: "early" (cosmetic/minor), "developing" (progressing, needs attention), "significant" (serious, risk of spread), "dangerous" (structural/safety risk, urgent repair). ' +
  'Include recommendedTrades in contractorAdvice: choose from plumber, electrician, roofer, structural_engineer, plasterer, general_builder, damp_specialist, gas_engineer, drainage, locksmith, glazier, pest_control. ' +
  'Be precise, safety-conscious, and evidence-based.';

const DEFAULT_USER_PROMPT =
  'Assess the building damage visible in the attached images. Use the detection evidence below as context, then return the complete assessment JSON.\n\nEvidence:\n';

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    output: { type: 'string', default: './training_data.jsonl' },
    'val-output': { type: 'string' },
    limit: { type: 'string', default: '1000' },
    'min-confidence': { type: 'string', default: '0.7' },
    'balance-categories': { type: 'boolean', default: false },
    'include-needs-review': { type: 'boolean', default: false },
    'with-outcomes': { type: 'boolean', default: false },
    split: { type: 'string', default: '0.9' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.',
  );
  process.exit(1);
}

const limit = parseInt(args.limit, 10);
// `building_assessments.confidence` is a 0..100 integer in prod. Accept either
// scale for ergonomics: anything < 1 is treated as 0..1 and scaled up.
const rawMinConfidence = parseFloat(args['min-confidence']);
const minConfidence = rawMinConfidence < 1
  ? Math.round(rawMinConfidence * 100)
  : Math.round(rawMinConfidence);
const split = parseFloat(args.split);
const outputPath = resolve(args.output);
const valOutputPath = resolve(args['val-output'] ?? `${args.output}.val.jsonl`);

// ---------------------------------------------------------------------------
// Supabase client (service-role, bypasses RLS — justified for export job)
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Query assessments + evidence + images
// ---------------------------------------------------------------------------

async function fetchAssessments() {
  const statuses = args['include-needs-review']
    ? ['validated', 'needs_review']
    : ['validated'];

  console.log(
    `Fetching up to ${limit} assessments (status in [${statuses.join(', ')}], confidence >= ${minConfidence})...`,
  );

  const { data: assessments, error } = await supabase
    .from('building_assessments')
    .select('id, assessment_data, confidence, created_at, validation_status, damage_type, job_id')
    .in('validation_status', statuses)
    .not('assessment_data', 'is', null)
    .gte('confidence', minConfidence)
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching assessments:', error.message);
    process.exit(1);
  }

  console.log(`Found ${assessments.length} candidate assessments.`);
  return assessments;
}

async function fetchEvidenceFor(assessmentIds) {
  if (assessmentIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('assessment_evidence')
    .select('assessment_id, tool_name, output_summary, confidence_aggregate')
    .in('assessment_id', assessmentIds);

  if (error) {
    console.warn('Evidence fetch failed (non-fatal):', error.message);
    return new Map();
  }

  const byAssessment = new Map();
  for (const row of data) {
    if (!byAssessment.has(row.assessment_id)) {
      byAssessment.set(row.assessment_id, []);
    }
    byAssessment.get(row.assessment_id).push(row);
  }
  return byAssessment;
}

async function fetchImagesFor(assessmentIds) {
  if (assessmentIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('assessment_images')
    .select('assessment_id, image_url, image_index')
    .in('assessment_id', assessmentIds)
    .order('image_index', { ascending: true });

  if (error) {
    console.warn('Images fetch failed (non-fatal):', error.message);
    return new Map();
  }

  const byAssessment = new Map();
  for (const row of data) {
    if (!byAssessment.has(row.assessment_id)) {
      byAssessment.set(row.assessment_id, []);
    }
    byAssessment.get(row.assessment_id).push(row.image_url);
  }
  return byAssessment;
}

async function fetchOutcomesFor(assessmentIds) {
  if (assessmentIds.length === 0 || !args['with-outcomes']) return new Map();

  const { data, error } = await supabase
    .from('building_assessment_outcomes')
    .select('assessment_id, actual_damage_type, actual_severity, actual_urgency, error_message')
    .in('assessment_id', assessmentIds);

  if (error) {
    console.warn('Outcomes fetch failed (non-fatal):', error.message);
    return new Map();
  }

  const byAssessment = new Map();
  for (const row of data) {
    byAssessment.set(row.assessment_id, row);
  }
  return byAssessment;
}

// ---------------------------------------------------------------------------
// Evidence summary builder — mirrors apps/web/lib/services/building-surveyor
// buildEvidenceSummary() so student sees the same text format.
// ---------------------------------------------------------------------------

function buildEvidenceSummary(evidenceRows) {
  if (!evidenceRows || evidenceRows.length === 0) return '(no prior detection evidence)';

  const parts = [];
  for (const row of evidenceRows) {
    const summary = row.output_summary ?? {};
    switch (row.tool_name) {
      case 'detect': {
        const count = summary.detectionCount ?? 0;
        const types = Array.isArray(summary.damageTypesDetected)
          ? summary.damageTypesDetected.join(', ')
          : 'none';
        parts.push(`DETECT: ${count} detection(s) — types: ${types}`);
        break;
      }
      case 'segment': {
        const masks = summary.maskCount ?? 0;
        parts.push(`SEGMENT: ${masks} mask(s)`);
        break;
      }
      case 'vision_labels': {
        const labels = Array.isArray(summary.labels)
          ? summary.labels.slice(0, 10).join(', ')
          : '';
        parts.push(`LABELS: ${labels}`);
        break;
      }
      case 'retrieve_memory': {
        const hits = summary.memoryHits ?? 0;
        parts.push(`MEMORY: ${hits} similar past assessment(s)`);
        break;
      }
      default: {
        parts.push(`${row.tool_name.toUpperCase()}: ${JSON.stringify(summary).slice(0, 120)}`);
      }
    }
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Overlay human corrections onto assessment_data
// ---------------------------------------------------------------------------

function applyOutcomeOverlay(assessmentData, outcome) {
  if (!outcome) return assessmentData;
  const out = JSON.parse(JSON.stringify(assessmentData)); // deep clone
  if (outcome.actual_damage_type && out.damageAssessment) {
    out.damageAssessment.damageType = outcome.actual_damage_type;
  }
  if (outcome.actual_severity && out.damageAssessment) {
    out.damageAssessment.severity = outcome.actual_severity;
  }
  if (outcome.actual_urgency && out.urgency) {
    out.urgency.urgency = outcome.actual_urgency;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build one Qwen conversation row
// ---------------------------------------------------------------------------

function toQwenConversation(assessment, imageUrls, evidenceSummary, outcome) {
  const target = applyOutcomeOverlay(assessment.assessment_data, outcome);
  const userText = DEFAULT_USER_PROMPT + evidenceSummary;

  const userContent = [{ type: 'text', text: userText }];
  for (const url of imageUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }

  return {
    messages: [
      { role: 'system', content: TRAINING_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
      { role: 'assistant', content: JSON.stringify(target) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Optional category balancing — mirrors TrainingDataExporter.balanceByCategory
// ---------------------------------------------------------------------------

function balanceByCategory(rows, targetTotal) {
  const byCategory = {};
  for (const row of rows) {
    const cat = row.category ?? 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row);
  }

  const numCategories = Object.keys(byCategory).length;
  if (numCategories === 0) return [];

  const perCategory = Math.ceil(targetTotal / numCategories);
  const balanced = [];
  for (const cat of Object.keys(byCategory)) {
    balanced.push(...byCategory[cat].slice(0, perCategory));
  }
  balanced.sort((a, b) => b.confidence - a.confidence);
  return balanced.slice(0, targetTotal);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const assessments = await fetchAssessments();
  if (assessments.length === 0) {
    console.log('No assessments matched the filters. Try --include-needs-review or lower --min-confidence.');
    process.exit(0);
  }

  const ids = assessments.map((a) => a.id);
  const [evidenceMap, imagesMap, outcomesMap] = await Promise.all([
    fetchEvidenceFor(ids),
    fetchImagesFor(ids),
    fetchOutcomesFor(ids),
  ]);

  // Build rows
  let rows = [];
  let skipped = 0;
  for (const a of assessments) {
    const imageUrls = imagesMap.get(a.id) ?? [];
    if (imageUrls.length === 0) {
      skipped++;
      continue; // skip assessments with no images — useless for VLM training
    }
    const evidence = buildEvidenceSummary(evidenceMap.get(a.id));
    const outcome = outcomesMap.get(a.id);
    const conversation = toQwenConversation(a, imageUrls, evidence, outcome);
    rows.push({
      id: a.id,
      confidence: a.confidence,
      category: a.damage_type ?? a.assessment_data?.damageAssessment?.damageType ?? 'unknown',
      conversation,
    });
  }

  console.log(`Built ${rows.length} training rows (${skipped} skipped for missing images).`);

  if (args['balance-categories']) {
    const before = rows.length;
    rows = balanceByCategory(rows, limit);
    console.log(`Balanced across categories: ${before} → ${rows.length} rows.`);

    const dist = {};
    for (const r of rows) dist[r.category] = (dist[r.category] ?? 0) + 1;
    console.log('Category distribution:', dist);
  }

  // Train/val split
  const splitIdx = Math.max(1, Math.floor(rows.length * split));
  const trainRows = rows.slice(0, splitIdx);
  const valRows = rows.slice(splitIdx);

  if (args['dry-run']) {
    console.log(`[dry-run] Would write ${trainRows.length} train + ${valRows.length} val rows`);
    console.log('[dry-run] Sample row (first train):');
    console.log(JSON.stringify(trainRows[0]?.conversation, null, 2).slice(0, 800));
    return;
  }

  // Write train set
  mkdirSync(dirname(outputPath), { recursive: true });
  const trainJsonl = trainRows.map((r) => JSON.stringify(r.conversation)).join('\n');
  writeFileSync(outputPath, trainJsonl + '\n', 'utf-8');
  console.log(`Wrote ${trainRows.length} train rows to ${outputPath}`);

  // Write val set
  if (valRows.length > 0) {
    mkdirSync(dirname(valOutputPath), { recursive: true });
    const valJsonl = valRows.map((r) => JSON.stringify(r.conversation)).join('\n');
    writeFileSync(valOutputPath, valJsonl + '\n', 'utf-8');
    console.log(`Wrote ${valRows.length} val rows to ${valOutputPath}`);
  }

  // Print summary of what to do next
  console.log('\nNext steps:');
  console.log('  1. Upload training_data.jsonl to Modal or local GPU');
  console.log('  2. Run: python scripts/vlm-training/train_qwen_vlm.py \\');
  console.log(`       --data ${outputPath} --val-data ${valOutputPath} \\`);
  console.log('       --output ./adapters/mint-vlm-v1 --epochs 3');
  console.log('  3. Or use Modal: see vlm_training_worker/README.md');
  console.log('  4. After training, set MINT_AI_VLM_ENDPOINT in .env.local');
  console.log('  5. StudentShadowService will start populating vlm_shadow_comparisons');
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
