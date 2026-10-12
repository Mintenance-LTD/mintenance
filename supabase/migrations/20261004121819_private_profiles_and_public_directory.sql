BEGIN;

-- Private account rows are visible only to their owner or an administrator.
-- Column grants alone cannot protect contact details while SELECT RLS allows
-- every active profile. Keep existing owner column grants unchanged.
ALTER POLICY profiles_select ON public.profiles
  USING (id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

-- This non-login view owner has no bypass-RLS privilege, no private contact
-- column grants, no write privileges and no membership granted to API roles.
-- A security-invoker view cannot implement a cross-user directory over the
-- owner-only table. Instead this deliberately narrow owner enforces its own
-- RLS policy, and the security barrier prevents predicate pushdown leaks.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'profile_directory_reader') THEN
    CREATE ROLE profile_directory_reader NOLOGIN NOSUPERUSER NOCREATEDB
      NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
GRANT profile_directory_reader TO postgres;
GRANT USAGE ON SCHEMA public TO profile_directory_reader;
GRANT SELECT (
  id, role, first_name, last_name, bio, city, country, profile_image_url,
  avatar_url, rating, total_jobs_completed, verified, admin_verified, skills,
  is_available, company_name, hourly_rate, years_experience, portfolio_images,
  created_at, deleted_at, latitude, longitude
) ON public.profiles TO profile_directory_reader;
CREATE POLICY profiles_directory_read ON public.profiles
  FOR SELECT TO profile_directory_reader USING (deleted_at IS NULL);

CREATE VIEW public.profile_directory WITH (security_barrier = true) AS
SELECT id, role, first_name, last_name, bio, city, country, profile_image_url,
  avatar_url, rating, total_jobs_completed, verified, admin_verified, skills,
  is_available, company_name, hourly_rate, years_experience, portfolio_images,
  created_at,
  -- Discovery needs an approximate area, never a contractor's exact location.
  CASE WHEN role = 'contractor' THEN round(latitude, 1) END AS latitude,
  CASE WHEN role = 'contractor' THEN round(longitude, 1) END AS longitude
FROM public.profiles WHERE deleted_at IS NULL;
GRANT CREATE ON SCHEMA public TO profile_directory_reader;
ALTER VIEW public.profile_directory OWNER TO profile_directory_reader;
REVOKE CREATE ON SCHEMA public FROM profile_directory_reader;
REVOKE ALL ON public.profile_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profile_directory TO authenticated, service_role;
COMMENT ON VIEW public.profile_directory IS
  'Read-only directory; excludes contact, address, preferences and precise location. Owner is a restricted non-login RLS role, not postgres.';

ALTER TABLE public.contractor_payout_credit_events ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
COMMIT;
