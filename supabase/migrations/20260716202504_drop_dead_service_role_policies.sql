-- Drop RLS policies that are provably dead weight:
--  (a) policies TO service_role: service_role has rolbypassrls=true, so these are never evaluated
--  (b) policies TO public whose entire predicate is auth.role()/auth.jwt()->>'role' = 'service_role':
--      false for anon/authenticated, unnecessary for service_role (bypasses RLS)
-- Zero access change. Originals backed up to rls_dead_sr_policy_backup_20260716.
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716202504); dropped 168 policies,
-- advisor multiple_permissive_policies 648 -> 416.
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  CREATE TABLE public.rls_dead_sr_policy_backup_20260716 AS
  WITH patterns(p) AS (
    SELECT ARRAY[
      '(( SELECT auth.role() AS role) = ''service_role''::text)',
      '((( SELECT auth.jwt() AS jwt) ->> ''role''::text) = ''service_role''::text)',
      '(auth.role() = ''service_role''::text)',
      '((auth.jwt() ->> ''role''::text) = ''service_role''::text)'
    ]
  )
  SELECT now() AS backed_up_at, pl.*
  FROM pg_policies pl CROSS JOIN patterns pt
  WHERE pl.schemaname = 'public' AND pl.permissive = 'PERMISSIVE'
    AND (
      pl.roles = '{service_role}'::name[]
      OR (
        pl.roles = '{public}'::name[]
        AND coalesce(pl.qual, pl.with_check) IS NOT NULL
        AND (pl.qual IS NULL OR pl.qual = ANY(pt.p))
        AND (pl.with_check IS NULL OR pl.with_check = ANY(pt.p))
      )
    );

  ALTER TABLE public.rls_dead_sr_policy_backup_20260716 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.rls_dead_sr_policy_backup_20260716 FROM anon, authenticated;

  FOR r IN SELECT tablename, policyname FROM public.rls_dead_sr_policy_backup_20260716
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    n := n + 1;
  END LOOP;

  IF n <> 168 THEN
    RAISE EXCEPTION 'Safety guard: expected exactly 168 dead policies, found % — aborting', n;
  END IF;
  RAISE NOTICE 'Dropped % dead service_role policies', n;
END $$;
