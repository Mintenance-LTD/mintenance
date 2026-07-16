-- Audit (DB scale): wrap per-row auth.*() calls in RLS policies with a scalar
-- subquery so Postgres evaluates them ONCE per query (initPlan) instead of once
-- per row. Semantics are identical — (select auth.uid()) returns the same value
-- as auth.uid(). Supabase-recommended fix for the auth_rls_initplan lint and the
-- single biggest RLS scaling win. Transactional: any failure rolls back all.
-- Applied via Supabase MCP on ukrjudtlvapiajkjbcrd on 2026-07-16; verified after:
-- auth_rls_initplan 644 -> 0, all 825 policies intact (none dropped).
DO $$
DECLARE
  r RECORD;
  stmt text;
  has_change boolean;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I', r.polname, r.tbl);
    has_change := false;

    -- Only rewrite an expression that has a BARE auth.*() call and is not
    -- already wrapped anywhere (avoids double-wrapping partially-wrapped exprs).
    IF r.using_expr IS NOT NULL
       AND r.using_expr ~ 'auth\.(uid|role|jwt|email)\(\)'
       AND r.using_expr !~ 'select auth\.' THEN
      stmt := stmt || format(' USING (%s)',
        regexp_replace(r.using_expr, 'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g'));
      has_change := true;
    END IF;

    IF r.check_expr IS NOT NULL
       AND r.check_expr ~ 'auth\.(uid|role|jwt|email)\(\)'
       AND r.check_expr !~ 'select auth\.' THEN
      stmt := stmt || format(' WITH CHECK (%s)',
        regexp_replace(r.check_expr, 'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g'));
      has_change := true;
    END IF;

    IF has_change THEN
      EXECUTE stmt;
    END IF;
  END LOOP;
END $$;
