\set ON_ERROR_STOP on
BEGIN;
-- Synthetic rollback-only verification against the isolated local database.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fd260930-0000-4000-8000-000000000101','export-admin@example.invalid','{}'),
 ('fd260930-0000-4000-8000-000000000102','export-subject@example.invalid','{}');
UPDATE public.profiles SET role='admin' WHERE id='fd260930-0000-4000-8000-000000000101';
INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
 VALUES ('fd260930-0000-4000-8000-000000000103','fd260930-0000-4000-8000-000000000104',
 ARRAY['fd260930-0000-4000-8000-000000000102'::uuid],'{"version":1,"contract":{"title":"Synthetic retained contract"}}');
DELETE FROM public.profiles WHERE id='fd260930-0000-4000-8000-000000000102';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.retained_contract_records WHERE contract_id='fd260930-0000-4000-8000-000000000103'
 AND participant_ids @> ARRAY['fd260930-0000-4000-8000-000000000102'::uuid])<>1 THEN RAISE EXCEPTION 'Closed participant archive unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.retained_contract_records WHERE contract_id='fd260930-0000-4000-8000-000000000103'
 AND participant_ids @> ARRAY['fd260930-0000-4000-8000-000000000105'::uuid]) THEN RAISE EXCEPTION 'Unrelated subject matched'; END IF;
END $$;
INSERT INTO public.gdpr_audit_log(user_id,performed_by,action,table_name,record_id,new_values)
 VALUES(NULL,'fd260930-0000-4000-8000-000000000101','retained_evidence_export_prepared','retained_contract_records',
 'fd260930-0000-4000-8000-000000000103','{"subject_id":"fd260930-0000-4000-8000-000000000102","case_reference":"SYNTHETIC-TEST"}');
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.retained_contract_records;
  RAISE EXCEPTION 'Authenticated client read raw retained archive';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'PASS: closed-subject lookup, unrelated exclusion, audit without deleted-profile FK, raw archive privilege restriction'
