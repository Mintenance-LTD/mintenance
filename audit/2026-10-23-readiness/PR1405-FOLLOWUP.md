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
