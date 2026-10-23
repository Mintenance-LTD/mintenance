# Operational follow-up — 23 October 2026

Production remains a restricted beta. The user chose to retain Supabase Free rather than prepare a paid upgrade. The standalone Stripe receiver is deployed; application code changes below remain local until reviewed and deployed. Authentication files were changing concurrently and were left untouched by this operational pass.

## Completed in production

Four `push_dispatch_attempts` were reviewed and changed from `needs_review` to `reviewed_unknown` at 18:06:49 UTC. A subsequent read confirmed zero unresolved attempts and four reviewed unknown outcomes. No push was resent and no device delivery was asserted.

Vercel's retained logs established Expo HTTP 503 responses for all four attempts on 5 October, at 21:00:19–21:00:48 UTC. These concern two `escrow_auto_released` notifications. Both queue rows are now `sent`, with one retry and sent timestamps around 21:05 UTC; the matching Vercel log messages say `Failed-push retry succeeded`. That later retry does not establish whether an original attempt reached a device. Each review retains a detailed evidence note. `reviewed_by` is null, with explicit Codex service-review attribution in the note, rather than impersonating an application administrator. See `operations-push-evidence.json`.

## Stripe investigation

Read directly from the authenticated Mintenance LTD Stripe account `acct_1SDXwDJZfKi2oDP6`, then compared with current Supabase reconciliation source snapshots.

| Escrow / payment | Provider evidence | Disposition |
|---|---|---|
| `97cb18fb-55df-448b-99eb-5a907eb7c196` / `pi_3T0m6UJZfKi2oDP60bLwYGZE` | Live £120 payment is incomplete, without a payment method. Its `jobId`, `contractorId` and legacy `homeownerId` match the app's job, payee and payer. | Identity warning is caused by the legacy metadata name. Local comparator fix should allow this pending payment to match after deployment/reconciliation; it does not indicate £120 received. |
| `4a1e0382-b411-4821-b072-96f470f8417f` / `pi_3T9CNiJZfKi2oDP61dkt6f75` | Live £1.46 payment succeeded on 9 March. Stripe event `evt_3T9CNiJZfKi2oDP61oqpuz1z` shows amount and amount_received of 146 pence. All three legacy identity fields match. | Local identity fix removes the false identity warning, but the app still says pending. Status discrepancy remains open. No matching retained app webhook record was found; Stripe warns that older events have limited data. Do not infer why the original update was missed or blindly replay it. |
| `493f9a35-0ea6-45aa-bd39-f6c01d844b3e` / `pi_3ThBaHJZfKi2oDP60A76kZKx` | Live lookup explicitly reports that the payment exists in test mode. The test dashboard shows £1.32 succeeded, a 4242 test card and matching job/payer/contractor metadata. | Confirmed test-mode record in the production escrow database, currently held. It is not evidence of live funds. Preserve the record and reconcile its business workflow before any financial-state correction. |
| `eaa3d60f-9e48-4934-bdff-5062ae8a656f` / `pi_test_simulated` | Synthetic identifier. A prior migration explicitly labels this legacy test row and parks it in failed status. | Historical synthetic data, not a provider payment. It remains in reconciliation; avoid inventing a successful match or deleting its audit trail. |

No charge, refund, cancellation, fund release, provider-metadata edit or escrow-status correction was made.

## Webhook operations

The live Stripe endpoint `we_1UMwZFJZfKi2oDP67jsKcxaq` is active at `https://www.mintenance.co.uk/api/webhooks/stripe`, listens to 23 events and uses API version `2026-06-24.dahlia`. The dashboard shows October refund deliveries recovering from HTTP 500 to HTTP 200 on automatic retry. There were zero deliveries in the displayed current-week window; a zero error rate with zero traffic does not prove current reachability.

A fresh request without cookies demonstrated the present blocker: GET redirects to Vercel SSO; an unsigned empty POST returns HTTP 401 with Vercel's authentication page, before the application's missing-signature check. Restricted deployment protection therefore blocks the configured Stripe endpoint today.

The user chose a separate signature-verifying receiver. Deployed `stripe-webhook-relay` version 1 to the existing production Supabase project at `https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/stripe-webhook-relay`. Its source hash is `8f1f0222d75169a8e5871d847bdb4a6c2ef3dfd2d654a46fa599547c17ec2cb2`. JWT verification is disabled because Stripe signatures authenticate requests. The function accepts live-mode signed events only, forwards unchanged bytes to the fixed app route, refuses redirects and acknowledges only the app's JSON success response. It bounds payloads and response size, enforces a timeout, and returns failures for Stripe retries.

Created a dedicated Vercel bypass labelled `Stripe relay — Supabase server only — 2026-10-23` using the authenticated dashboard after the connector returned HTTP 403. The older system-environment bypass remains unchanged. Saved the new value as `STRIPE_RELAY_VERCEL_BYPASS` and the existing endpoint signing secret as `STRIPE_RELAY_WEBHOOK_SECRET` in encrypted Supabase Edge Function secrets at 18:29:35 UTC. No credential is included in source files or this report. The final receiver URL has no credential query string.

Verification: 25/25 receiver tests passed, and web TypeScript passed. Live GET returned 405; unsigned POST and forged-signature POST returned 400. A request to the original app route still redirected to Vercel SSO. A signed synthetic audit event `evt_codex_receiver_audit_20261023_1792780351318`, type `codex.receiver.verification`, returned HTTP 200 with `received: true` through the receiver. The database confirms one processed webhook row `f18313be-2ce1-4c25-90eb-10b0d3971329`, processed at 18:32:40.315496 UTC, with zero retries and no error. This exercises receiver -> Vercel -> app signature validation -> durable database acknowledgement. It is explicitly synthetic and does not represent a Stripe-generated payment. No charge/refund/release handler runs for that event type. A repeat UI test was attempted but browser control failed; no duplicate-test result is asserted.

**Destination switch completed:** after Edge reconnected, changed the existing Stripe destination URL to `https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/stripe-webhook-relay` at approximately 18:58 UTC (19:58 BST) on 23 October. The saved overview confirms Active, the same destination ID, 23 events, API version `2026-06-24.dahlia` and unchanged description. Only the URL field was edited; the signing secret was not rotated. Screenshot: `stripe-receiver-active.png`. A follow-up unauthenticated smoke check passed at 19:00:06 UTC, including the original app route still redirecting to Vercel SSO.

A real Stripe-generated delivery after the switch remains unverified. The historical `refund.updated` event `evt_3UPU5KJZfKi2oDP61BHRzilK` was confirmed processed in the database, and the idempotency implementation was inspected. However, automatic approval review blocked clicking Resend because a real refund webhook might retrigger financial handling despite those safeguards and the user had not explicitly authorized that consequential replay. No replay was sent. The endpoint is active for normal provider deliveries; do not treat the synthetic probe or an empty current-week delivery chart as proof of a new Stripe-originated delivery.

Residual risk: the bypass remains project-wide; server storage reduces URL leakage but does not eliminate compromise risk. Supabase secrets are project-level and share a trust boundary with other privileged functions and administrators. The relay adds a Supabase availability dependency. Public invocation abuse and aggregate upstream per-IP rate limiting remain considerations for load testing. See `supabase/functions/stripe-webhook-relay/README.md` for recovery and rotation instructions.

[Vercel's documented webhook bypass mechanism](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

## Additional local fixes

- Cash-only legacy payment intents can identify the payer with `homeownerId` when both canonical payer fields are absent. An explicit payer cannot be overridden; funding-ledger intents still require canonical payer metadata. The real pending/succeeded discrepancy remains visible.
- Signed Stripe webhooks must now have `livemode` matching the configured Stripe secret-key mode before any idempotency claim or handler write. Unknown configuration and missing/mismatching mode fail closed. This guards one route by which environments could be mixed; it does not establish the cause of the historical test row or make shared production/test databases safe.
- Updated two existing webhook fixtures to include Stripe's required `livemode` property, and added regression coverage for both modes, signature rejection and writes blocked on mismatch.

Verification: 48/48 payment/webhook tests passed; web TypeScript passed; ESLint for both modified server files passed with zero warnings. `git diff --check` passed (Git reported line-ending conversion notices). An initial new test mock omitted an error-class export; that test harness issue was corrected before the passing run. No additional full bundle build or native-device test was performed in this pass.

[Stripe documents the event mode distinction](https://docs.stripe.com/api/events/object).

## Infrastructure blockers and prerequisites

- **Vercel billing:** the authenticated dashboard displays `Payment failed, pay any open invoices before your account is shut down`. This is a separate availability risk requiring the account owner's billing action. No invoice payment was attempted.
- **Staging:** restored existing `pzothyoipifjwnypzcuv` on the current Free organization. It now reports `ACTIVE_HEALTHY`, and database reads pass (372 public tables, 8 migration history entries, latest `20260901141806`). Production reports 415 public tables, 401 migration history entries, latest `20261022195544`. These inventories demonstrate drift; the differing migration baselines mean the count difference must not be treated as an exact list of missing migrations. Staging needs schema reconciliation and test-data review before release acceptance. No production data was copied or staging migrations blindly applied.
- **Backups:** the dashboard confirms that this Free plan has no managed project backups. No restore test or external backup was established. Do not mistake source migrations or audit extracts for a recoverable production backup.
- **Password protection:** Supabase's built-in leaked-password setting is disabled and requires Pro or above. The user explicitly chose to keep Free. Concurrent application password-security work is separate and is not asserted here as a replacement for protection at Supabase's direct Auth API.
- **Database update:** version 17.4.1.074 can upgrade to 17.11.0.003. Supabase warns that all services may be offline for up to one hour and the old version cannot be restored by downgrade. The confirmation was inspected and cancelled. A verified backup/restore path and maintenance window are prerequisites.
- **Runtime:** production uses Node 24; repository/CI/EAS still pin Node 20.19.4. No production downgrade or untested fleet-wide runtime change was made.
- **Beta acceptance:** current signed Android/iOS builds, designated role accounts, device push/deep-link checks, crash symbolication and restore/load exercises remain outstanding. The ordinary mobile client also needs an approved way to access the restricted API; a project bypass secret must not be embedded in a distributed app.
- **Rollout:** the receiver is deployed independently. Local application fixes and the earlier readiness remediation are not deployed. The checkout also contains concurrent user edits; an application deployment must use an explicitly reviewed change set.

## Verification artifacts

- `operations-push-evidence.json`
- `operations-payment-tests.json` (19 initial comparator tests)
- `operations-payment-webhook-tests.json` (48 final tests; overlaps the 19)
- `operations-web-types.log` (empty output, successful exit)
- `operations-relay-tests.json` (25 passing receiver tests)
- `operations-relay-smoke.json` (public rejection checks and unchanged app protection)
- `operations-relay-live-evidence.json` (deployment and signed non-financial probe)
- `stripe-receiver-active.png` (saved Stripe receiver URL, Active status and preserved event count)

Earlier baseline evidence and broader web/mobile/build results remain in `READINESS-AUDIT.md` and `REMEDIATION.md`; their production findings are historical observations, not claims that this pass deployed all fixes.
