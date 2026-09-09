\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  signature text;
  client_role text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.delete_user_data(uuid)',
    'public.accept_bid_atomic(uuid,uuid,uuid,uuid)',
    'public.try_claim_idempotency_key(text,text,uuid,jsonb,integer)',
    'public.try_claim_idempotency_key(text,text,uuid,jsonb,integer,integer)',
    'public.increment_contractor_contribution_stats(uuid,integer,numeric)',
    'public.claim_contractor_contribution_milestone(uuid)'
  ] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(client_role, signature, 'EXECUTE') THEN
        RAISE EXCEPTION 'Unexpected RPC access: % %', client_role, signature;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Service RPC access missing: %', signature;
    END IF;
  END LOOP;
END $$;
CREATE TABLE public.remediation_acl_probe (id integer);
CREATE FUNCTION public.remediation_acl_probe_fn() RETURNS integer LANGUAGE sql AS 'SELECT 1';
DO $$
DECLARE client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(client_role, 'public.remediation_acl_probe', 'SELECT')
       OR has_table_privilege(client_role, 'public.remediation_acl_probe', 'INSERT')
       OR has_function_privilege(client_role, 'public.remediation_acl_probe_fn()', 'EXECUTE') THEN
      RAISE EXCEPTION 'Unsafe default grants for %', client_role;
    END IF;
  END LOOP;
END $$;
ROLLBACK;
