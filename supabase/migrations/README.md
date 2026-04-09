# Supabase Migrations

## Numbering Scheme

Migrations use two naming conventions:

### Sequential (legacy core tables)

```
001_core_tables.sql        — profiles, companies, addresses
002_admin_system.sql       — admin roles, audit logs
003_payment_system.sql     — payments, escrow, payment_methods
...
009_missing_core_tables.sql — messages, disputes, message_threads
```

### Date-based (features and fixes)

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260408000005_security_audit_fixes.sql`

## Execution Order

Supabase CLI runs migrations in **alphabetical order** by filename. Sequential prefixes
(`001_`-`009_`) sort before date-based prefixes (`2025...`, `2026...`), so core tables are always
created first.

## Conventions

- One concern per migration (single feature, fix, or schema change)
- Idempotent when possible (`CREATE TABLE IF NOT EXISTS`, `DO $$ ... $$`)
- RLS policies created in the same migration as their table
- Indexes created after table definition
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` to allow re-runs

## Current Count

~282 active migrations as of April 2026.

## Backup Directories

- `migrations_backup/` — pre-consolidation snapshots (safe to ignore)
- `migrations_old_temp/` — temporary staging during cleanup (safe to ignore)
