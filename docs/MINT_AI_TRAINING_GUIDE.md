# How Mint AI Is Trained

Mint AI has **two trainable parts**: (1) **detectors** (YOLO for damage detection, SAM3 for segmentation) and (2) the **generator** (the model that produces the final assessment JSON from images + evidence—today GPT-4o or your in-house VLM at `MINT_AI_VLM_ENDPOINT`). This guide describes how each is (or can be) trained.

---

## 1. Detector Training (Existing Pipelines)

### 1.1 Data sources

| Source | Purpose |
|--------|--------|
| **building_assessments** | Validated assessments (`validation_status = 'validated'`); used for damage-type/severity distribution and as labels |
| **building_assessment_outcomes** | Human-confirmed outcomes (actual damage type, severity, etc.) for accuracy and corrections |
| **yolo_corrections** (via YOLOCorrectionService) | User corrections to bounding boxes/classes; feed YOLO retraining |
| **gpt4_training_labels** (training-data-types) | GPT-4 response stored as training label; used for generator-style training data |
| **sam3_training_masks** | SAM3 segmentation masks + damage type; feed SAM3/segmentation training |

### 1.2 YOLO (object detection)

- **Data:** Approved corrections from `YOLOCorrectionService.getApprovedCorrections()`.
- **Export:** `YOLOTrainingDataService.exportCorrectionsToYOLO()` writes images + YOLO-format labels under `training-data/continuous-learning` (train/val/test).
- **Enhanced export:** `YOLOTrainingDataEnhanced` can include SAM3 masks and merge with a base dataset.
- **Retraining:** `YOLORetrainingService`:
  - `shouldRetrain()` – checks minimum corrections and interval since last run.
  - `checkAndRetrain()` / `triggerRetraining()` – creates a retraining job; actual training is intended to run externally (e.g. GCP AI Platform, Cloud Run job).
- **API:** `POST /api/building-surveyor/retrain` triggers a retrain check; `GET .../retrain` returns status.
- **Model registry:** `InternalDamageClassifier` reads model metadata and training stats from the DB (e.g. `model_training_jobs`, training sample counts).

**In short:** Validated assessments and user corrections → export to YOLO format → trigger retraining job → (your pipeline runs training) → register new model.

#### Roboflow Building Defect Detection 7 4 and GPT retraining

- **Inference model:** The app uses **Building Defect Detection 7 version 4** from the Roboflow API (`ROBOFLOW_MODEL_ID` + `ROBOFLOW_MODEL_VERSION=4`) for object detection. This is the YOLOv11 Accurate variant; set `ROBOFLOW_MODEL_VERSION=4` in `.env.local` (default in code is 4).
- **What GPT sees:** Each assessment runs Roboflow first; the **detections** (boxes, classes, confidence) are passed into the agent as evidence. GPT (and the generator) then "see" what Roboflow detected and use that to produce the final assessment (damage types, severity, etc.).
- **Retraining from what Roboflow sees:** When users correct bounding boxes or classes in the UI, those **corrections** are stored in `yolo_corrections`. Approved corrections are exported to YOLO format and used by `YOLORetrainingService.triggerRetraining()`. So the system effectively **retrains by looking at what Roboflow saw**: Roboflow 7.4 runs → GPT/user see the results → user corrects misdetections → corrections become training data for the next model. Retraining jobs record the base Roboflow model (`baseRoboflowModelId`, `baseRoboflowVersion`) in `metrics_jsonb` so you know which inference model the run was based on.

### 1.3 SAM3 (segmentation)

- **Data:** Segment tool outputs and/or `sam3_training_masks` (assessmentId, imageUrl, damageType, masks, boxes, scores).
- **Services:** `SAM3TrainingDataService`, `YOLOTrainingDataEnhanced` (can export SAM3-related data).
- **Use:** Masks + damage types are the labels for training/improving the segmentation model.

### 1.4 Continuous learning orchestration

- **ContinuousLearningService** ties together:
  - Feedback processing (e.g. after corrections).
  - Deciding when to trigger retraining (`checkImmediateRetrainingTrigger`, `shouldTriggerRetraining`).
  - Calling `YOLORetrainingService.triggerRetraining()`.
  - Optional shadow phase and learning from human vs AI decisions.

---

## 2. Generator Training (Mint AI VLM at “Generate”)

The **generator** is the model that takes **images + evidence summary** and outputs the **assessment JSON** (damage type, severity, safety, compliance, etc.). Right now it’s either GPT-4o or your own model behind `MINT_AI_VLM_ENDPOINT`. To **train** that in-house model you need data and a training pipeline.

### 2.1 Data you already have

For each assessment that went through the agent you have:

| Data | Where | Role in training |
|------|--------|-------------------|
| **Images** | `assessment_images` (urls) or request history | Model input (vision) |
| **Evidence summary** | Built from `assessment_evidence` (detect, segment, vision_labels, retrieve_memory) via `buildEvidenceSummary()` | Model input (text context) |
| **Target JSON** | `building_assessments.assessment_data` (full Phase1BuildingAssessment) | Supervision target |
| **Human corrections** | `building_assessment_outcomes` (e.g. actual_damage_type, actual_severity) | Optional: override target labels |

So the **natural training signal** is:  
**(image_urls[], evidence_summary) → assessment_data JSON**  
(preferring human-corrected fields from outcomes when available).

### 2.2 Suggested training data export

1. **Query:**  
   - `building_assessments` with `validation_status IN ('validated', 'needs_review')` and non-null `assessment_data`.  
   - Join `assessment_evidence` to get per-step outputs; rebuild a single **evidence summary** string (e.g. same logic as `buildEvidenceSummary` + optional extra from evidence JSON).  
   - Join `assessment_images` for image URLs (or store image bytes/paths if you train offline).

2. **Per row, export:**  
   - `assessment_id`  
   - `image_urls[]` (or paths)  
   - `evidence_summary` (text)  
   - `assessment_data` (JSON) as target (or a version overwritten with `building_assessment_outcomes` when present).

3. **Format:**  
   - e.g. **JSONL**: one line per assessment with `image_urls`, `evidence_summary`, `target_json`.  
   - Or a dataset that your VLM training code expects (e.g. image paths + caption/target JSON).

### 2.3 Training the VLM

Options (high level):

1. **Fine-tune an open VLM (LLaVA, InternVL, etc.)**  
   - Input: image(s) + text prompt that includes the evidence summary.  
   - Target: the assessment JSON string (or structured output).  
   - Use your export (images + evidence_summary → target_json).  
   - Run training on your infra (single GPU, multi-GPU, or cloud job).

2. **Distillation from GPT-4o**  
   - Use the same (image, evidence_summary) → assessment_data you already collect.  
   - Teacher: GPT-4o (current generator).  
   - Student: your model; train to match teacher outputs on validated/corrected data.

3. **Custom model / API-compatible endpoint**  
   - Train any vision-language model that can be called with the same interface as the generator (messages with image + text).  
   - Deploy it and set `MINT_AI_VLM_ENDPOINT` (and optionally `MINT_AI_VLM_API_KEY`).  
   - The app already calls this endpoint when configured (Phase 4).

### 2.4 End-to-end flow (generator)

1. **Collect:** Every agent run already stores `building_assessments` + `assessment_evidence` + `assessment_images`. Human validation and outcomes improve label quality.  
2. **Export:** Script or job that builds (image_urls, evidence_summary, target_json) and writes JSONL (or your format).  
3. **Train:** Run your VLM training (fine-tune or distill) on that dataset.  
4. **Deploy:** Serve the model at a URL and set `MINT_AI_VLM_ENDPOINT` (and optionally `MINT_AI_VLM_API_KEY`).  
5. **Iterate:** New validated assessments continuously extend the dataset for the next training run.

---

## 3. Quick reference

| Component | Data source | Trigger / API | Output |
|-----------|-------------|---------------|--------|
| **YOLO** | yolo_corrections (approved), validated assessments | `POST /api/building-surveyor/retrain`, YOLORetrainingService | YOLO-format dataset; training job (actual training is external) |
| **SAM3** | sam3_training_masks, segment tool outputs | Via ContinuousLearningService / manual export | Masks + labels for segmentation training |
| **Mint AI VLM (generator)** | building_assessments + assessment_evidence + assessment_images (and outcomes) | Export script/job → your training pipeline | Fine-tuned or distilled model → deploy to MINT_AI_VLM_ENDPOINT |

---

## 4. Summary

- **Detectors (YOLO, SAM3):** Training is already wired: data from validated assessments and corrections, export to YOLO/SAM3 format, retrain API and ContinuousLearningService. The missing piece is your **actual training runner** (e.g. GCP AI Platform / Cloud Run job that runs the training script and registers the new model).  
- **Generator (Mint AI VLM):** Training is **not** implemented in the app. You have all the data (images, evidence, assessment_data, outcomes). To train: export that into (input, target) pairs, run a VLM training pipeline (fine-tune or distill), then deploy the model and point `MINT_AI_VLM_ENDPOINT` at it.

If you want, the next step can be a small **export script** (e.g. Node/TS or Python) that reads from `building_assessments` + `assessment_evidence` + `assessment_images` (and optionally outcomes) and writes a JSONL dataset for generator training.

---

## 5. Do I need to run the app? How do I see what the AI is taking?

### Do I need to run `npm run dev`?

**Yes.** The AI only calls Roboflow (and SAM3, vision_labels, GPT) when an **assessment runs**. That happens when:

1. The app is running (e.g. `npm run dev` in `apps/web`).
2. Someone triggers an assessment (e.g. from the jobs/assessment UI, or `POST /api/building-surveyor/assess` with image URLs).

So: run `npm run dev`, then use the app (or the API) to run at least one assessment. After that, results are stored in the database.

### How do I see what the AI is taking?

1. **Admin API (recommended)**  
   - Get an assessment ID from `GET /api/admin/building-assessments` (admin only).  
   - Then call **`GET /api/admin/assessment-evidence?assessmentId=<uuid>`** (admin only).  
   - Response includes:
     - **evidence**: one row per tool run (`detect`, `segment`, `vision_labels`, `retrieve_memory`) with `input_refs`, `output_summary`, `confidence_aggregate`.
     - **categories**: for the detect step, the list of damage types (categories) the AI stored, e.g. `damageTypesDetected: ["water_damage", "wall_crack"]`.

2. **Supabase**  
   - In the Supabase dashboard: **Table Editor** → **assessment_evidence** (filter by `assessment_id`) and **building_assessments**.  
   - `assessment_evidence.output_summary` holds the stored result per tool (e.g. detect: `detectionCount`, `damageTypesDetected`; segment: damage-type counts; etc.).

### Is it setting those results into categories?

**Yes.** Roboflow returns raw class names (e.g. "Damp", "Crack", "Leaking radiator"). The app maps them into **15 damage categories** from `damage_taxonomy` via `damage-type-mapping.ts`:

- **Categories:** `pipe_leak`, `water_damage`, `wall_crack`, `roof_damage`, `electrical_fault`, `mold_damp`, `fire_damage`, `window_broken`, `door_damaged`, `floor_damage`, `ceiling_damage`, `foundation_crack`, `hvac_issue`, `gutter_blocked`, `general_damage`.

The **detect** tool stores:

- **output_summary.damageTypesDetected**: list of those category names (what the AI “took” and categorized).
- **output_summary.detectionCount**: number of detections.
- Per-detection details (class name, mapped damage type, confidence, bounding box) are in the tool result; the evidence row stores the summary.

So: run the app → run an assessment → use the admin evidence API or Supabase to see exactly what the AI stored and which categories it used.

### Troubleshooting: “I don’t see anything” in `assessment_evidence`

The table stays **empty** until an assessment runs **through the agent path** and writes evidence. Check the following:

1. **Use the agent path (not hybrid)**  
   Evidence is only written when the **agent** runs (detect → segment → vision_labels → retrieve_memory).  
   - In `.env.local`, ensure **`USE_HYBRID_INFERENCE`** is **not** set to `true` (or set `USE_HYBRID_INFERENCE=false`).  
   - If `USE_HYBRID_INFERENCE=true`, the API uses `HybridInferenceService` and never calls `runAgent`, so no rows are written to `assessment_evidence`.

2. **Trigger at least one assessment**  
   The dev server being running is not enough; something must **call** the assess API:
   - **Option A:** In the app, go to **Create Job** (e.g. `/jobs/create`), add **photos**, and submit so the flow calls `POST /api/building-surveyor/assess`.
   - **Option B:** Call **`POST /api/building-surveyor/assess`** yourself (e.g. Postman or curl) with a valid session cookie and body: `{ "imageUrls": ["https://…"] }` (and optional `context`, `jobId`, `propertyId`, `domain`).

3. **Same Supabase project**  
   The Supabase project in your **Table Editor** (e.g. “Mitenance2040”) must be the one your app uses.  
   - In **`.env.local`**, check **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** (or `SUPABASE_URL`).  
   - If the app points at a **different** project (e.g. a dev/staging Supabase), then the app writes to that DB and you won’t see rows in the project you’re viewing.

4. **Confirm after one run**  
   After one successful assessment via the agent path:
   - **`building_assessments`** should have a new row.
   - **`assessment_evidence`** should have several rows for that `assessment_id` (e.g. `detect`, `segment`, `vision_labels`, `retrieve_memory`).
