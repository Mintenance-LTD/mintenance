# Internal Android beta 45 — 8 November 2026

Requested alongside the contractor visit delivery check. Build-only authorization:
no backend/web deployment, OTA publication, store submission, paid plan change,
credential rotation or financial writes. Beta gate and relay admission stay enabled.

## Preparation

- Existing `beta-login-test` profile, package `com.mintenance.app`, display name
  `Mintenance Beta`, version 1.2.4, runtime `1.2.4-beta-login1`.
- Beta versionCode increases from 44 to 45; ordinary profiles remain 40.
  Latest successful beta build 08bd066c-398f-4e5c-b9aa-ebd012965c59 used 44.
- OTA remains disabled. Existing remote Android credentials are frozen during
  submission. Production API and the existing authenticated relay remain selected.
- Expo project 1ee95edc-0cc1-4775-b52e-4af46f9e51d0 has unauthenticated internal
  downloads disabled (verified in signed-in project settings). Do not publish the
  raw artifact URL in this repository.
- November Android allowance was 14/15 before submission. No paid upgrade is
  authorized. Existing production Firebase file environment is present; public
  build configuration was supplied locally without exposing secrets.
- Node 20.19.4 / repository-pinned EAS CLI 25.3.0. Security preparation and all ten
  shared package builds passed. Build/configuration tests: 23/23. Mobile TypeScript
  passed. Six focused property/quote amendment suites: 73/73. Three notification
  recovery/dispatch suites: 30/30. These are fresh results, not earlier audit totals.
- Initial Windows Jest and Hermes temporary-directory operations encountered
  permission errors. Jest passed with a workspace cache; Android/Hermes export
  passed with a workspace temporary directory. The first EAS archive attempt
  rejected a temp directory inside the checkout before upload/build submission.
  Using a sibling runtime directory resolved it. Exactly one hosted build was
  submitted; no second quota-consuming build or paid upgrade.
- Aikido tools unavailable; no security scan claimed. Full device visual checks,
  relay MFA status/enrolment/verification/disable/retry, native sign-in challenge
  enforcement across custom MFA and Supabase, and historical financial
  reconciliation remain unverified. Full release acceptance remains incomplete.

## Successful build and binary verification

- Clean source: `8e5d1646349b06df56611b29fdb34a47c4f655a1`, pushed on the feature
  branch. GitHub returned no PR-triggered workflow runs for that SHA; no new green
  CI claim is made. Fresh local validation is recorded above.
- Build: `51eb2fa1-3b2c-4d87-a7a2-dd9b747e8a5b`, `beta-login-test`, Android,
  internal distribution. Submitted 14:46:41.260 UTC; FINISHED 15:18:26.825 UTC.
  Hosted prebuild and Gradle release build passed. Existing dependency deprecation
  warnings were present; no build errors. No store submission or OTA publication.
- Native fingerprint: `b61429ebd6db51db7f5c6098a99b8b620a25badb`.
- Actual APK: `com.mintenance.app`, version 1.2.4 (45), 156,251,814 bytes,
  minimum Android API 24. Embedded runtime `1.2.4-beta-login1`.
- APK SHA-256: `b53a2d30a03fd4d2a3fe395092e402cabe3975ff66dad2ad21039e06612c0cbd`.
- Android SDK 35 apksigner verification passed (v2 signature, one signer).
  Certificate SHA-256:
  `0edeefb4a1d4cd9b806e13fb9857df65b3ee0c30531b007d2112a4467b99e3b3`.
  Matches the independently verified previous beta 44 artifact. No signing key
  was downloaded locally, regenerated or rotated. Official portable verification tools
  were downloaded into ignored output and their published checksums verified.
- Binary manifest explicitly has `expo.modules.updates.ENABLED=false`; embedded
  app config also disables updates. Project ID/package/runtime verified. Hermes
  bundle contains the existing mobile-api-relay URL. Android Firebase google_app_id
  and gcm_defaultSenderId resources are present; hosted Firebase file was supplied.
- Private local artifact: `output/mintenance-beta-45.apk`. Verification evidence:
  `output/apk-45-verification.json`, `output/apk-45-signature.txt`, manifest/resource
  dumps and hosted log under ignored output. Raw artifact URLs are not committed.
- Protected build/install page:
  https://expo.dev/accounts/mintenance-ltd/projects/mintenance/builds/51eb2fa1-3b2c-4d87-a7a2-dd9b747e8a5b
  Artifact expires 22 November 2026. Expo sign-in is required by the existing
  internal-download setting. Install as an update; do not uninstall, clear app
  storage or force a downgrade if Android rejects it.

APK built and inspected; installation, fresh-build physical-device visuals, actual
phone push presentation and MFA checks remain unverified. Matching the previous
beta certificate does not establish the signature/version of the user's currently
installed app. Full release acceptance remains incomplete. Beta/protection and
relay admission unchanged; no backend/web deployment, main merge or financial writes.
