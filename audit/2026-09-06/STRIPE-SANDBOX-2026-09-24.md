# Stripe sandbox verification � 24 September 2026

## Verified

- Supplied secret in ignored apps/web/.env.test authenticated to Stripe: balance API returned HTTP
  200 and livemode=false. Account API returned HTTP 200, country GB, charges_enabled=true and
  payouts_enabled=true. These are platform flags, not contractor payout readiness.
- Publishable key is present with a test-mode prefix. A client-side payment using the key pair has
  not yet been exercised.
- Official Stripe CLI 1.51.1 downloaded to the ignored isolated-stack directory; archive SHA-256
  verified against the official GitHub release asset digest.
- CLI test listener connected and its matching signing secret was saved only to ignored .env.test.
  No live flag, global installation or production credentials used.
- Dedicated audit server on local port 3018 uses only the selected test Stripe values and isolated
  Supabase API 55321. Existing placeholder audit server was identified by parent/child process
  ownership before replacement. No unrelated server was stopped.
- Actual local webhook HTTP checks: missing, forged and expired signatures -> 400; valid signed
  synthetic cancellation -> 200; repeated same event -> 200 with duplicate=true. This proves local
  signature/idempotency handling, not Stripe-to-app event delivery or a payment state transition. No
  matching escrow was present.
- Read-only Connect account listing returned four test accounts, zero with both charges_enabled and
  payouts_enabled true. No account details or identities copied.

## Isolation decision and executed follow-up

The test account has an enabled webhook endpoint on web-nu-six-10.vercel.app covering payment,
refund, Connect and payout events. Creating test resources could invoke that hosted app and mutate
its backing data. Before creating transactions or new connected accounts, the user was asked to
choose temporary suspension/restoration of this test endpoint or a separate isolated Stripe sandbox.
The user explicitly approved temporary suspension and restoration. Both diagnostic runs verified the
test endpoint disabled before creating provider resources, then restored and re-read its enabled
status in finally. No live endpoint was changed.

### Provider checks

- Test secret and publishable key pair: authenticated retrieval of a newly created PaymentIntent
  with the publishable key and its client secret returned HTTP 200.
- Repeating the same provider request and idempotency key returned the same intent.
- GBP 1.00 Visa test payment succeeded and was fully refunded.
- Declined test card returned card_declined and requires_payment_method.
- Authentication-required test card returned requires_action with next_action; the browser/native
  challenge was not completed and is not a verified journey.
- A disposable GB Express Connect account was created successfully. Charges/payouts remained
  disabled because onboarding details were required. The account was removed.
- Pending diagnostic intents were cancelled; successful diagnostic charges refunded. Stripe retains
  test transaction history; it is not claimed deleted.
- Five real forwarded Stripe deliveries returned HTTP 200 from the local application.

### Mintenance application checks

Using separate synthetic owner, contractor and unrelated accounts in isolated Auth, with pre-created
assigned job, accepted bid and signed contract fixtures:

- Unrelated payer create-intent request -> 403.
- Payer submitted GBP 1.00; application created a GBP 10.00 Stripe intent matching the accepted bid.
  No live funds moved.
- Repeating application creation returned the same intent.
- Stripe card confirmation succeeded. Real forwarded webhook moved local escrow from pending to
  held, preserving GBP 10.00.
- Unrelated confirmation -> 403; two concurrent authorized confirmations -> 200.
- Stripe full refund succeeded; real forwarded refund event moved escrow to refunded.
- Synthetic local job, bid, contract, escrow, funding and Auth fixtures were cleaned. Retention
  triggers can preserve synthetic archives; no production database was used.

Application entry was HTTP with verified bearer sessions, not the payment screen. Job posting,
bidding and contract signing were fixtures, not exercised UI steps. The refund was initiated through
Stripe's test API, not the app's admin refund route. These distinctions limit the scope of the pass.

Remaining: payment UI and completed 3DS challenge, complete job/bid/contract journey, Connect
onboarding and payout, app refund authorization and provider/database failure recovery. The prior
invalid-secret (401) blocker is resolved. Public readiness is not established.

References: https://github.com/stripe/stripe-cli/wiki/using-stripe-api-keys and
https://docs.stripe.com/connect/testing .
