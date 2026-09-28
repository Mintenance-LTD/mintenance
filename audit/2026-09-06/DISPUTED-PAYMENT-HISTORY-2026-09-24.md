# Disputed payment history — 24 September 2026

The current dispute transaction function writes escrow status `disputed`, but the payment-history
mapper omitted it and returned `pending`. The web payment list and exact transaction detail consume
that API. This hid the actual state even though the payment remained disputed in the database.

The API and shared payment status type now preserve `disputed`. Both web transaction-list
presentations show a dispute action instead of a receipt action for that state; the exact
transaction detail also links to the authorized dispute reader. Native payment cards show the same
readable status and use the direct dispute entry added in the preceding change. Release and ordinary
refund actions remain restricted to their existing eligible statuses.

Ten focused web checks passed, including the API status regression and visible list action/absence
of release/refund controls. Shared types build and web type check passed. No schema changes, payment
operations, production data changes or deployment were required. This fixes status presentation; it
is not a new end-to-end dispute settlement test.
