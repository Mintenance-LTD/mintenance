#!/usr/bin/env bash
#
# Rebaseline the LOCAL Supabase database to match PRODUCTION's schema so the
# real-DB integration tests (apps/web/__tests__/integration-real/**) can run.
#
# WHY THIS EXISTS
#   `supabase db reset` cannot reproduce prod locally: the repo's migration
#   history is incomplete — column/table-adding migrations were squashed out
#   over time (e.g. prod `public.jobs` has 48 columns incl. contractor_id, but
#   no migration in the repo ever creates that column; likewise the original
#   CREATE for contractor_locations and public.users are gone). Replaying the
#   chain therefore fails partway through. Instead of reconstructing dozens of
#   lost columns by hand, this script loads prod's ACTUAL schema straight into
#   the local database.
#
# IMPORTANT: this does NOT modify supabase/migrations/. Production CD (which
#   pushes those migration files) is completely unaffected. It only reshapes the
#   local dev database. Re-runnable and idempotent.
#
# PREREQUISITES
#   - Docker running and `supabase start` already done (local stack up).
#   - Project linked to prod (supabase link) — the dump uses the linked creds.
#   - Run from anywhere in the repo (paths are resolved from this file).
#
# USAGE
#   bash apps/web/scripts/rebaseline-local-from-prod.sh
#   cd apps/web && npm run test:integration   # then run the integration tests
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

DUMP="$(mktemp -t prod_baseline.XXXXXX).sql"
trap 'rm -f "$DUMP"' EXIT

CONTAINER="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
if [ -z "$CONTAINER" ]; then
  echo "ERROR: local Supabase DB container not found. Run 'supabase start' first." >&2
  exit 1
fi
PSQL="docker exec -i $CONTAINER psql -v ON_ERROR_STOP=1 -U postgres -d postgres"

echo "1/5  Dumping prod 'public' schema from the linked project..."
npx supabase db dump --linked --schema public -f "$DUMP"
echo "     dumped $(wc -l < "$DUMP") lines"

echo "2/5  Resetting local 'public' schema (recreating required extensions)..."
$PSQL <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO pg_database_owner;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- The schema-only dump assumes its extensions already exist. Recreate the ones
-- prod uses, in the same schemas prod puts them (postgis/vector in public;
-- pg_trgm/pgcrypto/uuid-ossp in `extensions`, which the dump references as e.g.
-- `extensions.gin_trgm_ops`).
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
SQL

echo "3/5  Loading prod schema into the local database..."
$PSQL < "$DUMP"

echo "4/5  Recreating the auth->profiles trigger (a public-only dump omits auth-schema triggers)..."
$PSQL <<'SQL'
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
SQL

echo "5/5  Reloading the PostgREST schema cache..."
$PSQL -c "NOTIFY pgrst, 'reload schema';" || true

echo ""
echo "Done — local DB now matches prod's public schema."
echo "Run the integration tests with:  cd apps/web && npm run test:integration"
