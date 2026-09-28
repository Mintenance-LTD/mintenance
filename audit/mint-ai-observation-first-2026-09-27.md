# Mint AI observation-first staging — 27 September 2026

## Purpose

Apply the user's review findings without changing the foundation model or treating personal
observations as approved training labels.

## Implementation

- `MINT_OBSERVATION_GATE_ENABLED=true` enables a per-photo GPT-4o visible-evidence check after
  URL/capture validation. The final direct-photo path saves observations without a detailed
  diagnosis. Default remains off.
- Each photo receives a strict observation response: visible defect, no visible defect, or
  insufficient evidence. One readable image cannot hide an unreadable companion image.
- Capture warnings are advisory context, not automatic rejection. Readable smooth surfaces remain
  eligible.
- Insufficient evidence requests a sharp close-up and wider view for the specific photo.
  Invalid/truncated/provider-error responses remain technical failures, never healthy labels.
- A shared 90-second deadline, emergency stop, per-call budget checks and usage recording cover the
  added calls. The final direct-photo path makes up to four observation calls and avoids the legacy
  diagnosis call.
- The legacy assessment prompt receives the provisional observations and instructions to leave
  unsupported causes and conclusions unestablished. Prompt version is
  `building-surveyor-v5-visible-evidence`.
- New results store `visualEvidence` with `diagnosisStatus=not_established`. The two web result
  displays show observations and limitations, not the legacy cause, cost, insurance or condition
  scores.
- Automatic decisions are escalated; the auto-validation service refuses approval for this protocol.
  The protocol is part of the direct assessment cache key, avoiding reuse of old direct-route cached
  results.
- Review fingerprints include visual evidence.
- Admin review requires an explicit evidence-quality choice. Insufficient evidence clears defect
  labels. Offline review pack v2 disables crack labels until readability is selected and prevents
  unreadable photos becoming negative crack labels. The user's original review and pack remain
  unchanged.

## Boundaries

This is an incremental staging integration. Other older entry points still use legacy structured
assessments. The final direct-photo path returns observation-only data; required scalar database
columns retain explicitly uncomputed compatibility placeholders, withheld as null by the saved
status API. Older admin readers must be migrated before production enablement. They have not been
converted into a nullable observation-only API contract. No claim is made that all consumers are
migrated. The displayed observation prose can still be wrong; strict JSON validation cannot prove
visual correctness or eliminate speculative wording.

Before production promotion, migrate remaining consumers, evaluate on fresh property-linked
examples, measure added latency/cost, and adjudicate disagreements. The current public pilot is
development evidence only. No training or production promotion is performed.

## Verification

- Local TypeScript check passed.
- 17 focused tests passed across observation gating, observation schema, capture checks, review
  source and automatic-approval prevention.
- Offline Chromium review-form check passed: readability required, unreadable labels blocked, old
  negative label cleared when changing readability.
- Final staging/browser results recorded after deployment below.

## Browser-discovered correction

The first observation-gated staging run rejected the texture-only control in the subsequent legacy
diagnostic stage, despite accepting its evidence as readable. This is a real regression, not an
error in the human label.

The final direct `/api/building-surveyor/assess` path now uses a dedicated `observation-only-v1`
response when the staging flag is enabled. It persists visible evidence directly and bypasses legacy
diagnosis, scoring, auto-validation and distillation capture. Both defect and no-visible-defect
outcomes are valid, pending human review. Rejected evidence retains photo references; technical
failures are recorded as retryable failures.

The saved status API recognizes the strict observation contract and returns null for damage type,
severity, confidence, safety, compliance, insurance and urgency on these results. The database's
pre-existing NOT NULL scalar columns still require compatibility placeholders; they are explicitly
not computed judgments. Older readers that access those columns directly must be migrated before
production enablement. No schema migration was applied.

Photo ordering is preserved in cache identity. The new protocol has its own cache namespace, so
earlier diagnostic results are not reused. The new direct path makes one observation call per image
and no legacy diagnosis call; other older entry points still retain their legacy flow. Context-based
diagnosis, video/mobile and older admin consumer migration are outside this staged direct-photo
path.

Updated verification: 36 focused tests passed across 7 files, including a readable healthy
observation and suppression of placeholder scores in the status API. TypeScript passed after the
final changes. Live results below supersede the initial gated run.

## Final live verification

- Preview: https://mintenance-clean-q7taopye5-mintenance.vercel.app
- Deployment `dpl_5gwGRBnzRFe6gcTr41rBFtUD2e5s`: READY; both capture and observation flags enabled.
- Build passed TypeScript and lint (0 errors, 825 existing warnings).
- Authenticated browser with MFA uploaded all four examples through the real private upload endpoint
  (201 each):
  - User photo 3, pixelated: 422, specific insufficient-detail retake instruction. ID
    `b32f7aca-bdbb-4c33-a133-edfce5e46449`.
  - Readable crack `sdnet-008`: 200, visible crack observation; saved and cached result IDs match.
    ID `33b5862f-f592-40d3-9ec1-77755f442a63`.
  - User photo 8, blurred: 422, specific insufficient-detail retake instruction. ID
    `b2940ecf-6fe8-42f4-9f49-0b370382ad82`.
  - User photo 2, texture-only: 200, `no_visible_defect`, crack=false. ID
    `3ced2a60-b151-4a57-a503-e809ea6766a9`.
- Both readable results are `needs_review`; saved status returns null confidence and safety score.
  Response contains no legacy damage assessment or insurance fields.
- Browser visually verified crack and texture results; the crack source photo was confirmed loaded.
  Screenshots: `output/playwright/mint-observation-assessment.png` and
  `mint-observation-texture-result.png`.
- Supabase MCP independently verified one retained photo reference per case, zero training-buffer
  rows, zero human reviews, and actual provider model `gpt-4o-2024-08-06` on both readable results.
- All records are marked QA and excluded from independent evaluation/training. The public pilot
  remains development evidence; four passing cases do not establish general accuracy.
- First review-control automation attempt used an overly strict label locator and timed out even
  though the correct blank-choice control and source photo were visible. A read-only retry uses its
  combobox role; no additional model calls or human submissions are involved.

Earlier gated-run QA IDs retained: `b61953f6-98a9-4da7-af33-c716b5e83778`,
`4da33ebd-dfe1-417d-89fa-af469f3f6c71`, `b49cad6b-5d65-4a0a-a1dd-7b473a5e6118`,
`eb2997b7-6401-45a3-906c-1bc9b193f023`. The last record is the documented legacy false rejection,
not a valid unreadability label.

Final review-control retry passed: 3 eligible sets listed, rejected source photo loaded,
evidence-quality choice initially blank, insufficient evidence hides defect fields, unconfirmed save
disabled. Human reviews submitted: 0. Machine-readable result: .vercel/qa-observation-results.json.
Temporary preview-access cookie files cleared after testing. No production promotion, model upgrade,
GPU training, commit or push was performed in this turn.

## End-of-day mobile/admin compatibility follow-up

- Mobile quick scan preserves the observation-only envelope; it no longer routes it through the
  legacy severity/cost defaults. Saved/job assessment cards render visible findings separately from
  unknown cause, safety and price. Recapture outcomes retain priority.
- Older admin cards and review dialogs support visible evidence, exclude placeholder scores from
  severity/damage statistics, and hide quick validation. The server also rejects legacy validation
  for observation-only records before updating the database.
- Verification: 36 existing focused web checks, one new server validation safeguard, three mobile
  adapter checks, and web/mobile TypeScript checks passed. Native visual verification has not been
  performed. These final UI changes have not yet received a new staging browser pass; the earlier
  staging URL below remains the previously verified deployment.
- Read-only Supabase inventory: 730 assessments; 11 with property links and photos across three
  properties, dated July 26–August 2. Eight assessments have job links. This inventory does not
  establish freshness, consent, suitable image content or independent review eligibility. No new
  training labels were approved.
- Resume with native visual testing, a staging browser pass for these admin changes, and inspection
  of the property-linked candidates before selecting an independent holdout. Legacy mobile
  UnifiedAIService routes are separate from the observation endpoint and still need an end-to-end
  compatibility audit.
- End-of-day boundary: commit and push the Mint AI work; leave production and model version
  unchanged; stop until the user resumes.
