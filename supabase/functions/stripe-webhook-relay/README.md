# Stripe receiver for the restricted beta

Public URL: `https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/stripe-webhook-relay`

This function verifies the raw Stripe signature with a 300-second tolerance, accepts only live events, and forwards the original bytes and signature to the fixed production webhook URL. Only that outgoing request carries `x-vercel-protection-bypass`. The application independently verifies the signature and handles durable idempotency. The receiver acknowledges only JSON `received: true` responses; upstream failures/timeouts cause non-2xx responses so Stripe can retry. It does not follow redirects or log bodies, headers, secrets or upstream error details. Payloads are bounded to 1 MiB and upstream responses to 16 KiB, with a 20-second deadline.

## Deployment and secrets

Deploy `index.ts`, `handler.ts` and `deno.json` as `stripe-webhook-relay` with JWT verification disabled. Authentication is the Stripe HMAC signature, not a Supabase JWT. Stripe is pinned to 22.3.2. Configure these encrypted Edge Function secrets:

- `STRIPE_RELAY_WEBHOOK_SECRET`: signing secret of the existing live Stripe destination `we_1UMwZFJZfKi2oDP67jsKcxaq`.
- `STRIPE_RELAY_VERCEL_BYPASS`: dedicated project bypass labelled `Stripe relay — Supabase server only — 2026-10-23`.

Never put either value in source control, logs, mobile bundles, browser code or endpoint URLs. Do not alter the older Vercel system-environment bypass. The signing secret must also match the app's existing `STRIPE_WEBHOOK_SECRET`.

## Remaining security and reliability boundaries

The Vercel credential is still project-wide; this relay restricts its use but cannot narrow the credential itself. Supabase Edge Function secrets are project-level, so administrators and other privileged function code in the project are part of the trust boundary. A compromised receiver or Supabase project can expose the credential. Restrict dashboard/deployment access and use MFA. No claim of zero leakage risk is made.

The relay adds an availability dependency on Supabase. Public invalid traffic consumes function invocations; body/time limits and signature verification bound individual requests but are not a distributed rate limiter. Vercel's existing per-IP app rate limit may aggregate relay traffic; monitor 429/5xx during increased volume. Do not forward caller-supplied IP headers as trusted identity.

## Verification and recovery

Run the web Vitest suite `__tests__/audit/stripe-webhook-relay.test.ts`. Run `audit/2026-10-23-readiness/verify-relay.cjs` for unauthenticated production checks. The latter deliberately makes no valid financial event requests.

A signed synthetic event of type `codex.receiver.verification` verified relay -> protected app -> database acknowledgement on 23 October 2026. It is labelled as an operational audit and is not a Stripe-generated financial event. A real Stripe delivery is still needed to verify the provider-triggered path after changing its destination.

On suspected leakage, revoke only the dedicated relay bypass, generate a replacement and update the Supabase secret. Stripe will retry non-2xx deliveries during the interruption. Verify recovery before retrying historical financial events. Rotation must preserve the older unrelated bypass.

To roll back receiver code, redeploy the previously verified version. Restoring the old direct Stripe URL while Vercel protection remains enabled will block deliveries again; it is not a working fallback. Do not turn off the beta gate as a shortcut.
