-- Contracts and funding records are created by authorized server routes.
-- Row ownership alone must never authorize manufacturing payment/signature state.
REVOKE INSERT ON public.contracts, public.escrow_transactions FROM PUBLIC, anon, authenticated;
DO $$
DECLARE relation_name text; column_list text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['contracts', 'escrow_transactions'] LOOP
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
      INTO column_list FROM pg_attribute
     WHERE attrelid = format('public.%I', relation_name)::regclass
       AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE INSERT (%s) ON public.%I FROM PUBLIC, anon, authenticated', column_list, relation_name);
  END LOOP;
END $$;
GRANT INSERT ON public.contracts, public.escrow_transactions TO service_role;
