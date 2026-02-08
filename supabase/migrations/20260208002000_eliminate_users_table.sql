-- ============================================================
-- ELIMINATE public.users TABLE - Consolidate to profiles only
-- Applied to remote Supabase on 2026-02-08
--
-- PROBLEM: Dual users/profiles tables caused confusion:
--   - profiles: 37 columns, all app code queries this table
--   - users: 59 columns, 156 FK constraints referenced it
--   - Both had identical 5 rows, sync trigger kept them in sync
--   - Code queried profiles, but FKs/RLS/functions referenced users
--
-- SOLUTION: Migrate everything to profiles, drop users
-- ============================================================

-- Step 1: Migrate all 156 FK constraints from users to profiles
-- (Generated dynamically - each table's FK was dropped and recreated)
-- Example pattern for each constraint:
--   ALTER TABLE public.{table} DROP CONSTRAINT {fk_name};
--   ALTER TABLE public.{table} ADD CONSTRAINT {fk_name}
--     FOREIGN KEY ({column}) REFERENCES public.profiles(id) ON DELETE {action};

-- Step 2: Drop the profiles-to-users sync trigger
DROP TRIGGER IF EXISTS sync_profiles_to_users ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_to_users();

-- Step 3: Update handle_new_user to only write to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'homeowner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop 3 materialized views that depend on users
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_activity CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_performance_analytics CASCADE;

-- Step 5: Update 138 RLS policies (FROM users → FROM profiles)
-- Done via PL/pgSQL DO block that iterated pg_policies and replaced
-- all references to 'users' with 'profiles' in USING/WITH CHECK clauses

-- Step 6: Drop the users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 7: Update 17 database functions that referenced public.users
-- Done via PL/pgSQL DO block using pg_get_functiondef() + REPLACE

-- Step 8: Recreate materialized views pointing to profiles
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats AS
SELECT 'active_jobs'::text AS metric, count(*) AS value, CURRENT_DATE AS date
FROM jobs WHERE (jobs.status = ANY (ARRAY['posted'::text, 'assigned'::text, 'in_progress'::text]))
UNION ALL
SELECT 'completed_jobs'::text, count(*), CURRENT_DATE
FROM jobs WHERE status = 'completed' AND created_at >= CURRENT_DATE - '30 days'::interval
UNION ALL
SELECT 'active_contractors'::text, count(*), CURRENT_DATE
FROM profiles WHERE role = 'contractor' AND is_available = true
UNION ALL
SELECT 'total_revenue'::text, COALESCE(sum(amount), 0), CURRENT_DATE
FROM escrow_transactions WHERE status = 'completed' AND created_at >= CURRENT_DATE - '30 days'::interval;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_activity AS
SELECT u.id AS user_id, u.role, u.is_available,
  count(DISTINCT j.id) AS total_jobs,
  count(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) AS completed_jobs,
  count(DISTINCT b.id) AS total_bids,
  count(DISTINCT CASE WHEN b.status = 'accepted' THEN b.id END) AS accepted_bids,
  avg(r.rating) AS avg_rating,
  count(DISTINCT r.id) AS total_reviews,
  max(j.created_at) AS last_job_activity,
  max(b.created_at) AS last_bid_activity
FROM profiles u
LEFT JOIN jobs j ON u.id = j.homeowner_id
LEFT JOIN bids b ON u.id = b.contractor_id
LEFT JOIN reviews r ON u.id = r.reviewed_id
WHERE u.created_at >= CURRENT_DATE - '90 days'::interval
GROUP BY u.id, u.role, u.is_available;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_performance_analytics AS
SELECT u.id, (u.first_name || ' ' || u.last_name) AS full_name,
  u.rating, u.total_jobs_completed,
  count(CASE WHEN j.status = 'completed' AND j.completed_at >= now() - '30 days'::interval THEN 1 END) AS jobs_last_30_days,
  avg(CASE WHEN j.status = 'completed' AND j.completed_at >= now() - '30 days'::interval THEN r.rating END) AS rating_last_30_days,
  COALESCE(sum(CASE WHEN et.status = 'completed' AND et.created_at >= now() - '30 days'::interval THEN et.amount END), 0) AS revenue_last_30_days
FROM profiles u
LEFT JOIN jobs j ON u.id = j.contractor_id
LEFT JOIN reviews r ON j.id = r.job_id
LEFT JOIN escrow_transactions et ON u.id = et.payee_id
WHERE u.role = 'contractor' AND u.is_available = true
GROUP BY u.id, u.first_name, u.last_name, u.rating, u.total_jobs_completed;
