# Mint AI staging rollout — 25 September 2026

## Database

- Supabase project: `ukrjudtlvapiajkjbcrd` (MintEnance).
- Applied migration: `20260925143317_mint_ai_expert_reviews`.
- Verified live: table exists, RLS enabled, public/client access denied, server SELECT/INSERT
  allowed, server UPDATE/DELETE denied.
- A real authenticated-role SELECT was denied in a rolled-back transaction. No sample reviews or
  training labels were inserted.
- REST access with the app's existing server credentials returned HTTP 200 and an empty review
  array.
- The local migration filename matches the remotely recorded version.

## Application

- Vercel project: `mintenance-clean` / `prj_AILYvESjfKhhj14FkzKWb2oJ1hWv`.
- Preview deployment: `dpl_ATi9jmMZtw5U4KyHX1boayTuPUYS`.
- Preview URL: https://mintenance-clean-gaxoyucne-mintenance.vercel.app
- Source: CLI upload of the current working tree, including uncommitted Mint AI changes. Vercel's
  displayed Git commit describes the base checkout, not all uploaded changes.
- Preview environment points to the same Supabase project as the live app. This is an isolated app
  deployment, not an isolated database. Use read-only smoke checks; deliberately submitted expert
  reviews become real reference records.
- No production app promotion was requested or performed.

## Checks completed before deployment

- Full local Next.js production build passed, including TypeScript and page generation.
- 94 assessment/review regression tests passed in the preceding implementation milestone.
- 3 staging-checker tests passed.
- Upload manifest checked: 4,210 files, approximately 61 MB before compression. Excluded credential
  backups, private keys, local emulator/audit artifacts and model-training datasets. New
  review/analysis routes and public app screenshots are included.
- Read-only staging checker:
  `node scripts/mint-ai-staging-smoke.mjs https://mintenance-clean-gaxoyucne-mintenance.vercel.app`.

## Remaining acceptance checks

- Vercel reports **READY**. Cloud build completed successfully.
- Live GET checks through Vercel protection returned application JSON `AUTH_REQUIRED` with HTTP 401
  for evaluation, expert-review evidence and assessment status. This verifies anonymous
  authorization, not authenticated review submission.
- Browser automation encountered Edge `ERR_BLOCKED_BY_CLIENT` on the preview API page; no browser
  protection was disabled. Signed-in UI verification remains pending.
- Sign in as an authorized application admin and open **Admin → Building Assessments**. Vercel login
  and Mintenance admin login are separate.
- Check the empty evaluation report and source-image loading for a completed assessment.
- Have qualified reviewers submit actual reviews, revise labels and resolve disagreements. Do not
  use fabricated labels in the shared live database.
- Complete physical-phone upload, interruption and retry checks before a production app rollout.
