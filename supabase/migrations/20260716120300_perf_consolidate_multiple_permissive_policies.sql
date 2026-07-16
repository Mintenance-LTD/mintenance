-- Audit (DB scale, D3): consolidate multiple PERMISSIVE policies on the same
-- table + command + EXACT role-set into a single policy whose USING/WITH CHECK
-- is the OR of the members. Postgres already OR's permissive policies, so this
-- is provably access-preserving — it just stops re-evaluating N separate
-- policies per row. One transaction (auto-rollback on any error). Originals are
-- snapshotted to rls_consolidation_backup_20260716 for manual rollback (safe to
-- DROP that table once the change is confirmed in production).
--
-- Applied via Supabase MCP on ukrjudtlvapiajkjbcrd on 2026-07-16. Verified:
--   * overlapping exact-role groups 74 -> 0
--   * total policies 825 -> 741 (158 members replaced by 74 merged)
--   * RLS still enabled on all affected tables; jobs SELECT 3 -> 1
--   * advisor multiple_permissive_policies 984 -> 648
--
-- SCOPE NOTE: the remaining ~648 advisor findings are CROSS-role overlaps
-- (a {public} policy and an {authenticated} policy both apply to authenticated
-- users, since authenticated is a subset of public). Those are NOT handled here
-- — merging them requires per-policy analysis (moving an {authenticated} policy
-- to {public} only preserves access when its predicate self-restricts anon,
-- e.g. `(select auth.uid()) = col` is null->false for anon). Left as a
-- separate, carefully-reviewed pass.

CREATE TABLE IF NOT EXISTS public.rls_consolidation_backup_20260716 (
  id serial PRIMARY KEY,
  tablename text, policyname text, cmd text, roles text,
  qual text, with_check text, backed_up_at timestamptz DEFAULT now()
);

INSERT INTO public.rls_consolidation_backup_20260716(tablename,policyname,cmd,roles,qual,with_check)
SELECT p.tablename, p.policyname, p.cmd, p.roles::text, p.qual, p.with_check
FROM pg_policies p
JOIN (
  SELECT tablename, cmd, roles::text AS roles_txt
  FROM pg_policies
  WHERE schemaname='public' AND permissive='PERMISSIVE'
  GROUP BY tablename, cmd, roles::text
  HAVING count(*) > 1
) g ON g.tablename=p.tablename AND g.cmd=p.cmd AND g.roles_txt=p.roles::text
WHERE p.schemaname='public' AND p.permissive='PERMISSIVE';

DO $$
DECLARE
  g RECORD; p RECORD;
  merged_using text; merged_check text; new_name text; role_list text; create_stmt text;
BEGIN
  FOR g IN
    SELECT DISTINCT tablename, cmd, roles
    FROM public.rls_consolidation_backup_20260716
  LOOP
    merged_using := NULL;
    merged_check := NULL;

    FOR p IN
      SELECT policyname, qual, with_check
      FROM public.rls_consolidation_backup_20260716
      WHERE tablename=g.tablename AND cmd=g.cmd AND roles=g.roles
      ORDER BY policyname
    LOOP
      IF p.qual IS NOT NULL THEN
        merged_using := CASE WHEN merged_using IS NULL
          THEN '('||p.qual||')' ELSE merged_using||' OR ('||p.qual||')' END;
      END IF;
      IF p.with_check IS NOT NULL THEN
        merged_check := CASE WHEN merged_check IS NULL
          THEN '('||p.with_check||')' ELSE merged_check||' OR ('||p.with_check||')' END;
      END IF;
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, g.tablename);
    END LOOP;

    role_list := replace(replace(g.roles, '{', ''), '}', '');
    new_name := left('rls_merged_'||lower(g.cmd)||'_'||md5(g.roles), 63);
    create_stmt := format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO %s',
                          new_name, g.tablename, g.cmd, role_list);
    IF merged_using IS NOT NULL THEN
      create_stmt := create_stmt || ' USING ('||merged_using||')';
    END IF;
    IF merged_check IS NOT NULL THEN
      create_stmt := create_stmt || ' WITH CHECK ('||merged_check||')';
    END IF;
    EXECUTE create_stmt;
  END LOOP;
END $$;
