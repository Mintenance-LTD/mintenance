# Android payment, PDF and contractor fee checkpoint — 24 September 2026

Overall readiness remains unestablished. This checkpoint closes the successful Android
card/3DS/payment/PDF path within an isolated debug-client test, not the whole launch goal.

## Environment and safety

Started from clean commit `1e5bfa515`, branch `codex/migrate-next-proxy`. Used local Supabase on
55321, local Next on 3018, Metro on 8087, synthetic confirmed accounts, synthetic accepted bid and
signed contract, and Stripe test mode. The job and signatures were fixtures, not completed through
onboarding/signing UI.

The user explicitly approved temporary HTTPS tunnels for all three services and ADB on
emulator-5554. The original Pixel_8_Pro emulator contained an old release app and insufficient disk
space; it was preserved. A separate empty audit AVD was created under the ignored isolated-stack
directory, and the existing debug APK installed. Its JavaScript loaded the current local bundle. No
real account credentials were used.

The three tunnels had a one-hour shutdown bound and were stopped manually after verification. The
listener, web server, Metro and audit emulator were stopped; process and listening-port inspection
confirmed no tunnel/test server remained. The hosted test webhook was temporarily disabled under
prior permission, then restored and independently verified enabled by the fixture cleanup. No SQL or
hosted schema was changed.

## Executed native journey

1. Signed in as the synthetic homeowner through the real Android app and HTTPS-isolated Auth
   service; skipped optional onboarding.
2. Opened the assigned job through Jobs, then Pay Now. The API quote displayed GBP10 total, GBP1.20
   platform fee and GBP8.80 contractor payout.
3. Opened Add payment method, Stripe native PaymentSheet in TEST mode, and entered Stripe's
   published authentication-required test card. Completed its setup 3DS2 challenge and returned to
   Mintenance.
4. Found a real return-path defect: setup opened another tab, returned to Home, and the existing
   checkout still showed no saved cards. Reopening checkout retrieved the saved card.
5. Selected that card, pressed Pay GBP10, completed a second native 3DS2 challenge for the actual
   payment, and saw Payment Successful only after application confirmation. Independent local escrow
   polling recorded pending -> held. Returning to the job removed Pay Now.
6. Independent Stripe inspection found exactly one matching PaymentIntent among the latest 100,
   status succeeded, amount_received 1000 GBP minor units, livemode false. Charge three_d_secure
   reported authentication_flow challenge, result authenticated, version 2.1.0. Cleanup fully
   refunded the charge. This is not a native payout or bank-app redirect test.
7. Opened the implemented contract deep link while authenticated. The accepted synthetic contract
   and both fixture signatures rendered. Download PDF opened Android's storage-access folder picker.
   Selected Documents, approved access, and received PDF saved. A real 6,025-byte file existed in
   that folder with `%PDF-1.3` signature and `%%EOF`; it was pulled for local inspection. No claim
   of pixel-level PDF rendering validation is made.
8. Reloading the development bundle preserved the authenticated session. Offline interruption,
   expired-session refresh, process death during payment and negative native challenge outcomes were
   not exercised.

## Repairs

- `apps/web/app/api/jobs/[id]/payment-details/route.ts`: quote resolves the assigned contractor's
  effective subscription tier using the same resolver as release, instead of always quoting Basic.
- `apps/web/lib/services/payment/FeeCalculationService.ts`: failed entitlement/subscription queries
  and unknown recorded tiers return a retryable 503 instead of silently charging Basic. A successful
  empty subscription result still means Basic. Existing fee arithmetic is unchanged. This does not
  freeze fees across subscription changes between quotation and payout.
- `apps/mobile/src/screens/PaymentScreen.tsx`, JobsNavigator and navigation types: card setup stays
  in the Jobs stack; checkout reloads saved methods when it regains focus. A regression simulates
  returning from setup and verifies the newly saved card enables payment. The repaired first-card
  path still needs a fresh native end-to-end rerun; the successful native charge above used checkout
  reopened after the original defect.
- `apps/mobile/src/screens/job-details/JobDetailsScreen.tsx` and JobQuickActions: a persistent View
  Contract action is available to the homeowner and assigned contractor when a contract exists,
  including after funding removes the payment CTA. API authorisation remains unchanged. The native
  PDF pass used the existing deep link; the new action itself has not been counted as a device pass.

## Validation

- Fee quote/resolution + original escrow lifecycle: 3 files / 69 tests passed.
- Other fee/payment callers: 9 files / 102 tests passed; payment-flow initially exposed an
  incomplete subscription query mock. After explicit successful-empty entitlement fixtures, all 72
  payment-flow tests passed. Total across these distinct web files: 243 tests.
- Native payment screen, payment hook and binary PDF utility: 3 suites / 48 tests passed.
- Web and mobile TypeScript checks passed. Mobile was rerun after adding the persistent contract
  action.
- The subscription fixture changes model actual database success; no production error handling was
  weakened to pass tests.

## Remaining evidence and limitations

- No Firebase configuration in the tested native binary: push delivery remains blocked. No native
  Google Maps key was configured; map tiles/location/background behaviour remain unverified on this
  build. Prior web map results remain scoped to the preceding checkpoint.
- Metro generated HTTP font-asset URLs through its HTTPS tunnel. Android rejected these, producing
  development error overlays and missing icons. No cleartext exception or production control was
  disabled. This test-environment issue needs correction for a clean repeatable native test setup.
- The app's screen-capture guard obscured the underlying React Native window, but ADB screenshots
  still captured Stripe's separate native PaymentSheet and 3DS activity with synthetic data. Do not
  assume the React Native guard protects provider-owned windows; review the SDK's supported
  protection and threat model before claiming this guarantee.
- Full Express Connect payout, completed-work/release UI, negative native
  challenge/cancellation/recovery, real bank hand-offs, and fault-injected provider/database
  recovery remain open as previously recorded.
- Hosted invitation/email delivery, cron reliability, durable disposal and processor/backup
  retention boundaries remain tracked in CONTROLLED-PILOT-MILESTONES.md. No full milestone is marked
  complete merely from these checks.

## Files added

Committed audit artifact: this document. Committed diagnostic regression:
contractor-fee-resolution.test.ts. Other changes are the named source and existing regression tests.
Ignored local launchers, test fixture scripts, screenshots/UI dumps, test logs, synthetic PDF,
provider proof and empty audit AVD remain under audit/2026-09-06/isolated-stack and are not
committed. Environment credentials and tunnel URLs are not included in committed artifacts.

### EAS configuration follow-up

After the native run, a read-only EAS development variable listing confirmed GOOGLE_SERVICES_JSON
and Google Maps variable names exist. Thus configuration is present in EAS but absent from the
tested local binary. Automatic review rejected retrieving Firebase configuration contents into a
local diagnostic file; explicit retrieval/build-use permission was requested. Neither key validity
nor Android restriction/signing compatibility is established by the variable-name listing.
