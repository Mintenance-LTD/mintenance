# Restricted beta APK delivery

Prepared 29 October 2026. This is a build and phone-test plan, not an APK release.

## Delivery decision

Build a new Android internal APK with profile `beta-login-test` after the known Expo Free Android
quota reset on **1 November 2026**, once available quota is confirmed. Do not retry builds before
then, buy an upgrade, merge this preparation to trigger automatic native builds, or publish an OTA
to the old preview channel.

The installed preview APK is 1.2.4 (40), runtime `1.2.4-sqlcipher1`, from the dirty source
`c1a784f*`. Its original build artifact expired. Matching app versions or native dependency versions
does not prove OTA compatibility with that source. See
[Expo runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).

The new opt-in profile inherits the existing preview environment and Android APK configuration. It
adds only the public relay URL, uses channel `beta-login-test`, and retains remote signing
credentials. App config produces `Mintenance Beta`, version 1.2.4 (41), package
`com.mintenance.app`, runtime `1.2.4-beta-login1`, with `updates.enabled=false`. It runs its
embedded bundle only; this runtime describes a new binary and does not claim compatibility with the
old APK. Other profiles retain their current config. See
[Expo updates configuration](https://docs.expo.dev/versions/latest/config/app/#enabled).

## Server and verification status

The selectively deployed `mobile-api-relay` version 3 has JWT verification on, online Auth
validation and a server-only allowlist for the single approved account. Its dedicated hosting
credential remains server-only. No email, UUID, password, bypass token or service-role key belongs
in this build profile or APK. The gateway URL alone grants no access. Website Vercel protection
remains enabled.

On 29 October, the approved account's actual profile read returned HTTP 200 with the correct
identity. A different userId query still returned its own identity; admin access, modified JWT and
the signed-out test token were rejected. This verifies those server checks, not dashboard behavior
on Android. Hosting may add its own cookies even though the function strips upstream response
cookies. The deployed route-prefix repair is tracked separately in PR1438; reconcile its tested
source with the repository before future relay deployments.

## Before submitting one build

1. Review the final source commit and its CI results. Use a clean checkout of that exact commit,
   Node 20.19.4 and the lockfile. Record the SHA in the release receipt. Do not silently build a
   moving main branch or include uncommitted files.
2. Keep existing website protection and relay admission unchanged. Confirm the relay still accepts
   the approved account and rejects missing/invalid tokens.
3. Confirm available Android quota. Install the repository-pinned EAS CLI from `tools/eas-cli`
   (25.3.0); use its `build --help` to check supported flags.
4. Confirm the selected EAS `production` environment still contains the correct public
   Supabase/Stripe settings and existing Firebase file settings. Use normal authenticated tooling;
   never print full config, secret values or download keys into the repository. The preflight
   requires public settings locally as well as on the remote builder. Do not change global Expo
   environment variables to route other profiles through this test gateway.
5. Run security preparation and shared-package builds, then the offline checks below. Review
   failures; do not weaken validators or skip lifecycle scripts.
6. Confirm the phone's installed version code is below 41. If it is newer, choose and review a
   higher test version before building. Confirm the existing remote keystore matches the installed
   package's signing certificate. Do not generate, replace or rotate a keystore to get past an
   installation failure.
7. Restrict the artifact download to the intended tester. Expo internal URLs are accessible to
   anyone who has the URL by default; use the project's authenticated download setting where
   available and verify it before sharing. Do not post the APK URL publicly. Server account
   admission remains necessary even with an APK. See
   [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).

From the repository root, with the existing public build settings supplied securely:

```sh
node scripts/apply-security-patches.cjs
npm run build:packages
node --test scripts/validate-eas-config.test.cjs scripts/mobile-build-changes.test.cjs
node scripts/validate-eas-config.cjs beta-login-test
```

After all gates above, from `apps/mobile`, using the repository-pinned CLI:

```sh
node ../../tools/eas-cli/node_modules/eas-cli/bin/run build --platform android --profile beta-login-test --non-interactive --freeze-credentials
```

This submits a billable/quota-consuming build and has **not** been run as part of preparation. Do
not add auto-submit, publish an update, or change channel mappings. Once complete, inspect the
actual APK's package, version code, signing certificate, updates-disabled manifest setting and
SHA-256 before installation. Record the EAS build ID, source SHA, APK SHA-256 and native fingerprint
in the release receipt. Config tests do not substitute for these binary checks.

## Phone test

Install as an update to the existing app only after signature/version checks. Do not uninstall,
clear storage, or use an Android downgrade flag: unsynced local data may otherwise be lost. If
Android refuses the update, stop and diagnose.

1. Open `Mintenance Beta`; sign in with the already-approved account. Keep passwords and access
   tokens off screenshots and chat.
2. Confirm the dashboard remains open and profile information belongs to that account. Read-only
   navigation is enough; do not create jobs, send messages, upload property documents or make
   payments for this login test.
3. Force-close and reopen twice. Confirm the session restores without a login loop.
4. Briefly disable networking, navigate to a read-only screen, then reconnect. Confirm an
   availability error does not erase a valid session and retry works.
5. Explicitly sign out, confirm protected screens are unavailable, then sign in again. Stop if
   another account's information appears or authentication loops.
6. Check the website in an unauthenticated browser still reaches Vercel login. Record phone
   model/Android version, build ID and pass/fail for each step; omit personal profile content and
   credentials.

## Stop and recovery

If the test fails, retain the APK/build receipt and safe error/status evidence. OTA is disabled, so
correcting this test binary requires another reviewed APK. Do not reinstall the old version with a
downgrade or uninstall; prefer a forward fix with a higher version code and the same signing key.
Only if access itself must be withdrawn, remove the approved relay admission through the authorized
server process. Do not disable website protection or embed a bypass in the app.

Until the artifact is built, inspected, installed and the phone steps pass, report **delivery
prepared; installed APK fix unverified**.
