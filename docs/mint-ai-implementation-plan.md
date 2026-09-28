# Mint AI implementation plan

Updated 25 September 2026.

## Objective

Build an inspection system that connects visible defects to photographic evidence, uncertainty,
expert review and maintenance outcomes. Begin with building inspections; validate rail and other
infrastructure as separate domains before using them operationally.

## Milestone 1 — assessment reliability (implemented locally)

- Mobile photo assessments invoke `POST /api/assessments/:id/analyze` on the record that already
  owns their photos. Results, model metadata and actual scores are saved by the server.
- Owner and current property/job access are checked before analysis. A conditional update claims the
  attempt; a run identifier prevents an older attempt overwriting a retry.
- Results are idempotent. Failed attempts preserve notes/photos. Processing attempts can be retried
  after a six-minute lease. This is a request-based worker, not a durable queue.
- Status distinguishes an available AI result from human validation. Empty placeholders are not
  shown as completed surveys. Mobile history offers analysis/retry and polls active work.
- Teacher and student output use the same parser. It supports existing flat and nested targets,
  rejects empty/truncated/malformed evidence and preserves hazards, urgency and zero confidence.
- Compliance severity survives normalization. Exported training targets remain JSON even when a
  teacher rationale exists.
- Shadow comparisons record parse/request failures and returned model identifiers. Teacher capture
  is scheduled after successful persistence; student predictions are not used as teacher labels by
  this new path.

Verification: shared package build; web and mobile TypeScript checks; focused route, parser and
distillation regression tests. These checks use mocks and do not establish real-world diagnostic
accuracy. No production database changes, deployment or model training have been performed.

## Known limits of this milestone

- The new photo route assesses up to four images and records exactly which images were used. More
  comprehensive multi-view coverage and visible coverage reporting are still needed.
- Existing walkthrough and generic survey endpoints remain separate. Their
  persistence/training-capture paths need consolidation.
- A process can stop after saving a result but before training capture. Move generation and capture
  into durable jobs with deduplication and recovery.
- The shadow prompt is rebuilt from context; exact teacher request capture is required for
  controlled comparison.
- Existing saved placeholders and training labels are unchanged. Do not turn historic
  model-generated labels into verified ground truth.
- Physical-device testing, real-provider response checks and a staging concurrency check remain
  before rollout. The local database diff command was blocked by the installed npm/npx shim; no
  schema migration is part of this milestone.

## Milestone 2 — evidence and evaluation

An initial expert reference-review workflow and historical evaluation report are implemented
locally. See [usage and verification](mint-ai-expert-review.md). It records review revisions and
source snapshots, excludes disagreement/insufficient evidence, and reports primary-label agreement
and critical-hazard metrics. The migration passed local transactional checks; 94 combined regression
tests and the web TypeScript check pass. A frozen held-out dataset and candidate-model runner remain
future work.

1. Inventory assessments with durable photo access, ownership/consent, model/prompt versions and
   usable labels. Separate synthetic examples, duplicates and incomplete records.
2. Add expert review for defect presence, category, location, severity, urgency and missing
   evidence. Record reviewer, timestamp, disagreement and resolution. Include healthy examples and
   difficult lighting/occlusion cases.
3. Split evaluation by property/site and capture session, keeping related frames together. Hold the
   test set out of retrieval, training and prompt tuning.
4. Build a repeatable evaluation runner for schema success, per-class precision/recall,
   critical-defect misses, unsupported findings, evidence localization, abstention, latency and
   cost. Report sample counts and uncertainty intervals.
5. Agree release thresholds with qualified surveyors before testing candidate models.
   Teacher/student agreement is diagnostic information, not an accuracy label.

Acceptance: a reproducible baseline on a reviewed held-out set, with failures traceable to original
photos and model versions.

## Milestone 3 — inspection workflow

- Guide capture of overview, detail and scale references. Detect blur, insufficient resolution,
  duplicates and missing views; request another image when evidence is insufficient.
- Attach every finding to an image and region. Separate visible observation, possible cause and
  recommended verification. Do not infer physical measurements without a calibrated reference.
- Track assets and findings over time, through expert decisions, work orders, repair and follow-up
  evidence.
- Add a durable assessment job queue, resumable uploads, idempotent capture and an audit trail.
  Expose incomplete image coverage to the user.

Acceptance: a surveyor can verify every finding, correct it and follow the repair outcome without
losing evidence.

## Milestone 4 — specialize Mint AI

- Compare suitable foundation models on the same reviewed benchmark before choosing a training
  target.
- Train adapters using permissioned, reviewed domain examples; preserve a fixed held-out test set.
  Record dataset lineage, training configuration and model version.
- Compare candidates in shadow mode, inspect failure groups and calibrate uncertainty on separate
  data. Promote only through the agreed release gates with rollback available.
- Evaluate specialist detection/segmentation where localization requires it; combine these outputs
  with language reasoning and explicit evidence provenance.

Acceptance: measurable improvement over the baseline on unseen sites, including critical-defect
performance and deployment cost.

## Milestone 5 — cameras and new domains

- Pilot camera ingestion with frame selection, temporal tracking, repeat-alert suppression and
  encrypted offline buffering. Keep heavier reasoning in the cloud initially; measure edge hardware
  requirements before selecting devices.
- Connect detections to stable asset/location identifiers. Track changes rather than issuing an
  independent alert for every frame.
- Build domain-specific labels, expert evaluation and escalation for rail and infrastructure. RGB
  cameras cannot establish hidden/internal defects; integrate appropriate inspection sensors and
  specialist review where needed.

Acceptance: a bounded site pilot with measured missed defects, nuisance alerts, connectivity
recovery and human response outcomes.
