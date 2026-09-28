# Application checkout, payout and document follow-up — 24 September 2026

Readiness remains unestablished for public launch. This checkpoint supersedes the
insufficient-available-balance and provider-only 3DS limitations in
PAYMENTS-DOCUMENTS-MAPS-2026-09-24.md. Android acceptance remains open.

## Executed evidence

- Base commit: 5077293dc on codex/migrate-next-proxy. Existing work preserved. No SQL migration or
  hosted database changes in this slice.
- Isolated local Supabase API port 55321; sanitized Mintenance server port 3018; actual Stripe
  sandbox, never live charges. Separate synthetic homeowner, contractor and unrelated identities.
- Actual application release: unrelated payer rejected; accepted bid GBP 10 overrides submitted GBP
  1; repeated creation reuses the intent; real forwarded success webhook changes escrow to held;
  concurrent confirmation succeeds without duplicate funding.
- Release prerequisites were seeded: signed contract, completed job, homeowner approval and cleared
  cooling-off/holds. This is NOT verification of signing/work-completion/approval UI or a genuine
  dispute-resolution workflow.
- Actual release endpoint returns success; database becomes completed; provider transfer destination
  and GBP 8.80 match the stored contractor payout. Repeating release produces one transfer, not two.
- Separate sandbox bank payout reaches paid, GBP 8.80. A disposable Custom Connect account and
  official synthetic identity/bank fixtures were used. This complements earlier Express onboarding;
  it is not an end-to-end Express payout proof. Asynchronous provider account verification required
  longer than 30 seconds.
- Platform sandbox funding used tok_bypassPending. Test transfers reversed, disposable account
  removed and funding/payment charges refunded afterward. Financial retention can preserve synthetic
  local evidence; three residual synthetic authentication accounts were soft-deleted after earlier
  cleanup encountered retention references.
- Full Edge web checkout: actual PaymentElement with synthetic 3DS card, actual Stripe challenge
  completed, Mintenance redirects to Payments displaying GBP 10 held in escrow. Independent provider
  retrieval confirms succeeded/livemode=false and database held. The payment was then refunded
  during fixture cleanup.
- Hosted test webhook was temporarily disabled under explicit authorization and restored; enabled
  status was verified after each test window.
- Live homeowner and contractor sign-in/read-only inspection performed with supplied credentials.
  Both signed out. No real payments, uploads, messages or production fixtures. Credentials were not
  saved in source, diagnostics or audit artifacts.
- Live contractor discovery map rendered Google tiles and an actual job marker; zoom control
  exercised. This is representative rendering evidence, not comprehensive
  location/permission/privacy verification.
- Live homeowner documents contained navigation cards labelled PDF. Repaired local Documents screen
  exposes a separate Download PDF link. Browser activation reaches the authorized contract PDF
  endpoint with HTTP 200. Prior independent diagnostic verified PDF signature bytes and participant
  isolation; this slice did not inspect the browser's saved download file.

## Repairs and tests

1. PaymentForm StrictMode started two in-flight requests with one idempotency key. Server correctly
   protected the claim, but UI displayed an error. Regression failed before repair; setup now shares
   its promise, preserves the resource-scoped key and offers explicit retry. Server protection
   unchanged.
2. Provider errors previously reused the job-load error state and could replace checkout with a Job
   not found screen. Separate payment-error state preserves checkout. Thrown confirmation failures
   restore controls; processing is distinct from success and disables resubmission.
3. Mobile contract PDF endpoint was parsed as JSON before its binary fallback. Native download now
   authenticates binary retrieval, refreshes once after 401, checks the PDF signature and saves
   through Android's directory picker (or shares on iOS). Cancel does not report saved; temporary
   file cleanup runs after failure. Device download remains unverified.
4. Uploaded files categorized as contracts incorrectly navigated using a document ID as a job ID.
   Only generated contract records use the contract viewer; uploaded files open their signed file
   URL. Missing generated-contract job references show an error.
5. Payment navigation cards no longer claim to be PDF files. Web contracts expose actual download
   links separately from record navigation. Removed an inert reminder control.
6. Payments list invented 5% platform and 2% processing fees. It now uses recorded API fields.
   Receipt screens invented VAT and fee breakdowns, and detail download controls only displayed
   success notifications. They now generate an actual escaped, script-disabled HTML payment record
   showing recorded amount/status, explicitly not a VAT invoice. No fabricated invoice link/number
   remains in rendered details. Checkout processing-cost copy identifies Mintenance as paying that
   estimate.
7. History mapped completed payouts and failed/cancelled states to pending. Completed maps to the
   existing released API state; other supported states remain intact.

Focused tests: web 4 files / 20 tests passed; mobile 2 files / 8 tests passed. Covers StrictMode,
interrupted confirmation, pending state, funding contradictions, history ownership/status/balances,
escaping of downloaded content, document link semantics, PDF bytes, token refresh, cancel and write
failure. These tests mock providers/native storage; actual provider/browser evidence above is
separate. Full coverage was not rerun in this slice.

## Remaining gates

- Native Android payment hand-off, completed challenge, return to app, PDF save/share, map behavior,
  interrupted/resumed sessions and push delivery. ADB permission received and emulator-5554
  confirmed connected. HTTPS staging does not exist.
- Automatic approval rejected expanding the existing app tunnel authorization to public
  Supabase/Auth and Metro services. Separate explicit approval requested; no such tunnels started.
  Metro exposure could disclose app source to someone obtaining the random URL.
- Full Express-account payout, release/work-completion UI, negative 3DS paths and injected
  provider/database partial-failure recovery acceptance are not established by the successful seeded
  payout test.
- Fee quotation across contractor tiers and other payment surfaces needs continued reconciliation;
  this slice removes invented historical amounts, not a claim of universal fee consistency.
- Earlier milestone limitations (hosted delivery/cron, retention disposal and processor/backups)
  remain as recorded in CONTROLLED-PILOT-MILESTONES.md. No public-readiness claim or overall-goal
  completion. Web and mobile TypeScript checks also passed after these changes. No SQL files were
  added or changed.

The original CI escrow lifecycle suite was also rerun: 48 tests passed. The local payment server,
Stripe listener and Metro session were stopped after cleanup; no HTTPS tunnels remain running.
