# Phase 3 Generated Database Types and Schema Contract Audit

Date: 2026-09-01  
Environment: **READ-ONLY ANALYSIS** — the locally generated `apps/web/lib/database.types.ts`
artifact was not included in the commit because the repository's 500-line commit gate rejects
generated files of this size.

## Provenance and confidence

`apps/web/lib/database.types.ts` is a local, unannotated generated-style Supabase type file. It
contains objects introduced by local migrations after the live head, including `location_point`,
`unsubscribe_token`, VLM lifecycle fields, and the PostGIS matching RPCs. Because the live database
is behind the local migration head and Docker prevents `supabase db diff --local`, its exact
generation source cannot be proven from this workstation. Treat it as aligned with the intended
local schema, not as proof of live schema parity.

During Phase 3 validation, the shared package declaration cache was also found to be stale: source
exports were present but `packages/shared/dist/index.d.ts` was missing them. A forced TypeScript
rebuild restored the declarations and web type-check then passed. This was a local artifact issue,
not a live schema change.

A read-only Supabase MCP type-generation snapshot was also obtained from the live project (about
1.08 million characters; no file was written). It contains the older `newsletter_subscriptions`
shape and some pre-existing `unsubscribe_token`/`model_version` occurrences, but it has no
occurrences of the post-head fields `location_point`, `reserved_by_job_id`, `reserved_at`,
`invalidated_at`, UK tax identity, earnings statements, or bookkeeping. This direct live-generated
evidence is consistent with the migration-history drift and means the current checked-in generated
file must not be used to claim that the post-head fields are deployed.

## Important table coverage

The file contains `Row`, `Insert`, `Update`, and relationship definitions for:

- `properties`
- `jobs`
- `bids`
- `contracts`
- `messages`
- `payments`
- `profiles`
- `compliance_certificates`
- `recurring_maintenance_schedules` and `recurring_schedules`

It also contains the relevant RPC signatures, including `find_contractors_for_job`,
`find_jobs_near_point`, and the security helper functions used by RLS policies.

## Local migration fields represented

| Local-only or recently changed object               | Type-file evidence                                            | Contract risk                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newsletter_subscriptions.unsubscribe_token`        | Present as `string                                            | null`in`Row`; optional nullable in `Insert`/`Update`                                                                                         | The migration makes it `NOT NULL` with a UUID default. The nullable `Row` representation may reflect an older snapshot or generator treatment; verify against the actual deployed schema before relying on non-null behavior. |
| `profiles.location_point`                           | Present as `unknown`                                          | Expected for a PostGIS geography value, but the API/frontend models must not assume a JSON shape without an explicit serialization contract. |
| `jobs.location_point`                               | Present as `unknown`                                          | Same PostGIS serialization risk; verify RPC/API boundaries and mobile models.                                                                |
| `vlm_training_buffer.reserved_by_job_id`            | Present as nullable `string`                                  | Matches the local migration; live presence is unverified.                                                                                    |
| `vlm_student_calibration.model_version`             | Present as non-null `string` in the relevant table definition | Matches the local migration’s default/not-null intent; existing live rows require migration verification.                                    |
| `find_contractors_for_job` / `find_jobs_near_point` | Present with local RPC argument and return shapes             | Application code depends on these RPCs but also has fallbacks; live execute grants and function definitions must be verified before cutover. |

## Cross-layer contract checks

- API contract definitions and route validators should be compared against the table
  `Insert`/`Update` shapes for owner IDs, job IDs, quote amounts, payment IDs, and status fields
  before executing cross-user tests.
- The generated file uses broad `string` types for many statuses and roles; database constraints and
  application validators remain the authoritative business-rule layer.
- `properties.photos`, job evidence, documents, and tenant reports require a separate storage/API
  authorization check; their presence in generated types does not establish access control.
- `payments` includes payer/payee, amount, currency, Stripe identifiers, and lifecycle status, but
  type presence does not prove server-authoritative amount or mutation authorization.
- The generated relationships include multiple historical/view references in some areas; these
  should be validated against the live schema before using them as migration evidence.

## Required next verification

1. Obtain a live schema snapshot and compare table columns, nullability, constraints, policies,
   function signatures, and grants.
2. Generate a separate type file from the approved target schema, retaining the current file until
   the source is known and reviewed.
3. Run API contract and frontend/mobile model checks against the approved schema, especially status
   values, PostGIS serialization, payment fields, tenant-token fields, and
   compliance/recurring-maintenance objects.

Conclusion: **INTENDED LOCAL SCHEMA COVERAGE: PRESENT; LIVE PARITY: NOT PROVEN; TYPE REGENERATION:
DO NOT PERFORM YET.**
