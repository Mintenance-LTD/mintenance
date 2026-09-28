# Readiness checkpoint — 24 September 2026

Readiness cannot yet be established. This checkpoint consolidates the latest results; older reports
contain historical blockers that later checks superseded. It does not mark the overall goal
complete.

Latest targeted follow-up:
[money/contracts and management acceptance](MONEY-MANAGEMENT-GATES-2026-09-24.md). Both cookie and
bearer upload-to-contract journeys and manager API revocation passed. A real browser revocation test
found and verified a fix for a structured-error rendering crash; bearer uploads also required a
verified-identity rate-limit fix. Fifty-nine focused tests passed. These results reduce the
remaining work but do not close the full money or management gates.

## Current source and deployment

Source branch: codex/migrate-next-proxy, pushed through 26decb0c6. The latest source adds native
retained-dispute discovery; prior commits repair disputed history states and private native readers.

Read-only Vercel metadata identifies the live www.mintenance.co.uk alias as deployment
`dpl_3ecgLoXifpsAJDkyq64x7Uv2uHYP`, main commit `b34fca6d5942edfb542accdeec31c0467774fa40`. The
newer branch commits are preview deployments, not the live alias. The nested apps/web project link
returned no deployments; the workspace-root project link identifies the active project. No
application promotion or deployment command was issued.

## Refreshed verification

- Full web coverage: 404 files / 4,066 tests passed; command exited zero. Coverage thresholds passed
  without changes: statements 52.62%, branches 46.99%, functions 57.36%, lines 53.44%.
- Seventeen focused native archive-list/detail tests passed, and mobile type checking passed.
- Real isolated Android dispute details: live/retained statement, renewed private browser hand-off,
  unavailable attachment, and account-removal sign-out observed. Both participant accounts fetched
  actual PNG bytes before/after archival; an unrelated account was denied.
- Native archive-list verification is component-only; it was added after the Android run. An
  existing debug binary loaded current JavaScript. Metro HTTP font/icon URLs were correctly blocked;
  physical release-device visual acceptance is not established.
- Temporary Android app/browser data, active synthetic records/accounts/object and credential file
  were removed; tunnels and owned servers/emulator stopped. Protected synthetic archives remain in
  the isolated local database. No retention control was disabled.

## Remaining acceptance work

| Gate                | Completed evidence                                                                                                                                       | Still required                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Money and contracts | Real Stripe test-mode 3DS, escrow confirmation, retry-safe transfer, separate connected-account bank payout and Android hand-off; focused recovery tests | Combined final role journey and provider/database fault recovery acceptance against the release candidate                                                                      |
| Retention           | Immutable database archive controls; actual surviving-party evidence access; review/hold/disposal controls; native reader and discovery                  | External-object/processor reconciliation and disposal, backup expiry/restore replay, closed-account identity/export, archive pagination beyond 50, accountable policy approval |
| Invitations         | Acceptance identity checks, retry/cooldown/concurrency repairs and local role/API checks                                                                 | Complete captured-email/new-account/verification/MFA acceptance and failure recovery journey                                                                                   |
| Property management | Five-role cookie/bearer matrix and targeted web/mobile repairs                                                                                           | Final representative management UI journeys, interruptions and revoked-access behavior across clients                                                                          |
| Devices             | Actual Android sandbox payments, PDF, maps, push and retained dispute reader in documented test builds                                                   | Current release build, native archive-list/device recheck, physical Android/iOS, interruption/permission/deep-link matrix                                                      |
| Operations          | Local recovery tests and source schedules; refreshed hosted metadata                                                                                     | Hosted run/alert evidence, durable push receipts, security-advisor disposition, final release decision                                                                         |

## Hosted checks and limits

The Supabase MCP security advisor was refreshed at 17:22 UTC. It reports:

- 73 informational RLS-enabled/no-policy tables, including intentionally server-only financial and
  evidence queues. This is not itself proof of exposure; privileges and intended callers matter.
- Public spatial_ref_sys without RLS and PostGIS in public.
- Ten anonymously callable and eleven authenticated-callable SECURITY DEFINER signatures. Several
  are RLS predicates intentionally exempted by the internal-surface migration. These require
  function/caller/privilege review, not indiscriminate removal that could break policies.
- Leaked-password protection disabled, and PostgreSQL security patches available.

No production mutation or user-row query was performed for this refresh. No new SQL migration was
added during the native evidence work. The advisor is not a clean security bill of health.

Vercel get_project has a connector argument mismatch (expects idOrName while the exposed schema
supplies projectId). Deployment listing/details worked. A grouped production log query for
/api/cron/ on the identified live deployment over 24 hours returned no rows. That establishes
neither successful execution nor absence of schedules. Recovery workers were not manually triggered.

Remediation references:
[Supabase RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public),
[callable privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
[PostgreSQL upgrades](https://supabase.com/docs/guides/platform/upgrading).

## Full mobile run and restored authentication checks

The complete mobile run finished all assertions: 470 suites passed, 12,336 tests passed, five
skipped, and 87 snapshots passed (289.35 seconds). Jest warned about unfinished asynchronous work
and remained alive after the results; its exact owned process was stopped. This is a passed
assertion run with unclean shutdown, not a zero-exit full-suite result. Open-handle diagnosis
remains required.

The five historical AuthService skips were then rewritten against the actual profile boundaries:
GET/PUT /api/users/profile for current-user/save behavior, and the current sign-in profile resolver.
No application behavior was changed. The complete AuthService file now passes all 39 tests with
--detectOpenHandles and exits zero; no tests remain skipped in that file. This focused run does not
prove the full suite's open-handle problem resolved. Full mobile coverage thresholds were not run.

## Hosted recovery follow-up and tracking repair

Read-only aggregate Supabase MCP queries found zero cron_job_runs entries in the last 48 hours, four
entries in total, and a latest start at 2026-06-11 20:23:52 UTC. No payloads, error bodies or user
records were selected. This materially limits recovery assurance; tracking failures can also hide
execution. Do not equate these missing records with confirmed absence of all provider invocations.

A fetched copy of the exact live commit confirms notification-processor is scheduled daily at noon;
the pushed source changes it to every five minutes and separates daily learning. These changes are
not yet on the live alias.

The shared cron wrapper previously ignored returned Supabase errors while saving completion, because
only thrown exceptions entered its catch. It now emits the existing tracking warning for returned
errors too, without leaking raw database diagnostics or changing/replaying the business operation.
Seven focused tracking/notification tests pass. The earlier full web coverage run predates this
small wrapper change. This does not install missing schedules or establish an operational alert
response; those remain required release checks.

A subsequent full mobile run with --detectOpenHandles passed 470 suites, all 12,341 tests and all 87
snapshots with no skipped tests. It again remained open and emitted post-test logs from the
memory/performance monitors; the exact owned process was stopped after assertions finished. The
monitoring stacks identify unfinished work, not conclusively the sole cause of the hang. Do not
claim a clean full-suite exit or mask this with --forceExit. Focused AuthService handle detection
exits cleanly.
