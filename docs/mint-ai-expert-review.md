# Mint AI expert review and evaluation

## Open the workflow

After applying `supabase/migrations/20260925143317_mint_ai_expert_reviews.sql` through the normal
deployment process, open **Admin → Building Assessments → Review**. The administrator needs current
MFA verification to save labels.

The expert reference form shows fresh signed links to the source images. Reviewers select the photos
inspected and independently enter the primary defect, severity, urgency and whether a critical
hazard is visible. They must record their relevant qualification/experience, explain their evidence
and confirm that they inspected the photos. Qualifications are self-declared; assign review duties
to qualified people, not every administrator.

Use `none` for both category and severity when no defect is visible. Use **insufficient evidence**
when the images do not support a judgement; diagnostic fields then remain null. A missing photo is
not a negative defect label. These visual reference judgements do not certify structural condition
or regulatory compliance.

Each save appends a revision with the authenticated reviewer, server timestamp, protocol version,
selected photo IDs and a snapshot/fingerprint of the AI output and evidence. A changed source
requires reloading before saving. Customer records and training labels remain untouched.

## Evaluation report

Click **Refresh evaluation** on the assessment administration page. The report groups by domain,
provider, model and prompt version and includes:

- Primary-category, severity and urgency agreement, with sample counts.
- Critical-hazard recall, precision, missed hazards, false alarms and missing model hazard
  judgements.
- Number of properties and cases without a property anchor.
- Reviewer disagreements and insufficient-evidence cases excluded from scoring.
- Approximate 95% Wilson intervals. Related observations from one site violate the independence
  assumption, so these intervals may understate uncertainty.

The latest revision per reviewer and source version is used. Reviewers must agree on the labels for
the version to be scoreable; a newer opinion from someone else does not override a disagreement. The
JSON endpoint `/api/admin/building-assessments/evaluation` includes source review IDs, a dataset
identifier and a generation cutoff for traceability. Pagination prevents silent truncation at
Supabase's default row limit; the interactive report refuses histories of 10,000 or more rows.

This is a **historical review audit**, not a held-out model benchmark. Reviewers can see the
original report, so anchoring bias is possible. A label on the primary defect does not measure every
finding, segmentation accuracy, physical measurements or diagnosis of hidden faults. No model
training or promotion is triggered by these reviews.

## Verification

- Regression tests: `apps/web/lib/services/building-surveyor/evaluation/report.test.ts`,
  `apps/web/__tests__/api/routes/expert-review.test.ts`, and
  `apps/web/__tests__/components/ExpertReviewForm.test.tsx`.
- Database check: `supabase/verification/expert_reviews_access.sql`. It asserts RLS and role grants,
  then verifies a real client read is denied. Run using psql with `ON_ERROR_STOP=1` after the
  migration.
- The migration and access check passed in a rolled-back transaction against local Supabase on 25
  September 2026. Applied to the linked Supabase project on 25 September 2026; live RLS and role
  grants verified.
- `supabase db diff --local` stops at the pre-existing
  `20260830090100_message_bid_hot_path_indexes.sql`:
  `CREATE INDEX CONCURRENTLY cannot be executed within a pipeline`. Resolve that migration workflow
  before relying on a full clean replay.

## Next acceptance gates

### Staging smoke checks

Run `node scripts/mint-ai-staging-smoke.mjs https://YOUR-PREVIEW-HOST` after deploying. This
performs only GET requests and verifies that anonymous requests are rejected by the application
itself. A Vercel authentication page does not count as passing application checks.

For authenticated checks, provide `MINT_STAGING_ADMIN_COOKIE` through the process environment, with
optional `MINT_STAGING_ASSESSMENT_ID` for a completed survey with photos. Supply
`VERCEL_AUTOMATION_BYPASS_SECRET` through the environment when preview protection requires it. Never
put credentials in command arguments or commit them. The checker prints only check names, status
codes and pass/fail results. Authenticated checks are explicitly reported as skipped when no admin
session is supplied.

The migration is now applied to Supabase project `ukrjudtlvapiajkjbcrd` as version `20260925143317`.
Live checks confirmed RLS enabled, client read/write denied, server read/insert allowed and server
update/delete denied. No sample expert labels were added.

1. Apply the migration and app change in staging. Use two real reviewer accounts to review photos,
   revise a label, create a disagreement and verify report exclusion. Test MFA expiry and
   private-photo loading.
2. Complete physical-phone assessment/upload/retry tests. Browser/component tests do not cover app
   suspension, camera permissions or device networking.
3. Collect qualified reference reviews, including healthy cases and rare critical faults. Resolve
   disagreements with a documented adjudication process.
4. Freeze a permissioned dataset, split by property/site and capture session, exclude duplicates and
   training-contaminated cases, and run candidate predictions against it. Only then use the results
   for model selection or promotion.
5. Extend to finding-level evidence regions, multiple defects, explicit abstention and repair
   outcomes. Establish domain-specific release thresholds with surveyors.
