# Storage security follow-up — 1 November 2026

PR #1455 validates privileged document and property-room-photo paths against
the resource being accessed. The follow-up review found the same trust problem
in post-job reminder emails: an editable photo metadata path was signed with
service-role credentials without checking the recipient or job namespace.

The reminder now requires a canonical path belonging to the completed job and
uses the existing `authorized_private_photo_paths` check with the recipient's
homeowner ID. Signing uses `Job-storage`, matching the upload routes, instead
of the unrelated `job-attachments` bucket. URLs use the same one-hour lifetime
as in-app readers; unavailable or unauthorized photos are omitted. As with
other private image capabilities, images in an email opened after expiry are
unavailable. No email was sent by these unit tests.

Validation:

- 88 focused tests passed across seven storage suites, including 19 new
  reminder tests for valid current/legacy paths, foreign jobs, encoded paths,
  traversal, malformed metadata, denied authorization and missing objects.
- Full web TypeScript check and ESLint for the two changed source files passed.
- `git diff --check` passed.
- Prior PR head a92c23200 passed security, E2E, deployment-preview and CI checks.
  New commits require their own CI results before merging.

Aikido's signed-in queue still reports 90 grouped findings, including previously
fixed code. The download-artifact finding points to an action no longer present
in the held ML workflow. The SQL, timing and placeholder-token groups retain
the source-backed triage in the October audit reports. Historical credential
revocation cannot be established from redaction alone; license findings require
their own review. No findings were suppressed or marked resolved.

The Aikido MCP scan/login tools are unavailable, and the prior manual rescan was
blocked by the Free plan. This is not a fresh Aikido clearance or an audit of
every location in the grouped feed. The Zod 3 bounded-collection mitigation and
its 13 November review deadline remain in effect. Production and beta settings
were not changed.
