-- Audit (DB scale): add a covering index for every public-schema foreign key
-- that lacks one (134 at time of writing). Unindexed FKs force sequential scans
-- on the child table for parent updates/deletes and for join/filter-by-FK reads
-- — invisible at demo scale, a wall at 100k+ rows. Additive and reversible.
-- Applied via Supabase MCP on project ukrjudtlvapiajkjbcrd on 2026-07-16;
-- verified 0 unindexed FKs remaining afterward.
DO $$
DECLARE
  r RECORD;
  idxname text;
BEGIN
  FOR r IN
    SELECT c.conrelid,
           regexp_replace(c.conrelid::regclass::text, '^.*\.', '') AS tbl,
           (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY x.ord)
              FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum) AS cols,
           (SELECT string_agg(a.attname, '_' ORDER BY x.ord)
              FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum) AS colnames
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.connamespace = 'public'::regnamespace
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
      )
  LOOP
    idxname := left('idx_' || r.tbl || '_' || r.colnames, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', idxname, r.tbl, r.cols);
  END LOOP;
END $$;
