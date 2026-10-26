# Onboarding progress table recovery — review before production

Status: **prepared, not applied**. This change restores the database contract already used by
GET/PUT `/api/onboarding/progress`. The recurring REST 404s will continue until the approved table
migration is applied and PostgREST reloads.

## Evidence and scope

Read-only production metadata on 26 October 2026 confirmed that project `ukrjudtlvapiajkjbcrd` has
no `public.onboarding_journeys` relation. `profiles.id` is a UUID primary key. The existing combined
migration `20261024142808_onboarding_journeys_and_early_access_notices.sql` is absent from
production migration history. Production application base:
`559ebe0a69ce65831a39970987bff5a449c91b5e`.

The API already derives user identity and guide version on the server, validates guide access, and
surfaces database failures. Its local progress/retry fallback does not establish cross-device
persistence. No API behavior change is needed.

**Approval target:** only
`supabase/migrations/20261026205525_onboarding_journeys_table_recovery.sql`. It creates versioned
progress with a profile foreign key, bounded fields, composite primary key, RLS and explicit
privileges. Authenticated clients can read only their own rows; anon cannot read; client
writes/deletes/truncation are denied. The existing service-role API remains the writer. This is
learning progress, never an authorization or entitlement signal.

The migration has a transaction, a 5-second lock timeout, a 30-second statement timeout and a
PostgREST schema reload notification. It makes no existing-user progress backfill, notifications,
early-access awards, billing changes or cohort changes. The table begins empty; pending local
progress can sync through the existing API.

## Migration ordering

The older combined migration also changes early-access functions/triggers and backfills inbox
notices. **Do not apply that bundle as part of this repair.** Its table section is minimally made
replay-compatible (`IF NOT EXISTS`, policy replacement, explicit PUBLIC revocation); its
notification/cohort SQL is unchanged and remains subject to separate review.

The recovery works both after the older migration (fresh chronological setup) and before it (this
production's missing-table state), without losing progress. Do not mark the older bundle as applied:
its other work has not run. The recovery is replay-safe for the known canonical schema;
`IF NOT EXISTS` does not validate an arbitrary existing table. Stop on an unexpected existing schema
or additional policies and review the drift.

**Do not run blanket `supabase db push` or `migration up --linked`.** There are other unapplied
changes. A later blanket push could execute the notice backfill as well. The existing production
deploy workflow can run `db push` on a main push if `SUPABASE_DB_URL` is configured; do not
merge/enable that path as a substitute for this selective approval. PR validation does not apply
production migrations.

## Read-only preflight

Recheck immediately before an approved application. Confirm the project and the exact reviewed
file/commit. No user content or credentials are needed:

```sql
SELECT to_regclass('public.onboarding_journeys') AS journeys;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id';
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'p';
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version IN ('20261024142808', '20261026205525');
```

Expected for this recovery: table absent, UUID profile primary key, neither migration recorded. If
the table is already present, inspect columns, constraints, grants and policies before deciding
whether the recovery is needed.

## Application after explicit approval

Use the authorized Supabase migration mechanism to apply **only the exact reviewed recovery file**
to the named project, with migration history recorded. Do not paste just its CREATE TABLE section or
manually mark the older migration applied. Capture the resulting history entry and file checksum; a
management tool may allocate its own timestamp, so reconcile the local recovery version through the
supported migration-history workflow before any future bulk push. Do not treat unrelated pending
migrations as approved.

On lock/statement timeout or any SQL error, stop and inspect; the transaction must roll back. Do not
bypass constraints, weaken RLS or retry blindly.

## Verification after application

Inspect metadata before attempting a user flow:

```sql
SELECT relrowsecurity FROM pg_class
WHERE oid = to_regclass('public.onboarding_journeys');
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'onboarding_journeys'
ORDER BY ordinal_position;
SELECT contype, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.onboarding_journeys'::regclass;
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'onboarding_journeys';
SELECT grantee, privilege_type FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name = 'onboarding_journeys'
ORDER BY grantee, privilege_type;
SELECT journey, platform, status, step, updated_at
FROM public.onboarding_journeys LIMIT 0;
```

Expect RLS on; one SELECT policy for authenticated with `auth.uid()` equality; no PUBLIC/anon table
privileges; authenticated SELECT only; service-role access. Check that PostgREST recognizes the
relation and the existing API's GET succeeds. Only with approved test-account access, save progress,
reload, and confirm it from a second signed-in browser/session; confirm another account cannot read
it. No production test rows or real-user progress have been written by this work.

Monitor new logs for recurrence of onboarding-table 404s and failed saves. An empty error window
alone does not prove a save/read flow or cross-device sync.

## Rollback and validation

Before commit, SQL failures roll back automatically. After success, retain the table and user
progress when rolling back application code. Do not drop/truncate it to undo this additive recovery;
any later schema rollback needs separate review and a data-preservation plan.

Local validation commands (isolated loopback PostgreSQL; no app environment):

```sh
npm ci --prefix scripts/db-tests
npm run test:onboarding --prefix scripts/db-tests
npm run test:onboarding --prefix scripts/db-tests -- --legacy-first
cd apps/web
node node_modules/vitest/vitest.mjs run app/api/onboarding/progress/route.test.ts --maxWorkers=2
```

The database checks cover real grants/RLS, cross-user denial, direct write and TRUNCATE denial, API
projection/upsert, independent keys, constraints, profile cascade, replay/data retention, both
migration orders and unchanged existing notice/cohort behavior. The route tests also ensure
missing-table failures are not acknowledged as successful empty reads or saves. CI runs both
database orders. These checks do not certify production persistence before application.
