# Funded-job recovery and native interruptions — 24 September 2026

Scope: branch `codex/migrate-next-proxy`, starting commit `19fccd649`; initially clean. All database
operations used the isolated Docker Supabase instance (55321), all payment operations used Stripe
test mode, and all Android interaction used the dedicated audit emulator. No live money, production
data, deployment, or hosted migration was changed.

## Confirmed defects repaired

1. Payout retry after provider success / final database failure was rejected with HTTP 400
   (`release_pending` was absent from the shared state machine). The route now admits pending
   recovery to the locked claim function. The function requires an existing transfer journal and the
   original release reason, preserves the original reconciliation identity, and rechecks completion,
   approval, cooling-off, disputes, holds, and refund balances. The existing transfer service
   retrieves the recorded transfer and validates its terms. Changed terms remain a reconciliation
   error rather than a second payment.
2. Android rejected a revoked manager's access-details write but left private cached fields visible.
   It also missed `statusCode` when classifying API errors. Denied access now clears form fields and
   property-specific query caches and replaces the property content with an access-unavailable
   screen.
3. A later full-journey run failed in after-photo processing with
   `Body is unusable: Body has already been read`. Before/after photo routes now use the bounded
   form already parsed for the idempotency fingerprint, rather than reading the request body a
   second time. This removes the failing second-read operation; the precise intermittent Next
   development-server trigger was not established.

## Executed evidence

- Actual API journey: upload job photo, create job, submit/accept bid, acceptance retry, exactly one
  generated contract, both parties sign, unrelated-user denial, server-derived GBP100 funding
  despite a GBP1 client amount, repeated intent creation, provider confirmation with an injected
  local `held` update failure, confirmation retry, before photos, funded start, missing-after-photo
  denial, after photos/completion, unrelated approval denial, explicit approve-and-release, real
  test transfer with injected final `completed` update failure, reconciliation row, retry returning
  success, exactly one provider transfer, and final payout matching that transfer. The recovery run
  passed these assertions.
- The first successful recovery run's fixture-user deletion failed because audit rows retained actor
  foreign keys. Provider transfer reversal/refunds and webhook restoration had already run. The
  diagnostic now deletes its own synthetic actor audit records before deleting fixture users. A
  subsequent run verified cleanup but exposed the photo-body failure above; final rerun results are
  recorded below.
- Real local Postgres regression (`remediation-journaled-release-recovery.sql`): rolled-back
  fixtures verify journaled retry, stable reconciliation ID, refusal of
  unjournaled/changed-operation claims, approval and cooling-off enforcement, refund review
  protection, and no anon/authenticated execution privilege. Passed.
- Local schema diff completed using the installed Supabase CLI equivalent of
  `npx supabase db diff --local`, pointed at the isolated stack. The normal unprivileged npx
  launcher was inaccessible; the existing CLI executable was used. Migration
  `20260924205332_resume_journaled_escrow_release.sql` is local-only and still requires coordinated
  rollout with the route change.
- Focused web checks: 4 files, 71 tests passed. Native management checks: 1 suite, 8 tests passed;
  Jest required explicit force-exit because of existing open handles. Mobile type check passed.
- Actual Android: synthetic manager signs in, reaches shared property via Profile → My Properties,
  edits access notes, loses network, sees a network-error dialog, retains input, reconnects,
  retries, backgrounds app, and receives confirmed success. The database contained the intended
  notes. Owner revocation through the real team API blocked the existing manager session's reads and
  concurrent writes. The stale native save was denied without persisting. After the client fix and
  app restart, a repeated synthetic membership revocation caused the native view to hide private
  details and show access unavailable. The second membership removal was an isolated fixture
  operation; the owner API had been exercised in the first run.
- Five-role cookie-authenticated management fixture also passed: owner, manager, team administrator,
  viewer, unrelated user; contact/schedule authorization, reporting-link generation/revocation, team
  privileges, and concurrent/repeated invitation acceptance. No invitation email was sent.

## Limits and follow-up

This closes only the explicitly exercised recovery cases, not every payment incident or native
management operation. No release binary or physical device was tested. Contact/schedule offline-save
and process-death scenarios are not established by the access-form checks. A legacy offline-queue
drain logged `no such column: updated_at` on the existing emulator database; that migration/upgrade
path needs separate reproduction before claiming full native interruption readiness.

Metro advertised HTTP font asset URLs despite the HTTPS tunnel. Four unchanged bundled icon fonts
were seeded into this dedicated debug app's cache to continue testing, without allowing cleartext
traffic. This is a test-environment workaround, not proof of release asset delivery.

The old payout runs may retain synthetic users/audit rows in the isolated database after their
cleanup failure. Do not describe that database as pristine. Secrets and transient tunnel/fixture
files are ignored and are not part of the committed artifacts.

## Final rerun

The final one-pass upload run completed the full funded-job-to-transfer recovery journey, asserted
exactly one transfer and the final completed escrow, restored and verified the hosted sandbox
webhook, reversed/refunded its test funds, deleted its synthetic Connect account and
database/storage fixtures, and removed the diagnostic trigger. The native management fixture also
exited successfully after cleanup. These are test-mode/local results, not a hosted rollout or a
claim that every remaining native management interruption is closed.
