# Supervised building inspection pilot

Prepared 25 October 2026. **Preparation only. Independent reviewer still to be arranged.**
The owner requested a pilot pack while reviewer assignment remains open. No properties have been
enrolled, no review labels have been approved and no field accuracy claim is supported by this pack.

This is a workflow pilot for capturing evidence, saving an assessment, recording corrections,
documenting work and checking follow-up. The separate public SDNET crack experiment under
`scripts/mint-eval` does not replace fresh property evidence or a qualified building reviewer.

## Proposed scope

Start with **10 permissioned properties and approximately 30 assessments**: a small set of initial
observations and repeat visits where actual work occurs. These are planning numbers, to be agreed
with the reviewer; they are not a statistically justified accuracy benchmark. Do not manufacture
repairs or revisit dates to meet a target.

Include ordinary no-visible-defect scenes, visible defects and difficult/insufficient evidence.
Do not let the AI's predictions determine the reference category. Record all attempted assessments,
including failures and recaptures. Capture additional defects as separate observations; the current
expert form scores a primary category and cannot validate every finding in a complex scene.

| Responsibility | Current assignment | Before field use |
| --- | --- | --- |
| Pilot coordinator | Unassigned | Agree properties, permissions, retention and participant contact |
| Independent building reviewer | To be arranged | Record relevant expertise, appointment and independence; verify admin/MFA access |
| Capture operator | Unassigned | Follow capture sheet and record inaccessible areas |
| Incident/escalation owner | Unassigned | Agree a human contact and response procedure with the reviewer |

## Prepare the private register

Keep participant identities, addresses, permission documents and actual photographs out of Git.
The app remains the source of private image access. Store permission references in the register,
not signed URLs or access tokens. Use the coordinator's approved private storage for the completed
pack. `.vercel/field-pilot` is an ignored local working location, not a backup or access-controlled
team repository.

```powershell
New-Item -ItemType Directory -Force .vercel/field-pilot
Copy-Item docs/pilot/pilot-manifest.template.json .vercel/field-pilot/manifest.json
Copy-Item docs/pilot/capture-register.template.csv .vercel/field-pilot/capture-register.csv
node scripts/mint-eval/check-field-pilot.mjs --manifest .vercel/field-pilot/manifest.json
```

Copy once; preserve completed registers and prior versions. The untouched template intentionally
returns exit code **2** and lists pending work. Exit 0 means documentary fields are complete; exit 1
means invalid input/execution. The checker makes no network requests and changes no files or data.
It cannot authenticate declarations or prove source permissions, qualifications or operational
training isolation. A passing report does not authorize a model release.

Fill `reviewer` with `userId`, `expertise`, `appointmentReference` and
`independenceConfirmed: true` only after appointment. Each release check needs a receipt with
`verifiedBy`, `checkedAt` (ISO timestamp) and `evidenceReference`, for the exact recorded deployment
and 40-character commit SHA. Recheck and replace receipts when the relevant source or release changes.
Keep historical registers. The checker validates field presence; it cannot detect stale receipts.

Each enrolled `cases` entry has:

- `assessmentId`, `propertyId`: real app UUIDs; no synthetic QA fixture IDs.
- `captureGroup`: stable property/visit group shared by related frames, crops and recaptures.
- `sourceType: "permissioned_field_capture"`, `trainingAllowed: false`.
- `permission`: `reference`, `recordedBy`, `captureAndReview: true`. Permission to capture/review
  is separate from any future training permission.
- `sourceFingerprint`: the saved review source fingerprint, not an invented hash.
- `photos`: objects with the app photo `id`, original-byte `sha256`, and `view` set to `overview`,
  `detail` or `context`. Enrol at least one overview and detail. Actual AI coverage is shown in the
  saved survey; extra attached photos are not automatically assessed.

The checker catches repeated assessment/photo IDs, identical image hashes, missing permissions,
missing views, invalid fingerprints and a capture group mapped to different properties. A human
must still reconcile related crops and neighbouring frames. It does not create train/test splits.

## Capture and follow-up

1. Confirm permission and property identity. Assign room/asset and capture group before taking photos.
2. Take a well-lit overview showing the location, then a focused detail of the visible issue. Add
   context where needed. A scale reference must be in the same plane to support a measurement;
   otherwise record size as unknown. Record obstructed/inaccessible areas without guessing.
3. Check focus, exposure and coverage. Retake unusable views and keep a record of the attempt.
   Use existing safe access; do not disturb materials or approach a suspected hazard for a photo.
4. Save the survey. Record its ID and photo IDs. Check which images the AI actually used and whether
   the outcome is insufficient evidence. AI output is a proposal for review.
5. If there is a visible concern needing prompt attention, use the human escalation procedure agreed
   for the pilot. Do not wait for model scoring or interpret a low score as clearance.
6. Record a correction under **Survey activity** with the relevant photo evidence. It remains an
   attributed report, separate from the original result and independent expert labels.
7. After actual work, upload the after-photo and record what was done, by whom and when. Use the same
   view/lighting where practical. A work report without photos is explicitly unverified.
8. On an agreed follow-up date, record observed change, no visible change or insufficient evidence.
   Record further concerns honestly. A repair report does not prove the cause or defect was resolved.

## Reviewer handoff

Use `/admin/building-assessments/review-queue` and the photo-first review page for each enrolled ID.
The queue covers only the latest 100 assessed records; the manifest is the cohort register and direct
review links may be needed for older records. The queue is not a pilot membership or permission gate.

Before viewing the AI report, inspect the original photos, mark the photos actually reviewed, record
evidence sufficiency, primary visible category, severity, urgency, critical-hazard judgement,
expertise and reasoning. Use `none` only for no visible defect in the reviewed content; use
insufficient evidence when the photos cannot support a judgement. Do not certify a building from
these photos. Save with current MFA and record the returned review ID in the capture register.

Then compare the reference judgement with the AI result and record unsupported findings, missed
visible defects, inadequate coverage and recapture needs. Do not silently change the independent
reference to agree with the model. A reviewer who has already seen the AI output must disclose that
exposure; the current UI cannot prove blinding or independence. Disagreements need a separately
appointed adjudicator or remain unresolved. Revised labels append a new review; retain the old ID.

## Before starting real cases

- Finish the release checks recorded in [the release record](../mint-ai-release-2026-10-25.md),
  including authenticated upload and photo-linked save/reload, tenant isolation and unchanged AI
  evidence. Record exact commit/deployment and CI results.
- Appoint the reviewer and coordinator, obtain capture/review permission and agree the scope,
  retention, removal process, contact and escalation procedure.
- **Verify the deployed beta reuse hold before enrolment.** The application policy blocks training
  capture and exports for all customer assessments. The pilot-isolation follow-up also disables
  assessment-history retrieval, continuum memory, learned feature state and learning from repairs,
  follow-ups or validation. Current-photo assessment and curated reference knowledge remain usable.
  The legacy bootstrap export command exits 2, including `--dry-run`, before database access.
  These are application/code guards, not database-level restrictions on service-role operators.
  Record the deployed commit containing the guards and its passing checks before real enrolment.
  The manifest's `trainingAllowed: false` remains documentary; no per-source consent or cohort
  ingestion mechanism exists. Do not lift the global hold until those controls are implemented.
- Confirm the reviewer can load private photos and save with MFA. Do not grant broad admin access
  solely to populate the pilot; use the existing account approval process.

## Decision at the end

Report attempted/completed cases and distinct properties; upload/retry failures; coverage gaps;
recapture rates; review completion and disagreements; visible missed defects and unsupported
findings; unresolved critical concerns; and actual repair/follow-up evidence. Separate model failure,
insufficient evidence and unknown outcomes from negatives. Record latency/cost only when measured.

The existing evaluation screen is a historical audit of primary labels. It does not measure all
findings or establish held-out accuracy. Agree benchmark criteria and any model acceptance thresholds
with the reviewer before candidate testing. Keep all related property/capture groups together and
verify exclusions in retrieval and training before freezing an independent benchmark. The reviewer
and owner decide whether the workflow is usable, what failed and what must change. Model training
and promotion remain separate, evidence-based decisions.
