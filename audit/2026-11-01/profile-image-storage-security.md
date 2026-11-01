# Profile-image storage authorization — 1 November 2026

Follow-up to merged PR #1455. Aikido's signed-in queue still reports 90 grouped
findings, including stale dependency and storage locations. Within high-severity
SAST finding [54457533](https://app.aikido.dev/queue?sidebarIssue=54457533), six
remaining privileged deletion paths trust user-editable profile image URLs:

- Avatar replacement and deletion.
- Cover-photo replacement and deletion.
- Selfie replacement.
- Legacy multipart profile-image replacement.

The routes authenticate the caller and select their profile, but the URL in that
profile can reference another user's object. The JSON profile-update endpoint
accepts `profileImageUrl`, and the historical profile UPDATE grant also includes
both image URL columns. Splitting the URL at its last slash or bucket name then
calling Storage with service-role credentials lets that reference authorize a
foreign-object deletion. Storage RLS cannot protect these service-role calls;
see [Supabase's access-control documentation](https://supabase.com/docs/guides/storage/security/access-control).

The shared guard now accepts only the configured Supabase origin, exact public
bucket URL, and the upload routes' owner-scoped image names. It validates the raw
path before any normalization and rejects traversal, percent encoding, controls,
backslashes, query/fragment suffixes, nested paths and user-ID prefix collisions.
Untrusted references are skipped during cleanup; replacing or clearing the
profile still works. Valid own-image cleanup and rollback of a newly uploaded
object remain supported. Unknown historical/CDN URL formats may leave an orphan
blob, rather than risking deletion of an object with unverified ownership.

Validation:

- The initial 64-case route regression suite produced 52 authorization failures
  against the original implementation, with the remaining 12 cases passing.
- Expanded regression suite: 193 tests passed across ten suites, including 88
  profile-image cases, existing avatar/selfie validation, and PR #1455 storage
  authorization coverage.
- Shared-package builds passed (10 packages).
- ESLint passed for all five changed source files; the service-role scoping gate
  reported zero new unscoped query sites across 493 routes.
- Full web TypeScript check passed after linking the existing workspace-local
  Stripe dependency. The initial setup-only lint failure was resolved by linking
  the installed, lockfile-matching Next.js ESLint config (16.4.1).
- `git diff --check` passed. Gitleaks 8.30.1 with its default rules found no
  secrets in the staged diff; this is a secrets check, not an Aikido SAST scan.

The separate glob/minimatch dependency work is already tracked in PR #1457 and
is not duplicated here. The two critical license findings still need license
review. No Aikido findings were suppressed or marked resolved. Aikido's MCP
scan tools remain unavailable, so this is not a fresh Aikido scan clearance.
No database migration, production storage mutation or deployment was performed.
