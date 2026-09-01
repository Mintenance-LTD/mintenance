# Phase 3 Escrow Terminology Audit

Date: 2026-09-01  
Scope: repository-wide case-insensitive scan, excluding dependency/build output.

No copy was changed. This is a classification for legal/product review.

## Classification

### Internal technical name

These uses describe implementation concepts and can remain technical pending product/legal
direction:

- database objects and migrations: `escrow_transactions`, `escrow_payments`, `escrow_accounts`,
  payment ledgers, and escrow state-machine code;
- API paths and service names such as `/api/escrow/*`, `EscrowAutoReleaseService`, escrow
  release/refund handlers, and webhook payment handlers;
- automated jobs, tests, comments, architecture diagrams, and engineering documentation describing
  hold/release state transitions.

Representative locations include `apps/web/lib/payment-state-machine.ts`,
`apps/web/lib/services/escrow/`, `apps/web/app/api/escrow/`, Supabase migrations, and
integration/unit tests.

### User-facing claim

The following are visible or likely visible to users and require explicit product/legal
confirmation:

- `apps/mobile/STORE_METADATA.md`: “built-in escrow protection,” “secure escrow release,” and
  “secure escrow payments protect both parties”;
- mobile escrow dashboard, payment summary, and escrow information screens;
- homeowner escrow approval pages and payment-related UI copy;
- user-facing help, onboarding, FAQ, terms, and marketing surfaces containing “escrow” or “Pay into
  Escrow.”

### Legal/marketing claim

- `apps/demo-video/src/scenes/IntroScene.tsx` and `FeatureShowcase.tsx`: “Secure Escrow”;
- `apps/demo-video/src/scenes/HowItWorksScene.tsx`: “Pay into Escrow”;
- `apps/mobile/STORE_METADATA.md`: store-listing claims about escrow protection and release;
- `docs/business/Mintenance-legal-pack-DRAFT.md`: “escrow-style”/protected payment terminology and
  legal framing.

## Risk flag

The implementation appears to combine Stripe PaymentIntents, internal payment rows/ledgers, and
contractor transfers/releases. The scan does not establish that the product provides regulated
escrow. User-facing “escrow” claims must therefore receive legal/product review before controlled
beta. Do not rename or soften the copy automatically in Phase 3; that would be a product/legal
decision outside the authorization scope.

## Required follow-up

Legal/product owners should decide the approved term and then update only user-facing surfaces,
leaving database columns, API paths, internal service names, and migration identifiers stable unless
a separate migration plan is approved.
