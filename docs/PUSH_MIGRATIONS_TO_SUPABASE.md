# Push All SQL Migrations to Supabase

This guide explains how to push all SQL migration files to your Supabase database.

## Prerequisites

1. **Environment Variables**: Set the following in your `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **exec_sql Function**: The migrations require an `exec_sql` function in your Supabase database.

## Quick Start

### Step 1: Create exec_sql Function (One-time setup)

Run this script to create the required function:

```bash
npx tsx scripts/create-exec-sql-function.ts
```

**OR** manually create it in Supabase Dashboard:

1. Go to: `https://supabase.com/dashboard/project/[your-project]/sql/new`
2. Copy and paste this SQL:

```sql
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;
```

3. Click "Run" to execute

### Step 2: Push All Migrations

Once the `exec_sql` function exists, run:

```bash
npx tsx scripts/push-all-migrations-to-supabase.ts
```

This script will:
- ✅ Check if `exec_sql` function exists
- ✅ Create migrations tracking table if needed
- ✅ Find all pending migrations
- ✅ Apply each migration in order
- ✅ Track applied migrations in the database
- ✅ Provide a summary of results

## What Gets Applied

The script applies all SQL files from `supabase/migrations/` directory in alphabetical order (which corresponds to timestamp order).

## Migration Tracking

Applied migrations are tracked in a `migrations` table with:
- `filename`: Migration file name
- `applied_at`: When it was applied
- `checksum`: SHA256 hash of the SQL content
- `error_message`: Any errors that occurred

## Troubleshooting

### Error: "function exec_sql does not exist"

**Solution**: Create the function first (see Step 1 above)

### Error: "Missing Supabase credentials"

**Solution**: Set environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "Migration failed"

**Solution**: 
1. Check the error message for specific SQL issues
2. Some migrations may have dependencies - ensure previous migrations are applied
3. Check Supabase Dashboard > Logs for detailed error messages

### Manual Migration Application

If automated scripts don't work, you can apply migrations manually:

1. Go to Supabase Dashboard > SQL Editor
2. Open each migration file from `supabase/migrations/`
3. Copy and paste the SQL
4. Click "Run"

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

## Migration Files

All migration files are located in:
```
supabase/migrations/
```

Files are named with timestamps to ensure proper ordering:
```
YYYYMMDDHHMMSS_description.sql
```

## Notes

- ⚠️ **Always backup your database** before applying migrations
- ⚠️ **Test migrations in a development environment first**
- ✅ Migrations are idempotent (safe to run multiple times) when using `CREATE TABLE IF NOT EXISTS`
- ✅ The script tracks applied migrations to avoid duplicates

