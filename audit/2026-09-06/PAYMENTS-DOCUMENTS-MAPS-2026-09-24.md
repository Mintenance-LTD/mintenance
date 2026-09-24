# Payment, documents and maps checkpoint — 24 September 2026

Readiness remains unestablished for public users or real money. This checkpoint supplements the
prior audit; it is not a full acceptance pass.

## Executed evidence

- Real Stripe sandbox 3-D Secure: PaymentIntent entered requires_action; Edge opened Stripe's real
  hosted test challenge; COMPLETE was selected; independent provider retrieval returned succeeded
  with livemode=false. The diagnostic refunded the charge. This used a diagnostic redirect page, not
  Mintenance's PaymentForm or Android PaymentSheet, so those hand-offs remain open.
- Synthetic Express contractor: API prefill, hosted test phone/OTP flow, and explicitly approved
  test-only agreement submission completed. Stripe returned charges_enabled=true,
  payouts_enabled=true, no current or pending requirements.
- Payout attempt: synthetic GBP10 funding charge succeeded, but subsequent GBP5 transfer was
  rejected with balance_insufficient. Neither an application release nor a bank payout is verified.
  The charge was refunded and synthetic account deleted. Sandbox balance timing/funding must be
  resolved before retrying the entire release journey.
- Existing hosted TEST webhook was disabled only during provider diagnostics, then restored and
  retrieved as enabled after each attempt. No live payments or existing contractor accounts were
  changed.
- HTTPS: official Cloudflare Windows binary matched its published SHA256
  (2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712). Authorized temporary tunnel to
  isolated API3018 returned HTTP200 for login. Emulator5554 was connected. Native computer control
  is disabled in the current tool session: no Android taps/payment challenge/deep-link return is
  claimed. Tunnel exposure alone does not establish native acceptance; native Supabase/Metro HTTPS
  configuration still needs verification.
- Local contract PDF endpoint: synthetic homeowner and assigned contractor both received
  application/pdf bytes beginning %PDF-, over 1000 bytes. Unrelated homeowner received404.
- Contractor documents: real multipart PDF upload returned201; owner list returned a signed local
  Storage URL; downloaded bytes exactly matched upload. Synthetic object, metadata,
  jobs/contracts/accounts cleaned afterward (retention triggers may archive synthetic records).

## What Documents currently means

1. apps/web/app/api/documents/route.ts GET returns virtual contract, bid and payment records.
   Contracts/bids navigate to jobs; payments navigate to /payments. Web DocumentCard and mobile
   HomeownerDocumentsScreen show PDF labels for some of these records, despite opening screens. This
   is an interface mismatch, not proof that every document is fake.
2. apps/web/app/api/contracts/[id]/pdf/route.ts GET generates an actual authorized PDF; verified as
   above. Direct download actions should be made clear on web and mobile while retaining record
   navigation as a separate action.
3. apps/web/app/api/contractor/documents/route.ts uploads real private Storage files and regenerates
   signed URLs. Its virtual contract entries still navigate to job records. Mobile contractor
   documents/openDocument.ts follows that same distinction.
4. This check did not exercise every property-document category, signed-link expiry, long/multipage
   PDF layout, historical evidence, or device file opening. Those remain separate acceptance checks.

## Map defects repaired

- Web GoogleMapContainer.handleRetry previously cleared the error without starting another script
  load. Existing scripts could poll forever. Retry now starts a new attempt; failures remove the
  failed script; every waiting consumer times out after15 seconds and cleans up listeners/timers.
  Tests exercise failed-load replacement and existing-script timeout.
- Active mobile LocationMapSection imported a placeholder even on native devices. A
  platform-specific native module now mounts react-native-maps with the supplied region, guarded by
  the same Android configuration check as job discovery. Missing/invalid meeting coordinates show an
  explicit unavailable state. Removed the unsupported distance-times-two ETA estimate.
- Native ExploreMapScreen and JobLocationMap already use react-native-maps. The generic
  MapViewWrapper placeholder is test-only in the traced callers and was not reported as an active
  defect.

## Validation and limits

Seven web map tests and two native map component tests passed. Web and mobile TypeScript checks
passed. Google provider behavior is mocked in component tests; actual map tiles, permission denial,
tracking freshness, address privacy, and device rendering are not verified by those tests. No new
SQL or hosted database change was required for this slice.

Reproduction artifacts: document-file-diagnostic.cjs (local synthetic only),
stripe-challenge-diagnostic.cjs (requires explicit test-webhook-disable flag; browser completion;
five-minute timeout; refund/cancel and webhook restoration in finally). Neither contains
credentials. Local runner logs and download binaries remain ignored.

## Remaining acceptance gates

Resolve sandbox available balance, then verify actual Mintenance release -> Stripe transfer -> local
durable settlement -> test bank payout, with failure/retry checks. Complete Mintenance web checkout
challenge and Android PaymentSheet/return/session-interruption flows. Test maps on-device and
in-browser with allowed provider keys. Add clear actual-download actions to document lists and
validate property-file/evidence access separately. The broader milestone ledger remains active.
