-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- The user_notification_preferences table was created in migration 20260215000001
-- but never consumed by any application code. All notification preferences
-- are read/written via the profiles.notification_preferences JSONB column.
-- The table has 0 rows. Dropping to eliminate schema confusion.
DROP TABLE IF EXISTS public.user_notification_preferences;
