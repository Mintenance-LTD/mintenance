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
  permission errors. Jest passed with a workspace cache. Android export is being
  repeated with a workspace temporary directory; no cloud build submitted yet.
- Aikido tools unavailable; no security scan claimed. Full device visual checks,
  relay MFA status/enrolment/verification/disable/retry, native sign-in challenge
  enforcement across custom MFA and Supabase, and historical financial
  reconciliation remain unverified. Full release acceptance remains incomplete.

## Build receipt

Pending: exact source SHA, hosted build ID/result, binary package/version,
certificate and APK SHA-256, native fingerprint, Firebase and updates-disabled
manifest checks. No phone installation or physical-device result claimed.
