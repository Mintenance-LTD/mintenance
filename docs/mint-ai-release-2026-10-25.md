# Mint AI inspection activity release — 25 October 2026

## Scope and source

Application commit `1f2c0a17cdfd78f82fdb35d08bf5e9f8e36dab8e`; follow-up test-only commit
`9d60b33e`. Pull request: https://github.com/Mintenance-LTD/mintenance/pull/1421.

Includes visible-evidence prompt and detector-label corrections, a reviewed-data audit tool,
ordered AI photo coverage, and attributed inspection activity. No model training, detector/VLM
version change or routing change was performed. Annotation and independent evaluation remain
necessary before any trained model is promoted.

## Database

Migration `assessment_inspection_events` applied to:

- Production `ukrjudtlvapiajkjbcrd`: `20261025124025`.
- Staging `pzothyoipifjwnypzcuv`: `20261025123949`.

Both passed live catalog checks: RLS enabled; no anon/authenticated client grants; service role
SELECT/INSERT only; no service UPDATE/DELETE; evidence-validation trigger installed.
A production transaction verified insert/read, forbidden service-role update and rejection of
foreign-assessment evidence, then rolled back. That test left no rows.

Automatic approval review rejected an optional attempt to align staging's migration-history
timestamp with production. No history metadata was changed. The local SQL filename follows
production, and staging retains its original recorded version. Do not blindly replay the migration.

## Vercel

- Team: `team_NqsZeD12p5a5YlE9BJcqrVA9` (Mintenance).
- Project: `prj_AILYvESjfKhhj14FkzKWb2oJ1hWv` (`mintenance-clean`).
- Staged production build: `dpl_H8Z4JKUJJ6zAhPsuafYDNunpkdYi`, READY.
- URL: https://mintenance-clean-mwnc050ct-mintenance.vercel.app.
- Built with production environment and `--skip-domain`; cloud build passed.
- Previous live deployment / rollback target: `dpl_2Vj1KNYRrW4RsQ41HWATGHhWPLUZ`.

The connector's protected fetch could not distinguish the app login from deployment protection.
Authenticated `vercel curl` succeeded: both the new activity API and the evaluation API returned
application JSON 401 to anonymous callers. Deployment protection was not disabled.

Production domain promotion is pending the remaining verification recorded below.

## Browser and database evidence

The user signed in through the normal login screen on the staged hostname. No cookies were copied,
sessions minted or credentials extracted. The homeowner could not access another account's existing
synthetic survey (`d7e8df69-8810-4077-b027-dbfdefe3be6f`).

For the write test, a separate, clearly marked synthetic fixture was created:
`75eb5e85-a3e9-4eeb-817f-f85efb011c4d`. It has no linked property or job, confidence zero,
`qa_fixture: true`, an insufficient-evidence outcome and an explicit instruction not to train on it.
It is retained for reproducibility; no older test data or customer records were deleted.

The browser displayed the recapture warning and suppressed assessment conclusions. A labelled
SOFTWARE QA ONLY repair report without photo evidence was saved through the normal form and
survived a full reload. The history correctly said `Evidence: No photos linked`.
Supabase confirmed `reported-inspection-v1`, server-assigned owner attribution, unchanged
insufficient-evidence result, `auto_validated=false`, zero expert reviews and zero training rows.

The browser extension blocked automated local-file selection even after the user reported enabling
file URL access and after restoring the browser session. Manual upload of
`.vercel/inspection-qa-blank.png` was requested. End-to-end
photo attachment and photo-linked correction/follow-up checks are pending. Automated upload,
attachment-failure, source-change and evidence-membership tests pass.

Vercel runtime error/fatal query for this deployment returned no matching logs at 13:03 UTC.
This is a bounded check, not a guarantee of absence of errors.

## Test evidence

- Earlier AI/data policy suites: 18 Node + 32 Vitest tests passed.
- Workflow, API and component regression checks: 70 passed before release staging.
- Local disposable Postgres migration, permissions and constraints passed.
- Shared package build, full web TypeScript, changed production lint and cloud build passed.
- Smoke-check tests: 4 passed, including rejection of hosting HTML as an authorization result and
  failure when the authenticated inspection schema is missing.
- Initial full CI: 544 suites passed, one survey-page suite failed (three tests). The old suite
  answered the new activity request with a status fixture and expected a detector link without
  detector results. Its fixtures now isolate activity (covered independently), provide stable photo
  IDs, and assert conditional detector links and ordered AI input coverage.
- Corrected survey/activity/API/photo coverage suites: 35 tests passed.
- CI rerun on `9d60b33e` passed the complete Code Quality & Testing job: web/mobile tests and
  coverage thresholds, TypeScript, lint, access-control gates and dependency audit. The overall
  Mintenance CI/CD Pipeline, Security Scan, database integration, performance budget and Lighthouse
  workflows also passed. Separate E2E and deployment workflows were still running at the final
  status check; do not claim all checks passed or merge while required checks remain pending.
- The local full run executed 4,930 tests: 4,927 passed and three failed because it was launched
  from the repository root while those tests resolve paths from the web working directory. All
  20 tests in the two affected suites passed from `apps/web`, matching CI. No production source
  was changed to compensate for the invocation error.

## Continue the release

1. In the signed-in staged browser, open
   `/building-assessments/75eb5e85-a3e9-4eeb-817f-f85efb011c4d`. Select the synthetic PNG above
   with **Add follow-up photos**. The extension permission error is outside the app; do not weaken
   app authentication or storage policy to work around it.
2. Verify the attachment renders, save a correction marked SOFTWARE QA ONLY with outcome **More
   evidence needed**, then a similarly marked follow-up with outcome **Unknown**. Reload and check
   photo references, unchanged source result, and zero expert/training rows. Do not claim a real
   repair or assign a defect label to the blank image.
3. Check the final required GitHub checks on the latest head. The final documentation commit does
   not change the staged application bundle.
4. Promote `dpl_H8Z4JKUJJ6zAhPsuafYDNunpkdYi` in the verified Mintenance team/project, confirm
   `www.mintenance.co.uk` points to it, then repeat authenticated read/smoke and runtime-error checks.
   Keep the recorded previous deployment available for rollback. Record the result here and finish
   the PR through normal required checks.

The application is **not promoted** and the PR remains a draft at this handoff. The synthetic
fixture and its single labelled activity are retained. Screenshot proof is local and ignored:
`.vercel/inspection-activity-qa.png`. No real customer property was changed.

Do not describe these checks as measurements of real-world defect-detection accuracy. The private
Roboflow queue and reviewed-data gates are documented in [MINT_AI_CONTINUATION.md](MINT_AI_CONTINUATION.md).
