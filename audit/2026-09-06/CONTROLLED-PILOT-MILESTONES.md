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

See REMEDIATION-PROGRESS.md and HOSTED-ROLLOUT-2026-09-22.md for exact completed checks. Prior
3,929-test full run predates latest focused invitation/evidence changes. New client storage
restrictions are not a complete retention implementation.

## Active next slice

Repair the registration-to-verified-invitation hand-off, which currently ignores failed acceptance
before redirecting away. Then continue archived evidence retrieval and manager workflow
completeness.

### Invitation hand-off checkpoint

Added an explicit invitation page and changed registration to return there instead of silently
attempting acceptance before verification. Sign-in preserves the invitation return path, and a retry
confirms server success before linking to the property. New outgoing invite links use this page;
prior register?invite links remain supported. 32 focused tests across invitation identity, contact
delivery, redirect security and the new page passed. This is not a full
email-provider/browser/native-device acceptance proof.
