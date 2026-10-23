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

Prepared removal of the obsolete personal project's Git connection to stop duplicate failing checks. Automatic approval review blocked the final action because explicit authorization is required to stop that project's automatic deployments. Approval was requested; no connection was removed at this checkpoint. Its existing deployment and settings would be preserved. The Mintenance production connection and beta restrictions remain unchanged.
