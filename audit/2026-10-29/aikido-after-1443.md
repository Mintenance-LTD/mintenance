# Aikido follow-up after PR #1443

Reviewed the signed-in Aikido queue on 29 October 2026 against main at
`172a9872c60d8f7e6c3598e037a34f7fd14fe19d`. The queue still shows 92 grouped
issues and findings last detected one day ago, including fixes already merged
in PRs #1435 and #1443. This is not evidence of a fresh post-merge scan.

Issue #1: Exposed credentials in an audit report
- ID: 53783936
- Issue type: leaked_secret
- Severity: 80 (High)
- Remediation: Redact the copied Stripe/Google/SendGrid key fragments and the
  literal database password from the current audit report. Preserve the security
  findings and explicitly require credential-owner verification of revocation.
- File: AUDIT_REPORT.md
- Issue link: https://app.aikido.dev/queue?sidebarIssue=53783936

The Aikido subissues flag truncated Stripe and Google key values. Inspection
also found a literal database password repeated four times and a SendGrid key
fragment. None belongs in a source-controlled report. The report now uses
redaction markers. No credentials were tested against a service, rotated or
revoked, and Git history was not rewritten. Removal alone does not resolve
historical credential exposure; credential owners must verify revocation of
any real values previously included in the report. Do not mark this finding
resolved solely because the current file has been sanitized.

Issue #2: Model metadata controls a temporary filesystem path
- ID: 54457957 (one affected location in the file-inclusion group)
- Issue type: sast
- Severity: 70 (High)
- Remediation: Create a private random directory and write a fixed `model.onnx`
  filename with exclusive creation and owner-only permissions. Remove the file
  and its directory at process exit or after a failed write.
- File: apps/web/lib/services/building-surveyor/LocalYOLOInferenceService.ts
- Issue link: https://app.aikido.dev/queue?sidebarIssue=54457957

The old path embedded a database model name and the current millisecond. Path
separators in that name could affect the write target; duplicate loads could
also overwrite the same file. Names remain query values but no longer influence
filesystem paths. Storage and BYTEA loading both retain their existing behavior.
This group contains 243 locations: this change addresses the model temporary
file location, not the entire group or every configurable local file reader.

## Validation

- Full web TypeScript check passed after building shared packages and restoring
  the missing local Stripe 22.3.2 package from the lockfile URL/integrity hash.
  No dependency manifest or lockfile changes were needed.

- 14 focused Vitest tests passed (5 new filesystem tests plus 9 existing model
  evaluation/command-injection tests). Tests use real temporary files and mock
  only the database, Storage and ONNX boundaries; no live user data is accessed.
- New tests cover Unix and Windows traversal strings, unchanged file contents,
  distinct files for same-millisecond loads, process-exit cleanup and write-error
  cleanup. POSIX permission assertions run on Linux CI.
- ESLint reported no errors; the service has existing unused-import/variable
  warnings, and test files are excluded by the repository's ESLint configuration.
- Gitleaks 8.30.1, downloaded from its official release and checksum-verified,
  found no leaks in the four changed source/report files using its default
  rules without the repository's broad allowlists. Output was fully redacted.
- Aikido MCP issue/scan tools remain unavailable. The repository dashboard
  rejected manual rescanning with a paid-plan prompt; the free plan scans daily.
  No fresh Aikido scan or clearance is claimed.

## Other high-priority triage

- 53783941: ApiDocData.ts contains named placeholder API/JWT tokens, not actual
  credentials. No suppression or artificial encoding was added.
- 53783934: Current mobile and local integration-test JWTs identify themselves
  as `supabase-demo` anon/service-role keys and have no production project ref.
  The integration helper restricts its target URL to local test services.
  The dashboard also identifies deleted seed/geocoding scripts and a historical
  materials seed location. No production key rotation is inferred from these
  test fixtures, and historical findings were not marked resolved.
- 54457188: Zod 3.25.76 already has the hash-verified bounded-collection security
  backport in `scripts/patch-zod-v3.cjs`, with behavior tests in CI. Zod 4 tooling
  is pinned to 4.6.7. A full application/SDK major-version migration remains
  separate; this inspection does not claim all six grouped advisories cleared.
- The SQL and timing groups retain the prior triage in
  `audit/2026-10-29/aikido-followup.md`. Previously merged fixes were not repeated.
