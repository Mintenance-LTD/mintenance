# Phase 3 External Verification Handoff

The local host cannot provide authoritative web Vitest, standalone Chromium, or Docker-backed local
Supabase evidence. Run the following on an unrestricted CI runner or approved staging environment.
Do not point destructive migration commands at production.

## Required CI runs

```text
npm ci
npm run build:packages
npm run test:web -- run
npm run test:mobile -- --runInBand --detectOpenHandles
npx playwright install --with-deps
npm run e2e:smoke
```

For database-backed verification, start an isolated local Supabase project and run the repository
integration harness with its explicit opt-in flag:

```text
supabase start
INTEGRATION_TESTS=1 npm run test:integration -w @mintenance/web
```

Capture the runner OS, Node/npm versions, Supabase CLI version, test counts, failure output, and
artifact links. The integration run must use separate authenticated identities and cover positive
and negative operations for properties, jobs, bids/quotes, contracts, messages, documents, payments,
tenant reports, and landlord compliance.

The current local baseline is 10 integration files / 66 tests passing. It is useful evidence, but
does not substitute for live/staging identity tests.

Additional local verification now passes web type-check, web Vitest (275 files / 3,053 tests), and
the standalone Playwright login smoke (1/1). The smoke run also confirmed that the application fails
closed when a live Stripe secret is present outside production; replace that local value with a test
secret before rerunning any payment or CI flow.

## Stripe verification

Use Stripe test mode only, with secrets supplied by the CI secret store. Record request idempotency
behavior, webhook replay and ordering, refund authorization, and transfer/escrow outcomes. Never put
credentials or customer data in logs.

## Release gate

This handoff is pending external execution. A green CI result cannot override the current live P1
findings PHASE3-001 (jobs SELECT exposure) and PHASE3-002 (client payment mutation); those require
reviewed migration reconciliation, staging proof, and explicit live-change authorization.
