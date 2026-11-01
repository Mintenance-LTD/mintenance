# Glob dependency security — 1 November 2026

Updated modern glob consumers to 14.0.3 and minimatch consumers to 11.0.3.
The associated path-scurry dependency moves to 3.0.0. Other existing package
versions are preserved; the new matcher support package is locked with its
registry integrity hash. Root and workspace manifests agree on the modern
minimatch version. Explicit Expo/Sentry overrides prevent their nested old
copies from surviving npm resolution.

The updates address glob cancellation continuing filesystem traversal after
rejection ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4))
and modern minimatch globparts amplification
([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)).
Legacy callback glob and callable minimatch consumers retain their existing
APIs. Minimatch 3.1.5 and 5.1.9 lack the advisory's firstPhasePreProcess /
optimizationLevel expansion; regression tests confirm they retain one pattern
for the amplification fixture. npm still flags these versions because its
advisory range is broadly `<11.0.1`. No new audit exception was added.

Validation on Node 20.19.4:

- Clean npm 11.6.2 install from the scoped lockfile passed.
- All 50 security dependency tests passed, including 11 glob/matching tests.
  Four loopback tests initially hit sandbox EACCES and passed outside the
  sandbox; the other 45 original tests and the additional legacy test passed.
- All ten shared packages built. Full web and mobile TypeScript checks passed.
- Android Metro/Hermes export passed (3,123 modules), using synthetic public
  settings. This is bundle compatibility, not a signed-device acceptance test;
  Firebase credentials were intentionally absent and no build was published.
- Web ESLint smoke and `git diff --check` passed. Gitleaks found no secrets in
  the changed test files. Aikido MCP remains unavailable.

The production npm audit reports 33 affected package entries (including parent
packages), representing three distinct advisories: legacy minimatch as above,
the existing bounded-collection Zod 3 mitigation due for review by 13 November,
and low-severity deepmerge prototype poisoning with no patched version in the
registry (latest remains 4.3.1). These are not claimed cleared. The glob
cancellation advisory no longer appears. Historical credential revocation,
license review and a fresh Aikido scan remain separate requirements.

Production settings, payment state, beta gates and AI training holds were not
changed. Security PR CI must pass before merging these dependency changes.

The initial PR workflows that use npm 10.8.2 rejected the npm 11 lock because
their resolver missed the generic override for archiver-utils/rimraf. Added
explicit overrides for these two modern glob consumers, preserving the direct
rimraf version with `$rimraf`, and extended the consumer regression coverage.
An actual npm 10 clean install passed, followed by all 13 glob/consumer tests
(52 unique security tests covered across the runs). Gitleaks and diff checks
passed again. No vulnerable dependency was added to appease the older resolver.
