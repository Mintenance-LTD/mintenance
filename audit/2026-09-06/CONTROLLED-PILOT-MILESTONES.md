# Goal: establish controlled-pilot readiness

Status: active work; not ready for public users or real payments.

User-authorized scope: finish remediation, preserve existing work, match web/mobile contracts,
commit and push tested source/audit files, apply reviewed locally verified Supabase migrations. No
live payments, real-user messages, production fixtures, or application deployment/promote commands.

## Milestones and exit criteria

1. **Money and contracts** — separate synthetic homeowner, contractor, payer where implemented, and
   unrelated accounts complete job/bid/contract/test-mode payment/completion/release.
   Refund/dispute, duplicate/concurrent requests, webhook reordering and provider/database partial
   failures have recorded recovery outcomes. No unresolved money or authorization defects.
2. **Evidence retention** — original submitted evidence remains immutable to clients; surviving
   authorized parties can access evidence after account/job deletion; retention review, holds and
   disposal are explicit, restricted and audited. Cross-user reads fail. Missing legacy evidence is
   reported honestly.
3. **Invitations** — new and existing accounts complete invite, registration, email verification,
   login/MFA and acceptance; failures preserve a recoverable path; concurrent retry cannot create
   duplicate contacts or uncontrolled duplicate delivery.
4. **Property management** — owner, manager, team administrator and viewer can reach only their
   permitted work/contact/reporting/maintenance/document actions. Work requiring attention is
   discoverable; no fabricated compliance or financial status. Critical actions have backend and
   failure-state coverage on web/mobile.
5. **Browser and device** — representative full journeys exercised in browser and on a native
   device/emulator, including uploads, session expiry, offline interruptions and payment hand-offs.
   Static analysis is not a device pass.
6. **Operations and release decision** — monitored recovery jobs, notification delivery and database
   security findings reviewed; full checks and evidence refreshed at final commit. Produce
   pass/fail/blocked matrix and explicit pilot restrictions. No readiness claim while critical gates
   remain unverified.

## Current evidence

See REMEDIATION-PROGRESS.md and HOSTED-ROLLOUT-2026-09-22.md for exact completed checks. The latest
full web coverage run passed 397 files / 4,013 tests on September 24 after central
email-confirmation repairs; subsequent verification recovery has focused route/UI and real local
HTTP coverage. The September 22 follow-up coverage run was stopped at the user's pause request; its
partial output was not counted as a pass.

## Active next slice

Latest September 24 checkpoint: email callback proxy access and redirect handling repaired; real
local Auth token consumption/profile synchronization/replay checks passed. Android native
build/install now succeeds. Launch correctly blocks the local HTTP server; trusted HTTPS staging and
Firebase/test-provider configuration are still needed. See EMAIL-CALLBACK-AND-NATIVE-2026-09-24.md.

September 24 follow-up: reviewed database-evidence disposal is implemented, locally tested and its
schema applied to hosted Supabase. See EVIDENCE-DISPOSAL-2026-09-24.md. External files/processors,
backup reconciliation and closed-account identity/export remain open. Stripe rejected the configured
test key (401). Java and Windows compiler-path blockers are resolved; native build/install succeeds,
but launch rejects untrusted local HTTP. Native acceptance and the overall readiness goal remain
unfinished.

Invitation acceptance retries and contact deletion verification/rollout are complete and pushed in
17b9596c9. Continue retention disposal/reconciliation and the remaining manager role journeys.
Invitation delivery claims and cooldowns are implemented and tested, but real
delivery/verification/MFA acceptance remains open. Provider test payments still need usable Stripe
test credentials. An isolated Android emulator boots and the native bundle compiles; Expo Go lacks
the installed Stripe OnrampSdk native module. The development-client build now succeeds after
resolving Java socket and Windows compiler-path errors; its launch requires trusted HTTPS test
transport. Native acceptance remains unverified.

The staff archive queue now supports stable continuation beyond the first 50 records per kind.
Fourteen focused route/UI tests and a real local REST diagnostic covering 105 contracts and 53
disputes pass, including tied timestamps, changed review dates and preserved drafts after an
interrupted request. This is an access/review improvement, not completed disposal.

### Invitation hand-off checkpoint

Added an explicit invitation page and changed registration to return there instead of silently
attempting acceptance before verification. Sign-in preserves the invitation return path, and a retry
confirms server success before linking to the property. New outgoing invite links use this page;
prior register?invite links remain supported. 32 focused tests across invitation identity, contact
delivery, redirect security and the new page passed. This is not a full
email-provider/browser/native-device acceptance proof.

### Evidence archive and review checkpoint

The complete local HTTP account-deletion journey now passes with synthetic accounts: confirmed
account removal, surviving-party archive listing/read, fresh private download with byte-identical
evidence, and unrelated-user denial. Separate rolled-back database checks cover homeowner,
contractor and job deletion, including unbound legacy dispute preservation. Unbound legacy records
are deliberately excluded from payment-linked participant lists pending reconciliation.

Staff review controls cover both signed-contract and dispute archives: database-verified admin,
fresh MFA for decisions, revision-checked updates, hold/release audit history, and bounded future
review dates (90 days for holds). Review deadlines do not erase records. Durable disposal, processor
copies/backups, closed-account identity verification and full native acceptance remain unfinished.

### Reporting and responsive dashboard checkpoint

Property reporting links now use the public token on both web and mobile, with a narrowly scoped
public proxy route. Local signed-out browser access and revocation passed. Five provider-bearer
roles completed reporting, team, contact, schedule and invitation checks; the expanded cookie run
stopped on an outdated rejection-status assertion and is not counted as a pass. Native sharing has
component-test coverage, not a device pass. The phone-width live dashboard exposed fixed grids;
responsive stacking is repaired and visually checked in a synthetic component preview.

Full web coverage passed 393 files / 3,985 tests before the final layout-only change. Subsequent
public-route checks passed 33 focused tests, native reporting 3 tests, and commit hooks checked web
and mobile types and staged source. Public-launch readiness remains unestablished.

### 24 September confirmation and native checkpoint

The Android development client now builds and installs; the earlier Java/CMake blockers are resolved
using ignored local build configuration. Launch rejects local HTTP correctly. The user confirmed no
HTTPS staging environment exists. Pixel_8_Pro is running, but native journeys and push delivery
remain unverified.

Real local registration exposed and now closes an email-confirmation bypass, including previously
issued unconfirmed cookies and bearer identities. Local captured mail confirmation and subsequent
login pass. Verification resend is available before login and no longer reports provider failures as
success. Full web coverage after the central authentication changes passed 397 files / 4,013 tests;
subsequent recovery changes have separate focused route/UI and real local HTTP validation. See
EMAIL-CALLBACK-AND-NATIVE-2026-09-24.md for exact scope.

The expanded five-role cookie HTTP property-management matrix now passes, superseding the earlier
assertion-blocked run. This does not establish all manager workflows. Stripe test credentials remain
rejected; hosted delivery/cron execution, external storage disposal and backup/processor erasure
remain open. All six milestones remain tracked; no public-launch or real-money readiness claim is
made.

### Stripe sandbox checkpoint � 24 September

The replacement key authenticates; secret/publishable pair verification passes. Provider success,
decline, requires-action and refund tests pass. Mintenance HTTP create-intent uses the accepted bid
amount, rejects unrelated payers, reuses an intent on retry, and tolerates concurrent confirmation.
Real forwarded Stripe events move local escrow pending -> held -> refunded. The pre-existing hosted
test webhook was temporarily disabled with explicit permission and restored after each run. See
STRIPE-SANDBOX-2026-09-24.md for fixtures and scope limits. Connect onboarding/payout, completed
3DS/browser/native hand-offs and fault-recovery acceptance remain open. The previous sandbox-key 401
blocker is superseded; no public readiness claim is made.
