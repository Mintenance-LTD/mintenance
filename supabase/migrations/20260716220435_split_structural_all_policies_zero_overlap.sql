-- Cross-role multiple_permissive_policies remediation, part 3: eliminate the structural
-- ALL-vs-broader-read overlaps by access-preserving restructuring:
--   1. Split each overlapping ALL policy into per-command policies
--      (SELECT USING q | INSERT CHECK coalesce(w,q) | UPDATE USING q CHECK coalesce(w,q) | DELETE USING q)
--   2. Merge all policies per (table, command) into one, OR-ing predicates.
--      Permissive policies compose as OR of USING and OR of WITH CHECK independently,
--      so the merge is exactly equivalent. Predicates from {authenticated}-only policies
--      merged into a TO public policy are wrapped in
--      CASE WHEN (select auth.role())='authenticated' THEN (...) ELSE false END
--      so anon gains nothing (CASE guarantees evaluation order).
-- Zero access change, verified live by a before/after snapshot of visible-row counts for
-- 4 personas (anon/admin/contractor/homeowner) x 34 tables: 0 mismatches.
-- Originals backed up to rls_structural_split_backup_20260716.
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716220435); advisor
-- multiple_permissive_policies 179 -> 0. The live run scoped tables via a pre-computed
-- snapshot table; this file inlines the identical scope computation so it is
-- self-contained for fresh/shadow databases (idempotent: zero overlaps => no-op).
DO $$
DECLARE
  tbl record; pol record; c text; src record;
  v_using text; v_check text; tgt_roles text; any_public bool; n int;
  split_cnt int := 0; merged_cnt int := 0; remaining int;
BEGIN
  CREATE TEMP TABLE tmp_split_scope ON COMMIT DROP AS
  WITH pol AS (
    SELECT tablename, policyname, roles::text[] AS roles, cmd
    FROM pg_policies WHERE schemaname='public' AND permissive='PERMISSIVE'
  ),
  expanded AS (
    SELECT DISTINCT p.tablename, p.policyname, r.role, a.action
    FROM pol p
    CROSS JOIN LATERAL (SELECT unnest(CASE WHEN p.roles @> ARRAY['public'] THEN ARRAY['anon','authenticated','authenticator','dashboard_user'] ELSE p.roles END) AS role) r
    CROSS JOIN LATERAL (SELECT unnest(CASE WHEN p.cmd='ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[p.cmd] END) AS action) a
  )
  SELECT DISTINCT tablename FROM (
    SELECT tablename, role, action FROM expanded GROUP BY 1,2,3 HAVING count(*) > 1
  ) g;

  IF NOT EXISTS (SELECT 1 FROM tmp_split_scope) THEN
    RAISE NOTICE 'No permissive overlaps found — nothing to do';
    RETURN;
  END IF;

  IF to_regclass('public.rls_structural_split_backup_20260716') IS NULL THEN
    CREATE TABLE public.rls_structural_split_backup_20260716 AS
    SELECT now() AS backed_up_at, pl.*
    FROM pg_policies pl JOIN tmp_split_scope s ON s.tablename = pl.tablename
    WHERE pl.schemaname='public';
    ALTER TABLE public.rls_structural_split_backup_20260716 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.rls_structural_split_backup_20260716 FROM anon, authenticated;
  END IF;

  FOR tbl IN SELECT tablename FROM tmp_split_scope ORDER BY tablename
  LOOP
    -- step 1: split ALL policies into per-command policies
    FOR pol IN
      SELECT * FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl.tablename AND permissive='PERMISSIVE'
        AND cmd='ALL' AND roles::text[] IN ('{public}'::text[], '{authenticated}'::text[])
    LOOP
      IF pol.qual IS NULL THEN
        RAISE EXCEPTION 'ALL policy %.% has NULL qual — unexpected, aborting', pol.tablename, pol.policyname;
      END IF;
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)',
        left(pol.policyname,47)||'_select', pol.tablename, pol.roles[1], pol.qual);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO %s WITH CHECK (%s)',
        left(pol.policyname,47)||'_insert', pol.tablename, pol.roles[1], coalesce(pol.with_check, pol.qual));
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        left(pol.policyname,47)||'_update', pol.tablename, pol.roles[1], pol.qual, coalesce(pol.with_check, pol.qual));
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO %s USING (%s)',
        left(pol.policyname,47)||'_delete', pol.tablename, pol.roles[1], pol.qual);
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
      split_cnt := split_cnt + 1;
    END LOOP;

    -- step 2: merge per command
    FOREACH c IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE']
    LOOP
      SELECT count(*), bool_or(roles::text[] = '{public}'::text[]) INTO n, any_public
      FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl.tablename AND permissive='PERMISSIVE'
        AND cmd=c AND roles::text[] IN ('{public}'::text[], '{authenticated}'::text[]);
      IF n > 1 THEN
        tgt_roles := CASE WHEN any_public THEN 'public' ELSE 'authenticated' END;
        v_using := NULL; v_check := NULL;
        FOR src IN
          SELECT * FROM pg_policies
          WHERE schemaname='public' AND tablename=tbl.tablename AND permissive='PERMISSIVE'
            AND cmd=c AND roles::text[] IN ('{public}'::text[], '{authenticated}'::text[])
          ORDER BY policyname
        LOOP
          IF c IN ('SELECT','UPDATE','DELETE') THEN
            v_using := concat_ws(' OR ', v_using,
              CASE WHEN any_public AND src.roles::text[] = '{authenticated}'::text[]
                THEN format('(CASE WHEN (select auth.role()) = ''authenticated'' THEN (%s) ELSE false END)', src.qual)
                ELSE format('(%s)', src.qual) END);
          END IF;
          IF c IN ('INSERT','UPDATE') THEN
            v_check := concat_ws(' OR ', v_check,
              CASE WHEN any_public AND src.roles::text[] = '{authenticated}'::text[]
                THEN format('(CASE WHEN (select auth.role()) = ''authenticated'' THEN (%s) ELSE false END)', coalesce(src.with_check, src.qual))
                ELSE format('(%s)', coalesce(src.with_check, src.qual)) END);
          END IF;
          EXECUTE format('DROP POLICY %I ON public.%I', src.policyname, src.tablename);
        END LOOP;
        IF c = 'SELECT' OR c = 'DELETE' THEN
          EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)',
            lower(c)||'_consolidated', tbl.tablename, c, tgt_roles, v_using);
        ELSIF c = 'INSERT' THEN
          EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO %s WITH CHECK (%s)',
            lower(c)||'_consolidated', tbl.tablename, tgt_roles, v_check);
        ELSE
          EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
            lower(c)||'_consolidated', tbl.tablename, tgt_roles, v_using, v_check);
        END IF;
        merged_cnt := merged_cnt + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- hard guard: zero remaining permissive overlaps for anon/authenticated across ALL tables
  WITH pol AS (
    SELECT tablename, policyname, roles::text[] AS roles, cmd
    FROM pg_policies WHERE schemaname='public' AND permissive='PERMISSIVE'
  ),
  expanded AS (
    SELECT DISTINCT p.tablename, p.policyname, r.role, a.action
    FROM pol p
    CROSS JOIN LATERAL (SELECT unnest(CASE WHEN p.roles @> ARRAY['public'] THEN ARRAY['anon','authenticated','authenticator','dashboard_user'] ELSE p.roles END) AS role) r
    CROSS JOIN LATERAL (SELECT unnest(CASE WHEN p.cmd='ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[p.cmd] END) AS action) a
  )
  SELECT count(*) INTO remaining FROM (
    SELECT tablename, role, action FROM expanded GROUP BY 1,2,3 HAVING count(*) > 1
  ) g;
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'Guard: % overlap groups remain after restructuring — rolling back', remaining;
  END IF;
  RAISE NOTICE 'Split % ALL policies, created % merged policies, overlaps now 0', split_cnt, merged_cnt;
END $$;
