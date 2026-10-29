# Password and dependency security release

This branch is based on GitHub main at `629538241d10f533f9cb1f5720070803b548bf4c`. It contains the password/dependency remediation only. Concurrent payment, notification and tenant changes in the other local checkout are not included.

## Changes

- Web registration, password reset and authenticated password changes reject an unavailable breach lookup with HTTP 503. The lookup has a five-second timeout, validates response records and uses HIBP response padding. Zero-count padding records do not reject safe passwords.
- Mobile signup and password reset require a successful clean lookup before calling Supabase. The API adds an explicit `checked: true` marker. Deploy the backend before distributing the mobile update; older backends deliberately fail this check.
- Sentry Next.js is pinned to 10.75.2 and DOMPurify to 3.4.17, with matching Sentry component resolution and compatible OpenTelemetry API 1.9.1. Remotion's esbuild resolves to 0.28.2.
- The Metro 0.83.3 family is overridden to the official 0.83.8 patch series. This retains Expo 54 and removes the vulnerable image-size package using Metro's maintained parsers. [Upstream release](https://github.com/react/metro/releases/tag/v0.83.8).
- UUID 11.1.1 is scoped to Google Cloud Storage, gaxios and teeny-request. Their inspected calls use v4, and the patched version retains their CommonJS/ESM APIs. Tests verify each consumer's actual resolved version and v4 behavior.
- node-forge 1.4.0 has no fixed upstream release. A narrow temporary mitigation rejects unconsumed nested DigestAlgorithm elements, following [upstream proposal 1152](https://github.com/digitalbazaar/forge/pull/1152). The patch accepts only the exact SHA-256-verified registry source or that source with this exact change. Unknown source/version changes stop the build for review. Positive signature and malformed-signature regression tests cover the change.
- Auth/shared package compilation excludes test files from distributable builds, fixing the clean-install build failures caused by test-runner imports.

## Installation and temporary mitigation

For an install with lifecycle scripts disabled (the repository default):

```sh
npm ci --ignore-scripts
npm run security:prepare
npm run test:security-dependencies
npm run build:packages
```

Normal lifecycle-enabled CI installs apply the patch through root `prepare`. Shared-package builds, mobile Expo/EAS npm commands and the existing EAS post-install build hook also apply it explicitly, including when npm skips pre/post lifecycle hooks. `security-scan.yml` requires the dependency regression tests. Anyone invoking tooling directly (for example `npx expo`) after a script-disabled install must run `security:prepare` first. Do not treat an unpatched script-disabled install as mitigated.

The temporary patch does not alter the package version or hide the npm advisory. The five remaining production audit entries all inherit the node-forge advisory. Its existing scoped exceptions still expire on **3 November 2026**. Adopt a fixed upstream version and remove the patch after regression testing when one becomes available. Image-size exceptions were removed; no exception was expanded or extended.

## Operational limits and rollout

Keep Supabase Free, as requested. Application checks do not prevent a custom client from directly invoking Supabase Auth; provider-level leaked-password enforcement remains unavailable on the current plan. HIBP outages now temporarily block setting a password, while existing sign-in remains available.

Release the web backend first and verify the deployment source/lockfile, successful `checked: true` responses and HTTP 503 failures. Preserve restricted-beta protection. Then release and exercise signed mobile builds on devices. Local bundle exports with synthetic settings are not signed installable releases or device acceptance tests.

The database upgrade is an outstanding operational dependency, not a code fix. The live Supabase dashboard offered Postgres 17.11.0.003 from 17.4.1.074 and warned of up to one hour of downtime with no downgrade. Free has no scheduled project backups. A verified manual backup/restore and an agreed maintenance window are still required; neither is established by this Git commit. Check [Supabase status](https://status.supabase.com/) and [upgrade guidance](https://supabase.com/docs/guides/platform/upgrading) before execution. No database upgrade or paid plan change is included.

## Verification

Verified in the isolated checkout:

- 174 regression tests passed: 31 web password tests, 70 mobile authentication/reset tests, 65 sanitizer tests and 8 dependency/security compatibility tests.
- All 10 shared packages built; mobile TypeScript and lint for the four changed web routes passed.
- The Next.js production build passed compilation, TypeScript, all 547 static-page generation steps and final build tracing with synthetic service settings.
- Android and iOS offline Expo exports produced Hermes bundles successfully. These used synthetic settings and were not signed, published or tested on devices.
- The lockfile passed `npm ci --ignore-scripts --dry-run --no-audit --no-fund`; the installed Metro/UUID dependency tree resolved without invalid dependencies.
- `npm run audit:security` passed with the existing expiring node-forge exceptions. The production audit reported five high inherited node-forge entries and no critical, moderate or low entries; the temporary mitigation passed its regression tests without hiding those advisories.
- Staged whitespace, repository hex/currency checks and pre-commit checks passed. The pre-commit check reported the existing 477-line reset screen as approaching the file-size guideline.

`run-tests.cjs` supplies synthetic credentials and disables mobile network-dependent export behavior; logs and generated bundles stay outside the committed sources or in the ignored `tmp/` directory. These checks do not verify live service configuration or deployed behavior.
