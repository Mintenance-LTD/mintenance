# Mint AI continuation and Roboflow annotation plan

Updated 25 October 2026. Start here for AI/data work. Older rebuild and VLM v2 documents describe
historical designs and experiments; they are not proof of the deployed configuration or readiness.

Current migration and staged-release evidence, test results and exact continuation steps:
[25 October release record](mint-ai-release-2026-10-25.md). The schema is live in production and
staging. PR #1421 was subsequently merged and its Git production deployment is live on
`www.mintenance.co.uk`. Authenticated activity save and reload passed; photo-upload verification
remains blocked by extension file-access support. The pilot/accessibility follow-up is separate.

The owner requested preparation of a supervised field pilot, with an independent reviewer still
to be arranged. The [pilot pack](pilot/README.md) contains the proposed 10-property/30-assessment
scope, capture register, photo-first reviewer handoff and a documentary readiness checker. No real
cases are enrolled. Reviewer assignment, permissions, release checks and verified training/retrieval
isolation remain prerequisites. This is separate from the public SDNET evaluation experiment.

## Objective and current architecture

Build the evidence-led inspection system described in
[the implementation plan](mint-ai-implementation-plan.md): visible defects tied to photographs,
uncertainty, expert corrections and repair outcomes. Finish building inspections before extending
into rail or infrastructure.

There are two separate model tasks:

- **Detector:** localizes visible defects with boxes/classes. Roboflow images and annotations can
  support this task after review.
- **Main assessment AI:** interprets the whole scene and produces findings, severity, urgency and
  explanations. Its training needs reviewed full assessment targets, not just boxes or class names.

In the latest local source, `AgentRunner.ts` retrieves memory and calls the vision-language
generator. `stages/collect-evidence.ts` deliberately excludes legacy Roboflow/YOLO/SAM outputs from
the production assessment path. Preserve that exclusion until a candidate passes an independent
evaluation. Some legacy tools and maintenance routes still reference detector services.

`generator/AssessmentGenerator.ts` supports a configured OpenAI teacher and an in-house Mint VLM.
`VLM_ROUTING_MODE` defaults to shadow mode in code; this audit did not inspect production
environment variables or verify the live model endpoint. The Roboflow version setting still defaults
to 4 for legacy detector callers. No production model version or routing setting was changed.

## Verified Roboflow inventory

Read from the signed-in
[annotation board](https://app.roboflow.com/hello-b0waw/building-defect-detection-7-ks0im/annotate)
and [model list](https://app.roboflow.com/hello-b0waw/building-defect-detection-7-ks0im/models) on
25 October 2026:

| Location                                        | Images | Meaning                                                      |
| ----------------------------------------------- | -----: | ------------------------------------------------------------ |
| Dataset                                         |  6,975 | Present in dataset; not independently reviewed in this audit |
| Unassigned: `yolo_dataset_bdd7`                 |  2,301 | Awaiting assignment; do not assume all are empty or healthy  |
| Annotating: `Folder: defects: Job 2`            |      6 | Still in annotation workflow                                 |
| Review: `workflows_data_collector - Auto Label` |      6 | Auto-labelled, awaiting review                               |

The public
[project overview](https://universe.roboflow.com/hello-b0waw/building-defect-detection-7-ks0im)
lists 82 classes and 10 dataset versions. The private model tab lists 11 entries, including an
Instant model. Selected reported validation metrics:

| Model ID suffix | Model            | Displayed validation mAP |
| --------------- | ---------------- | -----------------------: |
| `/10`           | RF-DETR 2X Large |                    42.6% |
| `/3`            | RF-DETR X Large  |                    49.8% |
| `/4`            | YOLOv11 Accurate |                    50.2% |
| `/2`            | RF-DETR Medium   |                    48.3% |

These models use different dataset versions. Their displayed metrics are not a controlled comparison
and do not demonstrate app accuracy or safety. The built-in comparison screen currently offers an
upgrade; no upgrade or paid training was started.

The [version 10 page](https://app.roboflow.com/hello-b0waw/building-defect-detection-7-ks0im/10)
shows a March 2026 model update, predating the `yolo_dataset_bdd7` upload on 1 October 2026.
It lists 9,626 version images (7,026 train / 1,184 validation / 1,416 test), three outputs per
training example, 880×880 stretch resizing and grayscale preprocessing. Those generated version
counts differ from the current dataset inventory. Preserve original colour images for the main
VLM; review preprocessing and augmentation choices as part of the next detector experiment.

The first page of the unassigned batch contains repeated filenames such as `CFD_099.jpg`, and DJI
capture sequences/video-frame names. Check duplicate content and group captures before splitting;
filenames alone do not prove duplicate bytes. Keep frames from the same property/capture session in
one partition.

## Changes implemented locally

1. Shared policy: `apps/web/lib/services/building-surveyor/taxonomy/roboflow-label-policy.json`.
   Case, whitespace, underscore and hyphen variants resolve consistently. Canonical detector classes
   are recognized directly. New exports must resolve IDs through their own category table; the old
   81-class index helper is historical only.
2. `window`, `roof` and `pipe` no longer imply broken windows, roof damage or leaks.
   Composite/unknown labels remain unresolved. Spalling is no longer converted to mould, and
   radiator rust no longer implies a leak. These are coarse categories, not expert diagnoses or
   automatic v3 taxonomy assignments.
3. The main AI prompt requires visible defect evidence and distinguishes missing evidence from
   healthy images. Legacy evidence summaries identify context and unresolved detections explicitly.
4. Detector tool confidence remains on its existing 0–100 scale instead of being multiplied by 100
   again.
5. A local COCO audit creates an inventory, review queue and blank review template. It does not
   modify Roboflow, invent labels, generate full assessment targets, train or deploy models.

## Annotation workflow

1. Start with the 6 auto-labelled images awaiting review. Use them to agree class meaning and box
   conventions before scaling to 2,301 images. An AI proposal is not human approval.
2. Review the 6 images still in the annotation job, then divide the unassigned batch by
   capture/site. Include healthy scenes, hard lighting/occlusion and multiple-defect scenes.
   Prioritize examples using a fresh baseline and class coverage, not old v2 accuracy claims.
3. Draw tight boxes around visible defect regions. Keep ordinary objects as context. For composite
   crack/mould/damp/spalling labels, re-annotate the visible regions separately. Do not infer cause,
   severity or safety from a class name.
4. Mark an image negative only after a reviewer checks the relevant visible content. Unannotated,
   insufficient-evidence and rejected images are separate states. A `Normal wall` region does not
   certify the whole image as defect-free.
5. Record reviewer, review date, source permission and property/capture group. Check source terms
   for cloned datasets; the script cannot establish rights.
6. Preserve a frozen test set of independent sites/captures. Apply augmentations only after
   splitting and only to training data. Evaluate per-class precision/recall, localization,
   healthy-scene false positives and critical misses with sample counts.

No existing labels, batch assignments or review statuses were changed in this session.

## Run the dataset audit

Export an existing Roboflow dataset version as **COCO JSON** and extract it locally. The audit
recognizes `_annotations.coco.json` at the root or in `train`, `valid`, and `test`, with image
filenames relative to their annotation file. It counts only images in those manifests; private
unassigned uploads may be absent and must be accounted for separately.

```text
node scripts/vlm-training/audit-roboflow-dataset.mjs --dataset ./data/roboflow-coco --output ./output/roboflow-audit-01
```

The new output directory contains:

- `report.json`: totals, category interpretation, blockers and limitations.
- `inventory.jsonl`: each source image, its boxes, hashes and audit outcome.
- `review-queue.jsonl`: blocked images and reasons.
- `review-template.json`: pending records; it never auto-approves an image.

After actual human review, copy the template to `reviews.json` and fill in `groupId`, `reviewer`,
`reviewedAt` (ISO date/time), `permissionConfirmed`, and `status` (`approved_defect` or
`approved_negative`). Keep the emitted hashes and policy version. Re-run into a new directory:

```text
node scripts/vlm-training/audit-roboflow-dataset.mjs --dataset ./data/roboflow-coco --reviews ./reviews.json --output ./output/roboflow-audit-02
```

Exit code 0 means every listed image passed these checks, 2 means review blockers or an empty
inventory, and 1 means invalid input/execution failure. Existing output directories are refused to
preserve audit history.

Changing image bytes, annotations or policy version invalidates the associated review. Missing
images, invalid boxes, unresolved labels, contradictory reviews, duplicate bytes and cross-partition
site overlap block eligibility. Hashes do not identify resized copies, crops or neighboring video
frames: reviewers must group these. Passing does not establish adequate class coverage or authorize
model promotion. The report is not a training dataset.

## Updating the main Mint AI model

Use the existing [reviewed VLM export](../scripts/vlm-training/REVIEWED-EXPORT.md) for permissioned,
human-verified assessment targets. Review the **whole scene** and all findings. Preserve source
images, corrected targets, model/prompt versions and provenance. Never fabricate severity, costs,
compliance or full assessments from Roboflow boxes alone.

Export grouped data with a content-bound split manifest, train a candidate adapter, then run
candidate and teacher against the same frozen held-out cases. Confirm schema success, unsupported
findings, missed defects, critical hazards, abstention, latency and cost. Expert-agreed thresholds
and a rollback plan precede promotion. Keep student predictions and teacher agreement separate from
ground truth.

## Remaining work and acceptance

### Inspection workflow implemented and staged (25 October)

The saved web survey at `/building-assessments/:id` now includes:

- Photo coverage from `analysis.imageIds`, preserving the AI input order even when attachment
  indexes have gaps or later photos are added. Older records explicitly show unknown coverage.
- Visible observations beside their corresponding AI input photos.
- A **Survey activity** form for corrections, repair reports and follow-up observations, with
  dates, details and selected photo evidence. Follow-up photos use the existing private upload
  and attachment endpoints; they do not rerun or overwrite the original assessment.
- Attributed activity history, including whether the assessment/photo set has changed since
  the entry was made. Corrections and follow-ups require photo references; a repair report may
  record work without photos and is labelled accordingly.

Persistence is implemented by `/api/assessments/:id/activity` and migration
`20261025124025_assessment_inspection_events.sql`. The API permits the assessment owner with
current property/job access, or an administrator. It validates photo ownership and source
fingerprints, binds the actor on the server and deduplicates retried saves by request ID.
The table enables RLS, grants only SELECT/INSERT to the service role, and blocks direct client
access. A database trigger checks evidence membership and uniqueness. Entries are append-only;
later corrections are new entries rather than rewrites.

**These are reports, not verified labels.** `reported-inspection-v1` records do not change AI
predictions, validation status, expert reviews, training consent or model memory. The existing
photo-first administrator review remains the independent-review step. Contractor participation,
structured repair costs, expert confirmation of individual activity entries and export of reviewed
longitudinal outcomes are subsequent work. No real activity reports or expert labels were fabricated.

The migration passed disposable local Postgres checks and was applied on 25 October to production
`ukrjudtlvapiajkjbcrd` (version `20261025124025`) and staging `pzothyoipifjwnypzcuv`
(version `20261025123949`). The local filename follows production. Staging's independently assigned
timestamp remains intact; do not blindly replay this migration there. Both databases passed live
RLS/grant/trigger checks. A production insert/read and rejected update/foreign-photo check ran in
a rolled-back transaction, leaving no sample reports. Before production promotion,
test with a permissioned staging property: open a saved survey, record a correction, upload an
after-photo, record the repair and follow-up, reload, then independently review the photos through
the admin review queue. Check a second account cannot read/write the activity and that the original
AI result and its input-photo mapping remain unchanged. Live browser/database integration is still
a release gate.

- Complete annotation/review and permission records; export actual images for the local audit. No
  full COCO image export has been audited in this session.
- Resolve duplicate/related captures and freeze independent train/validation/test groups.
- Establish reviewed detector and full-assessment benchmarks with class counts and agreed release
  gates.
- Train/evaluate candidate detector and VLM separately. Select models from measured results, not
  latest version numbers.
- Verify staging end to end, then promote with rollback and monitor errors/corrections.

The schema is deployed. App release verification, model retraining and completion of the annotation
backlog remain outstanding; deployment evidence is recorded separately as checks finish.

## Verification

```text
node --test scripts/vlm-training/audit-roboflow-dataset.test.mjs scripts/vlm-training/reviewed-bootstrap.test.mjs scripts/vlm-training/split-reviewed-sites.test.mjs
node apps/web/node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/lib/services/building-surveyor/__tests__/detector-label-policy.test.ts apps/web/lib/services/building-surveyor/__tests__/collect-evidence.test.ts apps/web/lib/services/building-surveyor/orchestration/PromptBuilder.test.ts
```

The first command passed 18 tests; the second passed 32. These are software regressions and fixture
checks, not real-world model accuracy measurements.

The initial AI/data patch also passed the shared-package build (10 packages), full web TypeScript
check and lint of the changed production TypeScript files. Vitest and the package build required
running outside the Windows sandbox because its file-operation restrictions prevented startup.

Inspection-workflow checks:

```text
node scripts/test-inspection-events-migration.mjs
node apps/web/node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/__tests__/api/routes/assessment-activity.test.ts apps/web/__tests__/components/InspectionActivity.test.tsx apps/web/lib/services/building-surveyor/__tests__/photo-coverage.test.ts
```

The migration test uses `@electric-sql/pglite`; `PGLITE_MODULE` may point to an existing local module.
It never connects to a live database. The focused workflow suite passed 23 tests, covering access,
source changes, photo references, retry behaviour, uploads and reporting. Existing status and expert
review regression suites passed a further 22 tests. These tests do not establish model accuracy.
The full web TypeScript check and lint of the changed production files also passed for the workflow.
