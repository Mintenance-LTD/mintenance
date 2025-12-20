# SQL Migration Scripts

Scripts to push all SQL migrations to Supabase.

## Quick Start

```bash
# Setup exec_sql function (one-time)
npm run migrate:setup

# Push all pending migrations
npm run migrate:push

# Or do both in one command
npm run migrate:all
```

## Scripts

### `create-exec-sql-function.ts`
Creates the `exec_sql` RPC function required for running migrations.

**Usage:**
```bash
npx tsx scripts/create-exec-sql-function.ts
# or
npm run migrate:setup
```

### `push-all-migrations-to-supabase.ts`
Pushes all pending SQL migrations to Supabase.

**Usage:**
```bash
npx tsx scripts/push-all-migrations-to-supabase.ts
# or
npm run migrate:push
```

**What it does:**
1. Checks if `exec_sql` function exists
2. Creates migrations tracking table
3. Finds all pending migrations from `supabase/migrations/`
4. Applies each migration in order
5. Tracks applied migrations
6. Provides summary report

## Requirements

Set these environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migration Files

All migration files should be in:
```
supabase/migrations/
```

Files are applied in alphabetical order (timestamp order).

## Troubleshooting

See `docs/PUSH_MIGRATIONS_TO_SUPABASE.md` for detailed troubleshooting guide.

