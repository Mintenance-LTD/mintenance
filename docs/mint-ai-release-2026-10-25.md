# Mint AI inspection activity release — 25 October 2026

## Latest observed state

At the later technical-prep check, PR #1423 was merged and all its checks passed, including E2E
shards 1 and 2 (run `40204725136`). Production `www.mintenance.co.uk` resolves to READY deployment
`dpl_9x6PHC188ZnPbyrHP3YAuU54ipGJ`, source `2c30907f61b8f9df29340cb8b28c8a796d96d033` on `main`.
This includes PRs #1423, #1425 and #1426. Do not promote the older staged bundle described below.

The new `fix/mint-pilot-isolation-oct25` follow-up extends the existing beta training hold to
assessment-history retrieval, continuum and learned memory, repair/progression/validation learning,
legacy assessment export and the bootstrap export command. Background capture now exits before
teacher/shadow processing. Current-photo analysis and curated reference knowledge remain usable.
There is no environment bypass and no new database migration. These application guards do not
restrict privileged database operators or establish source consent. Real cases remain pending
deployment verification, reviewer appointment and permission records.

Local validation of isolation commit `f78d053a3a774cc1bc47b4c3be5cd570e2f92fa3`: all **4,948 web
tests / 547 files** passed, plus 15 pilot/CLI tests and full web TypeScript. Changed production lint
had no errors and three existing unused-symbol warnings. PR #1427 contains this follow-up.

Authenticated upload and photo-linked save/reload passed on the live main deployment above at
18:21 UTC. Automated file selection remained unavailable, so the user selected **five building
sample photos**, not the requested blank PNG, through the normal chooser. All five rendered after
reload. The QA fixture retains its test-only source and now has these attributed reports:

- Correction `8694888c-5b65-4ac1-a15d-0ed59dc4b220`: `insufficient_evidence`, five linked photos.
- Follow-up `2bd9476d-8336-49a6-907b-03bd69c761e8`: `unknown`, one linked photo.
- Earlier repair `9a79d7f4-242c-4ed4-88d5-ed6025329002`: no photos and no claimed outcome.

The new notes explicitly describe software QA, not independent judgements or real repairs.
Browser reload and database verification agree: five photos, three activity entries, **zero expert
labels, zero training rows**, unchanged source JSON MD5 `010064c8eca5451eab94311a0db911ad`,
confidence 0 and validation status `needs_review`. No pilot case or training label was created.

The user then requested improved survey styling. The follow-up adds the shared navigation shell,
a clear header and recapture banner, responsive form/history cards, styled upload controls and
photo-selection states. The existing page, activity and API regression tests passed (33 tests).
CI now also runs the 15 pilot/CLI tests. Visual preview and final deployment must be verified on
the resulting commit; the live main upload check does not prove the new UI or isolation is deployed.

### Earlier release observations (historical)

During pilot preparation, GitHub showed PR #1421 had been merged by the repository user as
`d41abb7a9118914f4ec44a8edd0c6a8a5ee94adf` (21 of 22 checks passed). Vercel confirmed
`www.mintenance.co.uk` points to READY production deployment `dpl_6aWQU6Cg4Lx4bQgbcQJFEMKWWU6W`,
built by Git integration from that merge. This supersedes the earlier **not promoted** status below;
the agent did not manually promote the staged deployment. Photo-upload verification is still pending.

Main then advanced through PR #1422 to `df7ff33678a1f4b83eecdfcfac97247de7f2313c` (native build CI
configuration). Its production deployment `dpl_6HT6ypbNJY6LsGF2YQR2uFynLB8Q` was BUILDING when
checked. The pilot/accessibility work now uses a separate follow-up branch,
`fix/mint-field-pilot-oct25`, incorporating that main revision. Do not rewrite or reopen merged PR
#1421, roll back another person's release, or describe the new follow-up as already deployed.

The remaining sections retain the staged-release evidence and unfinished checks, followed by the
pilot preparation follow-up. Verify current aliases again before any future promotion.

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

### Pilot preparation follow-up

The owner requested pilot preparation with the independent reviewer still to be arranged. The
[field pilot pack](pilot/README.md) now provides the proposed scope, capture register, reviewer
handoff and documentary readiness checks. All 14 checker tests passed. No field cases, permissions,
reviewer qualifications or expert labels were invented. Actual exclusion of pilot records from
training capture/retrieval remains an operational prerequisite, not a capability of the manifest.

Later CI on `6c294687` completed with E2E shard 1 failing and shard 2 passing (run `40197307651`).
The failure was the legacy dashboard rendering two h1 headings; its welcome heading is now h2 under
the existing Dashboard h1. Contractor Discover also had a flaky contrast scan during the delayed
location dialog entrance animation. The test now waits for the fixture's dialog to be visible and
fully opaque, scans it, dismisses it through the normal button and scans the underlying page too.
No accessibility assertion was disabled. The new CI run must pass before promotion.
Full web TypeScript passed after this change. Changed dashboard lint passed with one existing
navigation warning; the E2E directory is excluded from ESLint and will be verified by browser CI.

These source changes supersede the staged application bundle for the next release. **Do not promote
the previously staged deployment below as the final revised release.** Build and verify a new staged
production deployment from the updated commit after the checks pass, then record its ID here.

### Remaining deployment checks

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
4. Promote the newly built and verified staged production deployment in the Mintenance team/project, confirm
   `www.mintenance.co.uk` points to it, then repeat authenticated read/smoke and runtime-error checks.
   Keep the recorded previous deployment available for rollback. Record the result here and finish
   the PR through normal required checks.

The application is **not promoted** and the PR remains a draft at this handoff. The synthetic
fixture and its single labelled activity are retained. Screenshot proof is local and ignored:
`.vercel/inspection-activity-qa.png`. No real customer property was changed.

Do not describe these checks as measurements of real-world defect-detection accuracy. The private
Roboflow queue and reviewed-data gates are documented in [MINT_AI_CONTINUATION.md](MINT_AI_CONTINUATION.md).
