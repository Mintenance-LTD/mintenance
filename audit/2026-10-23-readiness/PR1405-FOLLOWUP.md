# PR 1405 conflict and deployment follow-up

Merged main at `47845a1a54f0bac0a65c1266d923a0efcab96af8`, which includes the password/dependency security release from PR 1404. The sole conflict was `package-lock.json`: the readiness branch still contained an image-size dependency removed by the patched Metro dependency tree.

The merged package manifests exactly match main. Kept main's newer lockfile and regenerated its metadata with npm 11.6.2, the CI-pinned version. This added three missing nested entries under glob: minimatch 3.1.5, brace-expansion 1.1.21 and balanced-match 1.0.2. No security dependency was downgraded and no application cron schedule was changed.

Verification:

- `npm ci --ignore-scripts --dry-run --no-audit --no-fund` with npm 11.6.2: passed after the repair. The initial check exposed the three missing entries.
- Combined readiness and password web regressions: 172/172 passed.
- Dependency compatibility and node-forge mitigation tests: 8/8 passed.
- Tests reused the installed security-release dependencies through local junctions and supplied synthetic service credentials.

The screenshot's failed Vercel deployment belongs to a second project, `prj_xAZPqjQmX1wczCQaleRdMrvnXdbK`, under the personal Hobby team `gloirenkouka380-3745s-projects`. Its deployment `dpl_8nMgbWC94EQisMrGozg5zJuT64xf` rejected the five-minute cron schedule because Hobby permits daily cron jobs only. That project's last successful production deployment shown in its dashboard was from 22 April, on `mintenance-clean.vercel.app`.

The actual Mintenance team project, `prj_AILYvESjfKhhj14FkzKWb2oJ1hWv`, successfully built the same original PR commit `f044ecd0` as preview deployment `dpl_EiJUBSBBY5WHcbhgd4xZC2eDjGLy` (READY). These are different projects with the same display name.

After explicit user approval, removed the obsolete personal project's Git connection to stop future duplicate deployments and failing checks. Verified the dashboard states that the project is not connected to a Git repository. Its existing deployment and settings were preserved. The Mintenance production connection and beta restrictions remain unchanged.

The merge commit `55a67d68` cleared the GitHub conflict. Its CI run successfully installed dependencies and passed web/mobile TypeScript checks, then exposed two further blockers:

- E2E browser installation: `ubuntu-latest` selected Ubuntu 26.04, unsupported by the installed Playwright 1.60.0. Pinned this job to Ubuntu 24.04 and limited database cleanup to jobs that attempted database startup.
- The service-role scoping heuristic flagged the MFA setup profile query. Reviewed `validatePreMFASession`: it resolves the account ID from a server-stored, unexpired pre-MFA token. The strict request schema accepts no account ID. Added the scanner's documented inline annotation explaining this existing scope; no authorization behavior or scanner baseline was changed.
- Auth coverage also needed documented guest-token authentication on the report-access and report-photo routes. Reviewed their receipt checks and email-token flow, then added explanatory annotations. All six API/security guard scripts pass; the 15 existing MFA/report-access/photo regression tests pass.
- Mobile service tests found one stale fixture expecting the personal `address` field to populate `business_address`. Corrected the fixture to supply distinct personal and business addresses, preserving the intentional privacy separation. The original service run passed 1,972 of 1,973 tests.

The Mintenance preview for `55a67d68` completed successfully (`dpl_6CtS7YfV3ceZv7iuAeUpDzQzr72R`). CI database authorization/concurrency tests passed. The real-DB integration readiness probe requested the full OpenAPI schema and timed out with HTTP 500; replaced it with a bounded, zero-row profile query using only the disposable stack's credentials, with bounded retries. Its CI rerun still needs verification.

An additional EAS environment blocker remains: setup installs a latest transitive CLI package requiring Node >=22 while the repository requires Node 20.19.4. Native build completion is not verified. No application runtime version or release credentials were changed in this follow-up.

## CI continuation after commit 5bcc01f7

The Vercel preview, mobile test workflow, security scan, Lighthouse and performance checks passed. The web suite passed 4,757/4,759 tests; both failures expected immediate review notifications even though the route now durably queues them. Updated the mock/assertions; the 23-test job lifecycle suite passes locally.

Real-DB setup now succeeds. Updated the contract/review suite to seed through the service client and assert that direct client writes remain denied by the October authoritative-mutations migration. Retention cleanup removes only the synthetic dispute's generated admin tasks before deleting its parent. No production grants or data were changed.

Browser corrections: verified-phone synthetic accounts, a dedicated isolated bid-form job, fresh random signup passwords (the old fixed password is breached), current quotes URL, exact Save button, and public marketing-link assertions alongside the existing protected-page checks. Reviewed all six failed Linux visual snapshots against their expected images/current markup; refreshed the baselines for the current product preview, payment wording, theme and cookie-consent fixture. No comparison tolerance was raised.

EAS 25.3.0 is now installed from tools/eas-cli/package-lock.json, separately from app dependencies. The autocomplete package is pinned to Node-20-compatible 3.2.40 instead of drifting to Node-22-only 3.3.0. Strict engine installation and CLI startup passed on Node 20.19.4. Auth credentials remain confined to the build commands. This does not yet establish that a native EAS build completed.

Validation before push: 23 job-lifecycle tests, five E2E isolation tests, changed test syntax, workflow YAML and git diff checks pass. Real-DB and browser reruns require the Linux CI environment; Docker is not installed in this local Windows environment.

## PR 1406: final readiness corrections

PR 1405 was merged independently while this follow-up was being prepared. PR 1406 targets `main`. Production deployment of merge `7b94ffde` is READY; its sampled two-hour error/fatal log query returned no entries. This is not evidence that every user journey works.

At `8f9eff61`, both web and mobile test steps, TypeScript, lint, authorization gates, Vercel deployment, Lighthouse and performance checks passed in CI. The full local web run passed 4,759 tests. The quality/security jobs failed on newly published GHSA-mrhx-c7xc-m3w5. Real-DB review and retention fixes passed; one cross-user suite still failed its readiness probe. Both probe callers now use the same bounded zero-row query and local service credentials, rejecting unauthorized responses.

Zod: upgraded the nested v4 dependency to 4.6.7. Application/SDK consumers still depend on v3; a direct v4 upgrade revealed API/type incompatibilities. Added a source-hash-verified backport for v3.25.76 that rejects oversized arrays (`max`/`length`) and sets (`max`) before parsing their elements, following upstream PR 6652. Both CommonJS and ESM regressions pass, including nested error paths, custom messages, async parsing and valid inputs. Existing install/build hooks apply the patch and refuse unknown source. The exact v3 advisory path has a temporary exception expiring 3 November 2026; it is not a claim that unbounded schemas are protected. Remove the exception/backport after a tested application/SDK migration to patched Zod 4. Builds must run the security patch hook; skipping lifecycle scripts without that hook leaves the original dependency vulnerable.

Browser shard 2 passed 47 tests, skipped 8 and failed 4 before these corrections. Its screenshot revealed bid form labels lacking input associations: connected all four fields and strengthened the navigation/accessibility checks. Job creation failed because production-mode CI uploaded to local storage; the existing exact job-photo exception now also permits the disposable CI origin, only with matching E2E configuration/secret and no Vercel environment. Tests cover every gate and reject metadata addresses, other ports, buckets, admin paths, traversal and credentials. The mobile screenshot showed a correctly contained row inside a padded card; assertions now verify parent content width, viewport containment and vertical stacking. Shard 1 stalled installing unused browsers; PR jobs now install only Chromium, matching the existing test selection, with a ten-minute installation timeout. Push jobs retain all browsers.

Local focused readiness/storage tests and four Zod security regressions pass; changed TS/TSX syntax, workflow YAML and diff checks pass. Browser and real-DB results for these final corrections still require the next Linux CI run.

Operational limits: the pinned EAS CLI installed and authenticated successfully, selected remote signing credentials and uploaded the Android project. Expo rejected build creation because the account's free Android quota is exhausted until 1 November 2026. No paid upgrade was made and no completed native build is claimed. Stripe's active destination now points to the separate Supabase relay, but its dashboard shows no deliveries since the switch; an actual Stripe delivery remains unverified. No financial event was replayed. Beta restriction and the accepted Supabase Free backup/password-protection blockers remain.
