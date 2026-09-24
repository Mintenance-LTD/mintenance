# Reviewed database-evidence disposal checkpoint

Readiness remains unestablished. This is a bounded improvement to milestone 2, not completion of all
six milestones.

## Implemented

- Staff queue linked from retention reviews; explicit classification/inventory reference, reason,
  current review revision and earliest disposal time.
- Database-verified administrator and fresh MFA for schedule/cancel API operations.
- Minimum 24-hour notice; exact retries return the same decision. Changed decisions conflict.
- Source-row locks shared with hold/review operations. Worker rechecks review revision, holds,
  retention deadline, active records and evidence classification.
- Unresolved disputes, external references and missing archives require reconciliation; they are
  never reported as erased.
- Eligible database archive removal and minimal completion tombstone occur in the same transaction.
  A finalization failure preserves the evidence.
- Daily bounded authenticated worker configured for 02:30 UTC. This records a schedule in source;
  actual deployed execution has not been verified.
- Raw evidence is absent from the staff queue response. Public clients cannot execute disposal
  functions or read decisions; service clients cannot directly delete decision history.

## Executed evidence

- Five focused web test files, 30 tests passed, covering route contracts, stale/error responses,
  fresh-MFA configuration, preserved form input, identical MFA retry payload and worker failure
  reporting. These use mocked wrappers and are not an end-to-end MFA proof.
- Web type check and production-file lint passed. Test files are excluded by the repository's lint
  configuration.
- `evidence-disposal-diagnostic.sql`: rollback-only local authorization, notice, idempotency,
  hold/revision changes, retention dates, external references, cancellation, resolved/unresolved
  disputes and direct-client privilege checks passed.
- `evidence-disposal-races.py`: independent database connections confirmed one concurrent scheduling
  decision and one worker completion. Injected final audit-write failure preserved the source.
  Synthetic fixtures removed.
- Complete migration shadow replay and normalized local comparison: **No schema changes found**.
  Initial comparison differed only in function-body line endings; normalized definitions matched
  before refresh.
- Hosted dry run listed only `20260924084212_add_retained_evidence_disposal_queue.sql`; applied
  successfully on authorized project `ukrjudtlvapiajkjbcrd`.
- Hosted MCP metadata verification: RLS enabled, zero queued decisions, anon/authenticated worker
  execution denied, service execution allowed, direct service deletion denied, fixed search paths.
  No existing evidence scheduled or removed.
- Local advisors: existing PostGIS public-schema and spatial_ref_sys RLS findings only. Hosted
  advisors additionally report existing callable security-definer helpers, leaked-password
  protection disabled and Postgres security patches available. The new internal queue intentionally
  has no client policies; privileges deny access. Do not describe hosted security as clean.

## Remaining evidence work

External-object reconciliation/disposal, processor copies, backup expiry and restore replay,
closed-account identity verification/export, and approved retention classification remain open. A
completed decision means **archived database evidence removed**, not complete erasure. Existing
review/access logs have separate retention obligations; this worker does not erase them.

## Other milestone blockers refreshed

- Configured Stripe test credential rejected by a read-only provider request (HTTP 401). No live key
  used or payment attempted. A valid sandbox credential is still required for provider journeys.
- Java loopback failure resolved for the audit build with a short Unix-domain socket temporary path.
  Native compilation then reached C++; Windows rejected generated paths over 260 characters.
  Object-path limits, shorter staging and an audit-local checksum-verified Ninja 1.12.1 did not
  resolve it. Native device journeys remain unverified. No production security setting or
  application native dependency was weakened.

References:
[Supabase RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
[database upgrades](https://supabase.com/docs/guides/platform/upgrading),
[CMake object paths](https://cmake.org/cmake/help/latest/variable/CMAKE_OBJECT_PATH_MAX.html).
