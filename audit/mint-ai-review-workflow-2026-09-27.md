# Mint AI photo review and capture diagnostics — 27 September 2026

## Changes

- Photo-first admin review queue and individual review page hide the AI result. The queue considers
  the latest 100 records and excludes marked QA fixtures.
- Rejected capture-quality assessments can be reviewed, while processing records and technical
  failures without evidence remain ineligible.
- Review form resets when switching assessment; identity comes from the signed-in account. Saving a
  personal review does not establish professional qualifications or automatically authorize
  training.
- Admin upload page reuses private photo upload and assessment endpoints. Saved rejected assessments
  show specific recapture guidance.
- Conservative soft-focus and low-detail warnings are attached to assessments and shown in both
  assessment displays. Blur alone does not reject a photo.
- Browser testing exposed a missing saved-record ID in the assessment response. The API now supplies
  the database ID on persisted, cached and coalesced results.
- Browser testing also found rejected inputs skipped image-reference persistence. The
  insufficient-evidence handler now retains missing indexed photo references so a reviewer can
  inspect the rejected evidence.

## Capture diagnostics

Development fixtures only; these are not independently reviewed capture failures.

| Cohort                      | Images | Hard rejections | Low-detail warnings | Soft-focus warnings |
| --------------------------- | -----: | --------------: | ------------------: | ------------------: |
| Original SDNET pilot        |    160 |               0 |                   6 |                   0 |
| Dark transformation         |     10 |              10 |                  10 |                   0 |
| Overexposure transformation |     10 |              10 |                  10 |                   0 |
| Blur transformation         |     10 |               0 |                   4 |                   4 |
| Upscaled low resolution     |     10 |               0 |                   5 |                   0 |

Metrics: `.vercel/mint-eval/capture-quality-v2.json`. The initial diagnostic run also added
diagnostic fields to v1; it should not be treated as an untouched historical artifact. Smooth
surfaces can have low texture, so warnings remain advisory. Real-world sensitivity and specificity
are not established.

## User review pack

The user volunteered to review the examples. The offline pack contains 20 shuffled public pilot
images with blank answers, no AI or publisher labels, readability/crack/uncertainty choices, and
observation notes. It allows partial downloads and marks every export `trainingAllowed: false` and
reviewer qualification `not_verified`. Nothing is submitted automatically.

- Open: `.vercel/mint-eval/your-review/index.html`
- Portable ZIP: `.vercel/mint-eval/mint-your-photo-review.zip`
- Rebuild: `node scripts/mint-eval/build_user_review.mjs`
- Source: SDNET2018, Maguire, Dorafshan & Thomas (2018), CC BY 4.0; attribution and source link
  included in the pack. Four photos are degraded.

Offline browser verification passed: 20 images/forms render, reviewer reference is required for
download, and an empty test export retained zero completed answers and disabled training. No human
answers were fabricated or submitted.

## Verification

- 27 focused web tests passed across quality checks, validation, review source, expert-review API
  and private photo upload.
- Final preview: https://mintenance-clean-fx6prej44-mintenance.vercel.app
  (`dpl_6caPCsLvihPzc7vWDC4f38ujdnyQ`), READY. Capture gate enabled.
- Build passed; lint reported 0 errors and 825 existing warnings.
- Full isolated Chromium check passed: sign-in plus MFA, private upload (201), dark rejection (422),
  saved recapture guidance, readable assessment (200), saved result link, repeat/cached result
  retaining the same ID, review queue (3 eligible sets), and rejected-photo review with the source
  image loaded.
- The blank review could not be submitted. No human review was submitted.
- Supabase MCP independently confirmed one source-photo record, zero training buffer entries and
  zero human reviews for each final QA assessment.
- Final dark record: `4b799233-e33e-45f3-9620-39c4da015171`.
- Final readable record: `e8526554-92a7-4cb9-a293-74c48954e4fa`.
- Earlier browser-regression fixtures retained and marked QA: `444f0f7f-d7b3-4e9b-8f24-bf5d2e0f67b8`
  (no photo reference before the fix), `f4f88948-f7fc-4a4a-9185-3fb6709cbf47` (readable result
  before ID fix).
- Machine-readable result: `.vercel/qa-ui-results.json`. Screenshots:
  `output/playwright/mint-browser-dark.png`, `mint-saved-recapture.png`,
  `mint-browser-readable.png`, `mint-browser-assessment.png`, `mint-review-queue.png`,
  `mint-photo-review.png`.

These passes establish workflow behaviour, not diagnostic accuracy. Visual inspection of the
readable output still found an inferred settlement cause and a repair-price estimate from one crack
image. Observation-first output with explicitly uncertain causes remains unfinished. No safety
conclusion or cause label from this QA run has been accepted as ground truth.

## Remaining work

User observations are pending. Qualified adjudication is still needed before using safety-critical
labels for training. Obtain fresh property-separated data, validate capture thresholds on real
photographs, integrate observation-first reasoning, and strengthen duplicate detection and
persistent split assignments. The foundation model remains unchanged. No GPU training or production
promotion was performed.
