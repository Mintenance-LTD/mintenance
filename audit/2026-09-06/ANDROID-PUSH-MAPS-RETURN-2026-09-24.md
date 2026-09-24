# Android push, maps and checkout return — 24 September 2026

Readiness remains unestablished outside the tested scope. This checkpoint supersedes the missing
Firebase/native Maps configuration blocker in ANDROID-PAYMENT-PDF-FEES-2026-09-24.md.

## Environment and safety

- Explicit permission covered EAS development configuration retrieval, temporary HTTPS API/Auth/
  Metro tunnels, ADB on the isolated emulator and synthetic Stripe test-mode operations.
- EAS would not download the secret Firebase file. An existing development APK from 6 August 2026
  contained Firebase resources, a configured Android Maps key and the Expo development client. That
  APK ran current local JavaScript on the separate MintenanceAudit Android 36 emulator. This is not
  a newly built release-candidate binary or a physical-device certification.
- The approved development Maps value was loaded into ignored local launch configuration without
  printing or committing it. All users, jobs, notifications and payment methods were synthetic. The
  app and database pointed to isolated local services. No production records were changed.

## Executed results

1. Android notification permission was requested through the dashboard setup action. The OS prompt
   was accepted, native FCM and Expo registration succeeded, and the local database held one device
   token for the synthetic contractor. The dashboard marked notifications enabled.
2. Authenticated POST /api/notifications/send from the related synthetic homeowner produced an
   actual Android notification, including when the app was backgrounded. Delivery was observed in
   the OS tray, not inferred from HTTP success or a database flag.
3. Initial tap behavior was inconsistent. AppNavigator checked readiness only during its user
   effect, so restored authentication could run before NavigationContainer became ready and never
   register listeners. The new useNotificationNavigation hook registers on either authentication or
   the container's onReady event, once per active account, and cleans up on logout/account change.
   After restarting the app with this repair, tapping a background notification opened the assigned
   synthetic job, displaying its title, contract action and waiting-for-payment state.
4. Native Google Maps rendered actual London tiles. An unverified synthetic contractor was blocked
   from discovery. After preparing a verified local fixture, the empty-area state appeared. A
   synthetic posted plumbing job then appeared as one marker and a GBP100 card. Details opened that
   exact job with its matching description and category. No bid was submitted.
5. Synthetic homeowner login -> assigned job -> Pay Now -> Add payment method -> Stripe TEST card
   setup completed with the public 4242 test card. The app returned directly to the original
   checkout in the Jobs stack and automatically displayed VISA ending 4242, without manually
   reopening the job. This revalidates the setup-return/focus-refresh repair in commit 5d2fec426. No
   charge was made in this second run; completed native 3DS payment and full refund evidence is in
   the prior report.

## Changes and regression evidence

- NotificationPushSender allows supported Android emulators, creates Android notification channels
  before requesting permission, and no longer puts the Expo token in logs or Sentry breadcrumbs.
- AppNavigator connects NavigationContainer.onReady to the new lifecycle hook described above.
- Four focused suites passed: 54 tests covering registration, channel ordering, privacy, delayed
  readiness, account changes, badge behavior and existing notification breadcrumbs.
- Mobile TypeScript check passed after the final navigation repair. These tests mock native/provider
  boundaries; the device observations above supply separate integration evidence.

## Cleanup confirmed

- Synthetic map job deleted; checkout fixture completed cleanup successfully.
- Hosted test-only Stripe webhook restored and independently read back as enabled by the fixture.
- All three tunnels, local web server, Metro and Stripe listener stopped. No listeners remained on
  ports 3018/8087 and no cloudflared/Stripe/emulator processes remained in the cleanup check.
- Verified AVD identity MintenanceAudit, uninstalled its EAS APK, then stopped the emulator.
- Removed the retrieved APK, Maps key file, Firebase retrieval error file, EAS variable/build
  listings and APK resource/manifest dumps. No retrieved configuration is committed.

## Remaining limits

- Physical devices, current release binaries, iOS, killed-state notification taps, token rotation,
  offline/retry behavior and provider rejection/receipt processing are not established by this run.
  NotificationPushDispatcher currently treats HTTP success as push acceptance without inspecting
  per-ticket errors; this needs a separate repair and provider-failure regression coverage.
- Native map panning/filter combinations, denied-location recovery, geographic privacy and the full
  discovery-to-bid flow remain only partially covered. Tile success does not prove key restriction
  configuration is appropriate for release signing.
- Metro supplied HTTP font URLs despite its HTTPS tunnel. Android correctly rejected them;
  diagnostic overlays were dismissed during testing. No transport controls were weakened. Fix the
  isolated asset setup before relying on it for clean visual/accessibility acceptance.
- The wider invitation delivery, durable dispute retention/disposal, operational recovery and
  Express Connect/end-to-end completed-work release gates remain in the milestone ledger.

Added files: this report, useNotificationNavigation.ts and its diagnostic regression test. Other
diagnostics, screenshots and launchers remain ignored under isolated-stack.
