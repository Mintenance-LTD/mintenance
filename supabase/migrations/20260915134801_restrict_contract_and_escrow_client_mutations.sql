-- Both clients already use authorized server routes for these mutations.
-- The existing contract freeze trigger only protects an already-signed row;
-- it cannot authorize the first signature or prevent deletion of evidence.
REVOKE UPDATE, DELETE ON public.contracts, public.escrow_transactions FROM PUBLIC, anon, authenticated;
DO $$
DECLARE relation_name text; columns_sql text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['contracts','escrow_transactions'] LOOP
  SELECT string_agg(quote_ident(attname),', ' ORDER BY attnum) INTO columns_sql
  FROM pg_attribute WHERE attrelid=format('public.%I',relation_name)::regclass
   AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE UPDATE (%s) ON public.%I FROM PUBLIC, anon, authenticated',columns_sql,relation_name);
 END LOOP;
END $$;
GRANT UPDATE, DELETE ON public.contracts, public.escrow_transactions TO service_role;
