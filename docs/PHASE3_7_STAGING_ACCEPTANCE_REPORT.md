# Mintenance Phase 3.7 — STAGING Acceptance Report

Date: 2026-09-01 Scope: STAGING messaging-security fix and Homeowner + Contractor acceptance only.
STAGING: `pzothyoipifjwnypzcuv` (`https://pzothyoipifjwnypzcuv.supabase.co`) LIVE:
`ukrjudtlvapiajkjbcrd`

## A. Messaging security

Before the fix, `messages_insert_policy` required only `sender_id = auth.uid()`. HOMEOWNER_B and
CONTRACTOR_B successfully injected messages into ASSIGNED_JOB_A.

STAGING migration `20260901150000_harden_messages_insert_rls.sql` replaces that policy. It requires:

- `sender_id` equals the authenticated identity;
- the sender is the target job homeowner, assigned contractor, or an existing admin-messaging path;
- the receiver is one of the target job participants and is not the sender.

| Attempt                                          | Result                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| HOMEOWNER_A → assigned job message               | PASS — ALLOW                                                                                                          |
| CONTRACTOR_A → assigned job message              | PASS — ALLOW                                                                                                          |
| HOMEOWNER_B → assigned job message               | PASS — DENY (`42501`)                                                                                                 |
| CONTRACTOR_B → assigned job message              | PASS — DENY (`42501`)                                                                                                 |
| CONTRACTOR_B → marketplace job before assignment | PASS — DENY (`42501`)                                                                                                 |
| HOMEOWNER_B → another homeowner’s job            | PASS — DENY (`42501`)                                                                                                 |
| HOMEOWNER_B spoofs `sender_id = HOMEOWNER_A`     | PASS — DENY (`42501`)                                                                                                 |
| ADMIN_A → assigned job message                   | PASS — ALLOW under the existing admin-messaging path                                                                  |
| Message SELECT                                   | PASS — HOMEOWNER_A/CONTRACTOR_A/ADMIN_A see the conversation; B identities do not                                     |
| Realtime isolation                               | NOT IMPLEMENTED — `messages` is not in the `supabase_realtime` publication                                            |
| Message attachments                              | Existing `job_attachments` isolation was verified in Phase 3.6; no separate message attachment architecture was found |

## B. STAGING deployment

The Supabase STAGING project is confirmed separate from LIVE and is ACTIVE_HEALTHY. The database,
policies, and real Auth sessions used in this report are STAGING-only. The application’s hosted
STAGING deployment has not been verified, and checked-in `.env.staging` remains placeholder-only.
Stripe TEST MODE is not verified because the STAGING Stripe configuration is not available in the
repository environment. No production Stripe secret was displayed or used.

Required manual secret names and locations are documented in the Phase 3.6 report. They belong in
GitHub repository Settings → Secrets and variables → Actions and Vercel Project Settings →
Environment Variables → Preview; values must not be pasted into chat or committed.

## C. Payment

The Phase 3.6 STAGING payment write lockdown remains verified: direct authenticated INSERT, UPDATE,
and DELETE attempts by all four non-admin identities were denied, while the privileged
server/service-role path succeeded.

Real Stripe PaymentIntent, test payment, trusted amount/relationship derivation, £1/£100/£10,000
tampering, idempotency, and timeout/retry tests: **NOT RUN** because STAGING Stripe TEST MODE is not
configured.

## D. Webhooks

Successful/failed payment, duplicate/replay, invalid signature, unknown event, refund, and
transfer/release webhook tests: **NOT RUN**. No Stripe TEST MODE webhook endpoint is configured for
the verified STAGING application.

## E. Core journey

The complete hosted Homeowner + Contractor journey is **NOT RUN**. The following remain unverified
end to end: login, property, job creation, contractor discovery, quote, acceptance, contract,
PaymentIntent, test payment, messaging, progress, completion evidence, completion confirmation,
release/payment state, review, and maintenance history.

## F. Security regression

| Area             | Result                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Properties       | PASS — owner isolation and owner mutation checks                                         |
| Jobs             | PASS — homeowner isolation, marketplace visibility, assigned-contractor isolation/update |
| Messages         | PASS after Phase 3.7 fix — participant INSERT and SELECT matrix                          |
| Documents/photos | PASS for existing job attachments and property-room photos                               |
| Quotes/bids      | PASS — observed owner/own-contractor/admin paths and cross-user isolation                |
| Contracts        | PASS — observed owner/contractor/admin paths and cross-user isolation                    |
| Payments         | PASS — client writes denied; privileged server writes possible                           |

## G. Remaining P0/P1 blockers

- **P1:** STAGING application deployment and verified Stripe TEST MODE configuration are missing.
- **P1:** Real Stripe payment, tampering, idempotency, webhook, refund, and transfer evidence is
  missing.
- **P1:** The full hosted Homeowner + Contractor journey is unverified.

No additional P1 is recorded for message INSERT authorization; the specified attack matrix passed
after the STAGING-only policy fix.

## H. Cohort readiness

| Cohort                 | Status                                                        |
| ---------------------- | ------------------------------------------------------------- |
| Homeowner + Contractor | BLOCKED by the remaining Stripe/deployment/core-journey gates |
| Landlord               | NOT ASSESSED in Phase 3.7 scope                               |
| Agency                 | NOT ASSESSED in Phase 3.7 scope                               |

Landlord and Agency status does not determine the Homeowner + Contractor decision.

## I. Production migrations and LIVE promotion

The reviewed application migrations are:

1. `20260901150000_harden_messages_insert_rls.sql` — participant-based message INSERT policy.
2. `20260831231341_harden_payments_write_rls.sql` — payment ledger client-write lockdown.

The jobs RLS migration is already present in LIVE from the separately authorized Phase 3.5 change.
On 2026-09-01, the user explicitly authorized LIVE promotion. The following were applied to
`ukrjudtlvapiajkjbcrd`:

- `phase37_live_harden_payments_write_rls` — removed client INSERT/UPDATE/DELETE access to
  `public.payments`; `service_role` retains server-side write access.
- `phase37_live_harden_messages_insert_rls` — restricted message INSERTs to authenticated job
  participants with a valid receiver, while preserving the existing admin path.

Post-deploy verification confirmed the expected LIVE policies, grants, and migration ledger. No LIVE
application rows or Stripe money movement were modified. The security-advisor scan still reports
pre-existing INFO/WARN findings, including leaked-password protection being disabled and an
available Postgres security upgrade. This promotion does not change the acceptance decision below
because the Stripe, deployment, and core-journey gates remain unrun or blocked.

## Final decision

**NO - HOMEOWNER + CONTRACTOR CONTROLLED BETA STILL BLOCKED**
