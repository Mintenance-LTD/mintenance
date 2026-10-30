# Aikido follow-up after PR #1444

Reviewed the signed-in Aikido feed on 30 October 2026 against main at
`e6d65f0b1838f8eb9c47fdd00d65f1e967c05bee`. It still reports 92 grouped
issues, including the old YOLO temporary filename fixed in PR #1444. The
file-inclusion group says last detected one day ago. This is stale scan
evidence, not a confirmed post-merge rescan.

Issue #1: Potential file inclusion attack via reading file
- ID: 54457957 (model evaluation metrics and training log locations)
- Issue type: sast
- Severity: 70 (High)
- Remediation: Validate model versions as bounded filename identifiers, reject
  non-regular files and links when reading metrics/logs, and place each Python
  evaluation result in a private random directory with a fixed filename.
- Files: apps/web/lib/services/building-surveyor/ModelEvaluationService.ts and
  model-evaluation/log-parser.ts
- Issue link: https://app.aikido.dev/queue?sidebarIssue=54457957

## Change and boundaries

`extractMetricsFromTraining` previously interpolated the model version into
`metrics-<version>.json`. A version such as `x/../../outside` could escape the
selected output directory. Versions now start with an ASCII alphanumeric
character and contain only ASCII alphanumerics, dots, underscores and hyphens,
up to 128 characters. Invalid versions fail before reading metrics or logs.

The shared artifact reader accepts only a direct-child filename, checks that
it is a regular file, opens without following leaf symlinks on POSIX, checks
the opened descriptor and reads that descriptor. Missing metrics retain the
existing log fallback; malformed JSON, links and non-files fail closed.
The training directory remains trusted operator configuration: this is not a
sandbox for arbitrary request-supplied roots. Windows uses the link check and
directory access controls; POSIX additionally prevents a leaf symlink swap
between checking and opening. Hard links and malicious parent-directory
replacement by an actor with write access to that trusted root are outside
this boundary.

`evaluateModel` previously wrote predictable result files in the working
directory. It now gives Python a fixed `evaluation.json` path inside a private
`mkdtemp` directory. Names cannot affect that output path, repeated evaluations
do not share a result, and success without a fresh output fails. The file and
directory are removed in `finally`, including Python and JSON failures. Cleanup
errors are logged without hiding the original evaluation result/error.
Shell-free argument handling and the Python CLI interface are preserved.

This addresses these evaluation locations and the related predictable-output
problem, not all 243 locations in the group. No finding was suppressed. The
previous SQL/timing and placeholder-token triage still applies; historical
credential revocation remains unverified. Plan-hidden findings were not accessed
or inferred. The existing beta training/reuse holds were not changed.

## Validation

- 31 focused Vitest tests passed across model evaluation, training metrics files
  and the previous YOLO temporary-file regression suite. These use real files,
  with Python/ONNX and database boundaries mocked; they are software regression
  tests, not model accuracy or GPU tests.
- Coverage includes Unix/Windows traversal and stream syntax, invalid versions,
  valid JSON and log metrics, malformed/missing output, directory/junction
  rejection, same-name evaluation isolation and cleanup on success/failure.
- Two external file-symlink tests are skipped on Windows and included in the
  existing full web test suite on Linux CI. Junction rejection passed locally.
- Full `npm run type-check:web` passed. ESLint passed for all three changed
  production files with no warnings or errors. `git diff --check` passed.
- The previously checksum-verified Gitleaks 8.30.1 binary found no leaks in all
  six changed files using default rules, without repository allowlists.
- Aikido MCP issue/login/scan tools are unavailable. The signed-in feed remains
  accessible; the previous manual rescan attempt was blocked by the free plan.
  No new Aikido scan or clearance is claimed.
