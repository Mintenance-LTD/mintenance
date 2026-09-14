-- Application RPC callers use the privileged server client. Direct web/mobile
-- clients need only the policy predicates below. Trigger functions execute via
-- their triggers, and extension-owned routines are outside this application ACL.
-- Check pg_depend plus policy expressions when adding a client-callable helper.
DO $$ DECLARE routine record; relation record; column_row record; BEGIN
 FOR routine IN
  SELECT p.oid::regprocedure AS identity FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
    AND p.proname NOT IN ('has_org_management_access','is_active_group_member',
      'is_admin','is_company_admin','is_group_admin','is_org_member','is_job_participant')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass
      AND d.objid=p.oid AND d.deptype='e')
 LOOP
  EXECUTE format('REVOKE ALL ON ROUTINE %s FROM PUBLIC, anon, authenticated',routine.identity);
  EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO service_role',routine.identity);
 END LOOP;

 -- Materialized results cannot enforce the source tables' row policies.
 -- No active client queries these views; analytics use server routes/RPCs.
 FOR relation IN SELECT c.oid,c.relname FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='m'
 LOOP
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',relation.relname);
  FOR column_row IN SELECT attname FROM pg_attribute
   WHERE attrelid=relation.oid AND attnum>0 AND NOT attisdropped
  LOOP
   EXECUTE format('REVOKE SELECT (%I) ON public.%I FROM PUBLIC, anon, authenticated',column_row.attname,relation.relname);
  END LOOP;
  EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role',relation.relname);
 END LOOP;
END $$;
