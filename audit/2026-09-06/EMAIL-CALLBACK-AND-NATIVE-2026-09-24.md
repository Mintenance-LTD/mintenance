# Verification hand-off and native build checkpoint

## Confirmed callback defects and repair

The active registration and resend flows send verification links to `/auth/callback`. The proxy
omitted that public route, so a signed-out request was redirected before token verification. The
callback also used throwing Next.js `redirect()` inside broad catch blocks, converting successful
redirects into error paths, and rejected the default provider redirect with no query token. It
accepted `token` but not the documented `token_hash` format. Error logging included the full
callback URL.

The exact callback path is now public; other `/auth` paths remain private. The route returns
redirect responses, supports explicit email-token verification using a fresh public Auth client,
handles profile synchronization failure, and never creates an application session. Default provider
callbacks lead to normal login without claiming unverified success. Redirects explicitly clear
fragments so implicit provider tokens do not carry forward to login. Error descriptions and
token-bearing URLs are not logged or reflected into the destination.

Validation:

- 31 focused callback and public-route tests passed. Framework navigation is unmocked in the
  callback regression file. The first pre-fix run used the global navigation mock and is not claimed
  as a realistic reproduction of the throwing redirect.
- `email-callback-http.cjs` exercised the real local proxy, route, Supabase Auth and database: a
  generated synthetic signup token confirmed email and profile status; replay failed; no application
  auth/refresh cookies were issued; the default callback led to login without a false verification
  claim. Synthetic account removed.
- No email was sent by that diagnostic. Actual external invitation delivery, registration UI,
  mailbox verification and MFA acceptance remain a separate gate.

## Native build progress

The Android development client now builds successfully and installs on the dedicated audit emulator
(port 5562). The installed Stripe native module is included. Java's Unix-domain socket temp path was
set to `C:/Windows/Temp`. Generated, ignored Gradle files use a shorter ignored object staging
directory, CMake's path limit 256, and an audit-local checksum-verified Ninja 1.12.1. No tracked
application native configuration or SDK installation was changed for those build workarounds.

Actual launch reached the development client, which rejected local HTTP with
`CLEARTEXT communication to 127.0.0.1 not permitted by network security policy`. The protection was
preserved. A trusted HTTPS synthetic test environment is needed to continue device journeys.
Firebase configuration is absent in this audit binary, so push delivery is also unverified.
Build/install/launch is not a journey pass.

The earlier Windows compiler-path blocker in EVIDENCE-DISPOSAL-2026-09-24.md is now resolved; the
current native blocker is trusted test transport/provider configuration. Stripe's configured sandbox
credential is still rejected (401). None of these checks establish readiness for public users or
real money.

References: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[verification API](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[CMake path limits](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html).

## Registration confirmation and recovery follow-up

With email confirmation enabled in isolated Auth, an actual Edge registration issued application
cookies and opened homeowner onboarding while Auth and profile email verification were both false.
This was a confirmed bypass, not a rendering issue. Registration now returns
requiresEmailVerification without creating access/refresh tokens. The screen stays at the inbox step
and preserves the invitation return path. The development email-delivery-failure auto-confirmation
fallback was removed.

Existing unconfirmed cookies are rejected using authoritative Auth confirmation, including refresh
callers of verifyToken. Both bearer verification paths also require confirmed email. This adds an
Auth lookup to web token verification; an Auth outage fails closed. Profile flags and user-editable
metadata are not accepted as proof. Reloading the old unconfirmed browser session now led to /login.
The disposable browser account was removed from isolated Auth.

Resending verification previously required an authenticated user and returned false success after
local provider errors. It is now an anonymous, CSRF-protected recovery route limited to three
requests per 15 minutes (plus Auth provider limits), with a fixed callback origin, validated email,
generic account-status-neutral success text, and retryable errors without provider details.
Registration provides a retry action.

Validation:

- 65 targeted auth/callback tests passed, including old cookies, bearer email status, and failed
  email delivery in production/development/test.
- Full isolated web coverage after central auth changes: 397 files / 4,013 tests passed.
- The subsequent recovery route and UI changes passed six focused tests; real local HTTP also
  confirmed signed-out recovery, no session after registration, failed unconfirmed login,
  confirmation from the captured local mailbox, and successful confirmed login. This diagnostic
  removes its synthetic Auth account.
- Web type checking passed. Production-source lint has zero errors and one existing React Hook Form
  watch/compiler compatibility warning.
- No application SQL was changed in this follow-up, so no hosted migration was needed.

The user confirmed there is no HTTPS staging environment. The running Pixel_8_Pro emulator is
available; it does not resolve the trusted test transport requirement. No real-user account or live
payment was used. Provider email delivery, full invitation verification/MFA acceptance, and native
journeys are not counted as verified.

Final authentication UI, recovery and public-route regressions: 46 tests / three files passed.

Mobile registration/AuthService regression suites passed 58 tests, with five skipped; this is
code-level parity evidence only. Normal commit hooks surfaced two warnings in touched files:
replaced an empty extension interface with a type alias and React Hook Form watch with useWatch. No
checks were bypassed.
