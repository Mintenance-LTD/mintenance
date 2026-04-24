# Mint AI VLM v2 — Current State

**Last updated:** 2026-04-23 **Status:** Deployed (shadow mode ready) **Supersedes:** parts of
[`MINT_AI_TRAINING_GUIDE.md`](./MINT_AI_TRAINING_GUIDE.md) and
[`vlm_training_worker/README.md`](../vlm_training_worker/README.md)

This document describes the actual production Mint AI VLM as it exists in the codebase today.
Earlier design docs (e.g. references to LLaMA-Factory, sharegpt format, A100 40GB) reflect
aspirational architecture that was not the one built.

---

## TL;DR

Mint AI is a LoRA fine-tune of **Qwen2.5-VL-7B-Instruct** (Apache 2.0), trained on ~5,000
building-defect images, served from Modal via vLLM with API-key auth. It achieves 78% damageType
accuracy and 98% pipe_leak accuracy on a 396-sample held-out val set. Currently wired into the web
app in **shadow mode** — runs alongside GPT-4o on every assessment request, logs disagreements for
v3 training data.

## 1. Architecture

```
                       TRAINING (offline)
   ┌────────────────────────────────────────────────────────┐
   │  Roboflow BDD7 (TFOD export)                           │
   │       ↓ yolo_dataset/convert_tfod_to_yolo.py           │
   │  YOLO format (70 classes)                              │
   │       ↓ yolo_dataset/merge_classes.py                  │
   │  11 canonical classes                                  │
   │       ↓ yolo_dataset/merge_v2_datasets.py              │
   │  + MCrack1300 + concrete-crack + walls-defects         │
   │       ↓ scripts/vlm-training/export_roboflow_to_qwen_v2.mjs
   │  Qwen conversation JSONL (bboxes + assessment schema)  │
   │       ↓ scripts/vlm-training/upload_images_to_supabase.mjs
   │  Images in Supabase Storage                            │
   │       ↓ scripts/vlm-training/modal_train.py            │
   │  LoRA adapter (A10G, QLoRA, ~6h)                       │
   │       ↓ Modal Volume: mint-ai-adapters/mint-ai-vlm-v2  │
   └────────────────────────────────────────────────────────┘

                       PRODUCTION (per request)
   ┌────────────────────────────────────────────────────────┐
   │  Mobile/web: POST /api/building-surveyor/assess        │
   │       ↓ AssessmentGenerator.ts                         │
   │  callMintAiVLM() → Modal endpoint                      │
   │       ↓ vLLM (Qwen2.5-VL-7B + LoRA, scales to zero)    │
   │  OpenAI-compatible /v1/chat/completions                │
   │       ↓ Return structured JSON assessment              │
   │  Saved to building_assessments / vlm_shadow_comparisons│
   └────────────────────────────────────────────────────────┘
```

- **Base model:** `Qwen/Qwen2.5-VL-7B-Instruct`
- **Framework:** `transformers` + `peft` + `bitsandbytes` (NOT LLaMA-Factory)
- **Serving:** vLLM 0.7.3 (OpenAI-compatible)
- **GPU:** A10G (24 GB VRAM) — not A100
- **Cost:** ~$8 one-time training; scales to zero at rest

## 2. Canonical class vocabulary (11 classes)

Merged from the original Roboflow BDD7 70 classes + three other datasets. See
[`yolo_dataset/merge_classes.py`](../yolo_dataset/merge_classes.py) and
[`yolo_dataset/merge_v2_datasets.py`](../yolo_dataset/merge_v2_datasets.py).

| Index | Class            | Role              | Training bboxes (v2) |
| ----: | ---------------- | ----------------- | -------------------: |
|     0 | pipe_leak        | damage            |                1,217 |
|     1 | water_damage     | damage            |                  473 |
|     2 | wall_crack       | damage            |            **7,428** |
|     3 | roof_damage      | damage            |                  161 |
|     4 | mold_damp        | damage            |                  472 |
|     5 | window_broken    | damage            |                1,731 |
|     6 | floor_damage     | damage            |                   22 |
|     7 | foundation_crack | damage            |            **1,736** |
|     8 | general_damage   | damage (catchall) |                1,324 |
|     9 | good_fitting     | negative anchor   |                  112 |
|    10 | fixture          | negative anchor   |                1,317 |

Total: **~16,000 bboxes** across 7,726 images (train/val/test splits).

**Classes deliberately dropped from BDD7's 70:**

- Individual crack taxonomy (crack, minor_crack, brack_crack, etc.) → collapsed to `wall_crack`
- Damp/mould variants (damp, damp_damage, whole_cause_by_damp, wall_stain) → collapsed to
  `water_damage`/`mold_damp`
- Ultra-rare classes (electrical_fault=2 boxes, ceiling_damage=1, normal_wall=3) → folded into
  `general_damage` or `fixture`

## 3. Training data provenance

| Dataset                                   | License   | Train images | Bboxes contributed | Covers                                   |
| ----------------------------------------- | --------- | -----------: | -----------------: | ---------------------------------------- |
| Roboflow "Building Defect Detection 7" v2 | CC BY 4.0 |        2,894 |              4,221 | Base multi-class set                     |
| **MCrack1300** (Univ. of Birmingham)      | CC BY 4.0 |        1,000 |              5,404 | UK masonry cracks                        |
| Concrete Surface Crack Detection          | CC BY 4.0 |          920 |              1,170 | Foundation-style concrete cracks         |
| Building Defect on Walls v2               | CC BY 4.0 |          186 |                348 | Mould + water seepage + stairstep cracks |

All images uploaded to Supabase Storage bucket `mint-ai-training-public` with prefix
`roboflow-bdd7-merged/v1/` (BDD7) and `merged/v2/` (full set).

## 4. Training pipeline

### Local merge + JSONL generation

```bash
# Merge all 4 datasets into unified YOLO format
python yolo_dataset/merge_v2_datasets.py \
  --output yolo_dataset_v2_merged --clean --link hardlink

# Generate Qwen conversation JSONL
node scripts/vlm-training/export_roboflow_to_qwen_v2.mjs \
  --src ./yolo_dataset_v2_merged \
  --output ./training_data_mint_ai_v2_merged.jsonl \
  --domain residential

# Upload images to Supabase, rewrite JSONL URLs
node scripts/vlm-training/upload_images_to_supabase.mjs \
  --src ./yolo_dataset_v2_merged \
  --bucket mint-ai-training-public \
  --prefix merged/v2 \
  --jsonl ./training_data_mint_ai_v2_merged.jsonl
```

### Modal training

```bash
python -m modal run scripts/vlm-training/modal_train.py \
  --train-jsonl ./training_data_mint_ai_v2_merged.jsonl \
  --val-jsonl ./training_data_mint_ai_v2_merged.jsonl.val.jsonl \
  --epochs 2 \
  --run-name mint-ai-vlm-v2
```

**QLoRA hyperparameters:**

- LoRA rank 16, alpha 32, dropout 0.05
- Target modules: `q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj`
- batch_size=1, grad_accum=8 (effective batch 8)
- learning_rate=2e-4, cosine schedule, 3% warmup
- 4-bit QLoRA (nf4, bfloat16 compute)
- max_seq_length=1800 (truncates outliers with 6+ detections)
- `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` to avoid OOM on logits cast

Training takes ~6 hours on A10G, costs ~$6-8.

## 5. Deployment

### Modal inference endpoint

```bash
python -m modal deploy scripts/vlm-training/modal_serve.py
```

Stable URL: `https://gloire--mint-ai-serve-mintaiserver-openai.modal.run`

Routes:

- `GET /health` — unauthenticated liveness check
- `POST /v1/chat/completions` — OpenAI-compatible, **requires API key**
- `GET /v1/models` — list served models

**Auth:** Bearer token matching `MINT_AI_API_KEY` secret. Non-auth'd requests return 401.

**Cold start:** 60–90s on first request after idle (scales to zero). Warm inference: 5–15s.

### Secrets (Modal)

```bash
modal secret create mint-ai-hf-token HF_TOKEN=hf_...
modal secret create mint-ai-api-key MINT_AI_API_KEY=<random-32-char>
```

### Environment variables (`apps/web/.env.local`)

```bash
MINT_AI_VLM_ENDPOINT=https://gloire--mint-ai-serve-mintaiserver-openai.modal.run/v1
MINT_AI_VLM_API_KEY=<same-value-as-modal-secret>
VLM_ROUTING_MODE=shadow_only   # shadow_only | auto | teacher_only
USE_MINT_AI_VLM=false
AB_TEST_ROLLOUT_PERCENT=0      # 0..100
```

## 6. Validation metrics

Measured on a 396-sample held-out validation set (all damage-positive examples):

| Metric                           |     Value | Sample size |
| -------------------------------- | --------: | ----------: |
| damageType exact                 | **78.0%** |         396 |
| Schema validity (parseable JSON) |  **100%** |         396 |
| severity exact                   |     85.6% |         396 |
| severity off-by-≤1               |     95.7% |         396 |
| detection count ±1               |     79.0% |         396 |
| Trade recommendations Jaccard    |      0.79 |         396 |
| Latency p50 (warm)               |      9.4s |           — |
| Latency p95 (warm)               |     16.1s |           — |

### Per-class accuracy

| Class            |          Accuracy | Sample | Verdict                               |
| ---------------- | ----------------: | -----: | ------------------------------------- |
| **pipe_leak**    | **98%** (190/194) |    194 | Production-ready                      |
| water_damage     |       83% (43/52) |     52 | Strong                                |
| mold_damp        |       79% (23/29) |     29 | Good                                  |
| window_broken    |       74% (20/27) |     27 | OK                                    |
| general_damage   |       43% (12/28) |     28 | Weak (expected — catchall)            |
| wall_crack       |       36% (18/50) |     50 | Known weakness                        |
| roof_damage      |         7% (1/14) |     14 | Known weakness (no new training data) |
| foundation_crack |        100% (2/2) |      2 | Sample too small to trust             |

Reproduce with:

```bash
python scripts/vlm-training/evaluate_mint_ai.py \
  --endpoint $MINT_AI_VLM_ENDPOINT \
  --skip-background --concurrency 3
```

## 7. Production integration

### Web app routing

[`apps/web/lib/services/building-surveyor/generator/AssessmentGenerator.ts`](../apps/web/lib/services/building-surveyor/generator/AssessmentGenerator.ts)
handles routing between Mint AI and GPT-4o:

- `MINT_AI_VLM_ENDPOINT` set → route through `callMintAiVLM()`
- On Mint AI failure → automatic fallback to GPT-4o
- `VLM_ROUTING_MODE=shadow_only` → both models run in parallel (StudentRoutingGate), GPT-4o serves
  user, Mint AI output logged to `vlm_shadow_comparisons`
- `VLM_ROUTING_MODE=auto` → `StudentRoutingGate` picks per-category based on calibration + safety
  gates
- Safety-critical categories (electrical, gas, structural) always routed to teacher

### Mobile flow

[`apps/mobile/src/screens/assessment/PropertyAssessmentScreen/triggerAIAnalysis.ts`](../apps/mobile/src/screens/assessment/PropertyAssessmentScreen/triggerAIAnalysis.ts)
fire-and-forgets a Mint AI call after user submits the assessment wizard. User sees "Assessment
saved — AI analysis runs in background" and can navigate away. When Mint AI completes, the
`building_assessments` row is updated with real damageType/severity/confidence.

### Where results land

| Table / Bucket                     | Contents                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| `building_assessments`             | Main row per assessment, enriched by Mint AI on completion   |
| `assessment_images`                | Photo URLs linked to assessment                              |
| `assessment-photos` Storage bucket | Actual JPEGs (⚠️ currently public URLs — security follow-up) |
| `vlm_shadow_comparisons`           | Teacher + student outputs per request (shadow mode)          |
| `vlm_student_calibration`          | Per-category EMA accuracy + safety recall                    |
| `vlm_routing_decisions`            | Audit log of StudentRoutingGate decisions                    |

### Recommended rollout

1. **Week 1 — shadow mode:** `VLM_ROUTING_MODE=shadow_only`. GPT-4o serves users, Mint AI runs in
   parallel. Zero user-visible risk. Collect agreement data.
2. **Week 2 — gradual auto:** `VLM_ROUTING_MODE=auto` + `AB_TEST_ROLLOUT_PERCENT=5`.
   StudentRoutingGate gates per-category.
3. **Week 3+ — scale:** bump rollout % based on shadow agreement rates. Safety-critical categories
   stay on GPT-4o regardless.

## 8. Known weaknesses

### Per-class gaps

- **wall_crack (36%)** — overfitted to clean MCrack1300 UK masonry style, misses scruffy real-world
  crack images. Training data distribution mismatch, not a sampling hyperparameter issue (confirmed
  via `diagnose_frequency_penalty.py`).
- **roof_damage (7%)** — no publicly available roof-truss / internal timber decay datasets. Waiting
  on real user data flywheel.
- **general_damage (43%)** — catchall class is inherently fuzzy; not a meaningful standalone product
  claim.
- **Sample-tiny classes** (floor_damage 22 boxes, foundation_crack on 2 val samples) — unreliable
  metrics.

### Training data mismatch

Val set is from Roboflow BDD7 (varied global images); bulk of training is MCrack1300 (UK campus
masonry close-ups). Model learns the MCrack visual style. Fix: more real-world photos via production
flywheel.

### vLLM/LoRA limitation

`vLLM 0.7.3` only applies LoRA to the language model tower, **not the vision encoder** (see warnings
in startup logs). Vision-side fine-tuning would require a different serving stack.

## 9. v3 roadmap (no dates)

### Path A — Real user data flywheel (best long-term)

- `StudentShadowService` captures every production assessment
- Admin corrections via
  [`YOLOCorrectionService`](../apps/web/lib/services/building-surveyor/YOLOCorrectionService.ts)
- After ~500 corrected samples, retrain v3
- Expected: wall_crack and roof_damage improve dramatically because training data matches production
  distribution

### Path B — GPT-4o distillation on failure cases (cheap fix)

- Script: `scripts/vlm-training/gpt4_teacher_harvest.py` (not yet written)
- Take val images where Mint AI v2 said "none" on wall_crack, send to GPT-4o, harvest correct labels
- Add to v3 training JSONL
- Cost: ~$0.20 OpenAI + ~$6-8 Modal = **~$8 total**
- Expected: wall_crack 36% → 55-70%

### Path C — Niche datasets

Not publicly available (roof trusses, stairstep/subsidence cracks are proprietary to Tractable-style
insurance AI vendors). Parked until real user data fills the gap.

## 10. Cost snapshot

| Item                                         | One-time |                                Monthly |
| -------------------------------------------- | -------: | -------------------------------------: |
| Training v1 (A10G, 2 epochs, 2,894 examples) |      ~$5 |                                      — |
| Training v2 (A10G, 2 epochs, 5,000 examples) |      ~$8 |                                      — |
| Evaluation runs (~400 samples each)          |   ~$1.50 |                                      — |
| Modal inference (scales to zero)             |        — | ~$0/mo idle, ~$30/mo at 1,000 reqs/day |
| Supabase Storage (7,700 images)              |        — |                                 <$1/mo |
| OpenAI (while shadow mode)                   |        — |             unchanged from pre-Mint-AI |

## 11. File map

### Training data

```
yolo_dataset/
  convert_tfod_to_yolo.py            # Roboflow TFOD → YOLO
  merge_classes.py                   # 70 → 11 classes (v1)
  merge_v2_datasets.py               # 4 datasets → merged v2
  train_kaggle.py                    # YOLO11n detector training
  UPLOAD_TO_KAGGLE.md                # Kaggle workflow
```

### VLM training + serving

```
scripts/vlm-training/
  export_roboflow_to_qwen_v2.mjs     # YOLO → Qwen JSONL
  upload_images_to_supabase.mjs      # Images → Supabase + rewrite JSONL URLs
  modal_train.py                     # Modal LoRA training
  modal_serve.py                     # Modal vLLM serving + auth
  evaluate_mint_ai.py                # Val-set eval harness
  diagnose_frequency_penalty.py      # Hyperparameter A/B helper
```

### Web integration

```
apps/web/lib/services/building-surveyor/
  generator/AssessmentGenerator.ts   # Routes GPT-4o / Mint AI
  distillation/StudentRoutingGate.ts # Per-category confidence gating
  distillation/SafetyRecallGate.ts   # Output validation before serving
  distillation/StudentShadowService.ts # Shadow-mode data capture
  distillation/TrainingDataExporter.ts # Production → training JSONL
```

### Mobile integration

```
apps/mobile/src/screens/assessment/PropertyAssessmentScreen/
  triggerAIAnalysis.ts               # Fire-and-forget post-submission call
```

### Modal artifacts

- Volume `mint-ai-adapters` — LoRA checkpoints (`mint-ai-vlm-v1`, `mint-ai-vlm-v2`)
- Volume `mint-ai-training-data` — JSONL files for training jobs
- Volume `mint-ai-training-public` (Supabase) — training images
- Secrets: `mint-ai-hf-token`, `mint-ai-api-key`

## 12. Attribution (Apache 2.0 requirement)

Mint AI is a LoRA fine-tune of **Qwen2.5-VL-7B-Instruct** by Alibaba Cloud, licensed under Apache
2.0. Attribution is preserved in
[`apps/web/lib/services/ai/mint-ai-constants.ts`](../apps/web/lib/services/ai/mint-ai-constants.ts)
and must appear in any model card or distribution of weights.

Training datasets (all CC BY 4.0 — attribution required):

- Roboflow "Building Defect Detection 7" v2 —
  [hello-b0waw](https://universe.roboflow.com/hello-b0waw/building-defect-detection-7-ks0im)
- MCrack1300 — [University of Birmingham](https://universe.roboflow.com/uni-of-birmingham/masonry),
  [arXiv:2401.15266](https://arxiv.org/abs/2401.15266)
- Concrete Surface Crack Detection —
  [vijayalakshmi](https://universe.roboflow.com/vijayalakshmi-2yshx/concrete-surface-crack-detection-using-yolov5-model)
- Building Defect on Walls —
  [builddef2](https://universe.roboflow.com/builddef2/building-defect-on-walls)
