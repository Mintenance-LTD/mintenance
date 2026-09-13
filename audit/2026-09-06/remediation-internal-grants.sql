\set ON_ERROR_STOP on
BEGIN;
DO $$ DECLARE routine record; relation record; role_name text; BEGIN
 FOR routine IN SELECT p.oid,p.oid::regprocedure AS identity FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef
 AND p.prorettype <> 'trigger'::regtype
 AND p.proname NOT IN ('has_org_management_access','is_active_group_member','is_admin',
 'is_company_admin','is_group_admin','is_org_member','is_job_participant')
 AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
 LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(role_name,routine.oid,'EXECUTE') THEN
    RAISE EXCEPTION '% can execute %',role_name,routine.identity; END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',routine.oid,'EXECUTE') THEN
   RAISE EXCEPTION 'Service lost access to %',routine.identity; END IF;
 END LOOP;
 FOR relation IN SELECT c.oid,c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='m' LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(role_name,relation.oid,'SELECT') OR has_any_column_privilege(role_name,relation.oid,'SELECT') THEN
    RAISE EXCEPTION '% can read %',role_name,relation.relname; END IF;
  END LOOP;
 END LOOP;
 RAISE NOTICE 'PASS: effective grants deny client execution of internal routines and analytics reads; service execution retained';
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.disable_user_mfa('fa130906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Anonymous MFA mutation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.export_user_data('fa130906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Anonymous data export allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM * FROM public.mv_user_activity LIMIT 1;
  RAISE EXCEPTION 'Anonymous analytics access allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.disable_user_mfa('fa130906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Authenticated MFA mutation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.release_escrow_funds('fa130906-0000-4000-8000-000000000030','Synthetic');
  RAISE EXCEPTION 'Direct escrow release allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 -- Invoker-side RLS predicate remains executable.
 PERFORM public.is_admin();
END $$;
RESET ROLE;
ROLLBACK;
