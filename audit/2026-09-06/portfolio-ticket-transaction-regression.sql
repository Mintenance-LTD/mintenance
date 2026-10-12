-- Run only against the isolated local audit database. All fixtures roll back.
BEGIN;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000009301','portfolio-fixture@example.invalid');
INSERT INTO public.profiles(id,email,role) VALUES ('00000000-0000-4000-8000-000000009301','portfolio-fixture@example.invalid','homeowner') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organizations(id,name,created_by) VALUES ('00000000-0000-4000-8000-000000009302','Synthetic portfolio','00000000-0000-4000-8000-000000009301');
INSERT INTO public.organization_memberships(org_id,user_id,org_role,status) VALUES ('00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000009301','manager','active');
INSERT INTO public.properties(id,owner_id,org_id,property_name,address,property_type) VALUES ('00000000-0000-4000-8000-000000009303','00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009302','Synthetic home','Synthetic address','residential');
INSERT INTO public.maintenance_tickets(id,org_id,property_id,reported_by,title,description,category) VALUES ('00000000-0000-4000-8000-000000009304','00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000009303','00000000-0000-4000-8000-000000009301','Synthetic repair','Synthetic repair description','general');
DO $$
DECLARE v_ticket uuid := '00000000-0000-4000-8000-000000009304'; v_actor uuid := '00000000-0000-4000-8000-000000009301'; v_time timestamptz;
BEGIN
  PERFORM public.update_portfolio_ticket(v_ticket,v_actor,'{"status":"resolved"}');
  SELECT resolved_at INTO v_time FROM public.maintenance_tickets WHERE id=v_ticket;
  IF v_time IS NULL THEN RAISE EXCEPTION 'Resolution timestamp missing'; END IF;
  PERFORM public.update_portfolio_ticket(v_ticket,v_actor,'{"status":"closed"}');
  IF (SELECT resolved_at FROM public.maintenance_tickets WHERE id=v_ticket) <> v_time THEN RAISE EXCEPTION 'Resolution changed on close'; END IF;
  PERFORM public.update_portfolio_ticket(v_ticket,v_actor,'{"status":"open"}');
  IF (SELECT resolved_at FROM public.maintenance_tickets WHERE id=v_ticket) IS NOT NULL THEN RAISE EXCEPTION 'Reopening retained resolution'; END IF;
  IF (SELECT count(*) FROM public.ticket_updates WHERE ticket_id=v_ticket) <> 3 THEN RAISE EXCEPTION 'History incomplete'; END IF;
  IF has_function_privilege('authenticated','public.update_portfolio_ticket(uuid,uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Function publicly callable'; END IF;
END $$;
CREATE FUNCTION pg_temp.reject_test_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic history failure'; END $$;
CREATE TRIGGER synthetic_history_failure BEFORE INSERT ON public.ticket_updates FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_history();
DO $$
BEGIN
  BEGIN
    PERFORM public.update_portfolio_ticket('00000000-0000-4000-8000-000000009304','00000000-0000-4000-8000-000000009301','{"status":"closed"}');
    RAISE EXCEPTION 'Expected history failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'synthetic history failure' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.maintenance_tickets WHERE id='00000000-0000-4000-8000-000000009304') <> 'open' THEN RAISE EXCEPTION 'Partial ticket update survived'; END IF;
END $$;
DROP TRIGGER synthetic_history_failure ON public.ticket_updates;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000009305','other-portfolio-fixture@example.invalid');
INSERT INTO public.profiles(id,email,role) VALUES ('00000000-0000-4000-8000-000000009305','other-portfolio-fixture@example.invalid','homeowner') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.maintenance_tickets(id,org_id,property_id,reported_by,title,description,category) VALUES ('00000000-0000-4000-8000-000000009306','00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000009303','00000000-0000-4000-8000-000000009305','Other repair','Other synthetic description','general');
INSERT INTO public.ticket_updates(ticket_id,author_id,update_type,body,visibility) VALUES ('00000000-0000-4000-8000-000000009304','00000000-0000-4000-8000-000000009301','comment','Public update','tenant_visible');
UPDATE public.organization_memberships SET org_role='tenant' WHERE user_id='00000000-0000-4000-8000-000000009301';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009301',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.maintenance_tickets WHERE id='00000000-0000-4000-8000-000000009306') THEN RAISE EXCEPTION 'Tenant can read another reporter ticket'; END IF;
  IF (SELECT count(*) FROM public.ticket_updates WHERE ticket_id='00000000-0000-4000-8000-000000009304') <> 1 THEN RAISE EXCEPTION 'Tenant history visibility incorrect'; END IF;
  IF has_table_privilege('authenticated','public.maintenance_tickets','UPDATE') THEN RAISE EXCEPTION 'Direct ticket mutation allowed'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.jobs(title,description,location,homeowner_id,property_id,status,scheduled_end_date)
 SELECT 'Queue fixture ' || n,'Synthetic job','Synthetic location','00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009303','posted',now()-interval '1 day' FROM generate_series(1,3) n;
DO $$ DECLARE first_page jsonb; second_page jsonb; unrelated jsonb; BEGIN
  first_page := public.portfolio_action_queue('00000000-0000-4000-8000-000000009301',0,2);
  second_page := public.portfolio_action_queue('00000000-0000-4000-8000-000000009301',2,2);
  unrelated := public.portfolio_action_queue('00000000-0000-4000-8000-000000009305',0,2);
  IF (first_page->>'total')::int <> 3 OR jsonb_array_length(first_page->'items') <> 2 OR NOT (first_page->>'hasMore')::boolean THEN RAISE EXCEPTION 'First page incorrect'; END IF;
  IF jsonb_array_length(second_page->'items') <> 1 OR (second_page->>'hasMore')::boolean THEN RAISE EXCEPTION 'Second page incorrect'; END IF;
  IF first_page->'items'->0->>'id' = second_page->'items'->0->>'id' THEN RAISE EXCEPTION 'Duplicate page item'; END IF;
  IF (unrelated->>'total')::int <> 0 THEN RAISE EXCEPTION 'Cross-user queue exposure'; END IF;
END $$;
DO $$ DECLARE job_key uuid; result jsonb; BEGIN
 SELECT id INTO job_key FROM public.jobs WHERE title='Queue fixture 1' AND property_id='00000000-0000-4000-8000-000000009303';
 result:=public.save_property_action_followup('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009303','job',job_key,0,'00000000-0000-4000-8000-000000009301',now()+interval '2 days','tenant','Synthetic update');
 IF (result->>'revision')::int<>1 THEN RAISE EXCEPTION 'Revision not advanced'; END IF;
 IF (SELECT count(*) FROM public.property_action_updates WHERE source_id=job_key)<>1 THEN RAISE EXCEPTION 'Missing communication record'; END IF;
 BEGIN
 PERFORM public.save_property_action_followup('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009303','job',job_key,0,NULL,NULL,'manager','Stale save');
 RAISE EXCEPTION 'Stale save accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
 PERFORM public.save_property_action_followup('00000000-0000-4000-8000-000000009305','00000000-0000-4000-8000-000000009303','job',job_key,1,NULL,NULL,'manager','Unauthorized');
 RAISE EXCEPTION 'Unrelated actor accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 PERFORM public.save_property_action_followup('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009303','job',job_key,1,'00000000-0000-4000-8000-000000009305',NULL,'manager','Invalid assignee');
 RAISE EXCEPTION 'Unrelated assignee accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 INSERT INTO public.property_team_members(property_id,user_id,role,status,email) VALUES('00000000-0000-4000-8000-000000009303','00000000-0000-4000-8000-000000009305','manager','accepted','other-portfolio-fixture@example.invalid');
 PERFORM public.save_property_action_followup('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009303','job',job_key,1,'00000000-0000-4000-8000-000000009305',NULL,'manager','Assigned');
 IF NOT EXISTS(SELECT 1 FROM public.property_action_updates u JOIN public.notification_queue q ON q.id=u.notification_id WHERE u.source_id=job_key AND q.user_id='00000000-0000-4000-8000-000000009305' AND q.status='pending') THEN RAISE EXCEPTION 'Assignment alert not durably queued'; END IF;
 DELETE FROM public.property_team_members WHERE property_id='00000000-0000-4000-8000-000000009303' AND user_id='00000000-0000-4000-8000-000000009305';
 result:=public.portfolio_management_report('00000000-0000-4000-8000-000000009301',0);
 IF (result->'properties'->0->>'open_jobs')::int<>3 THEN RAISE EXCEPTION 'Report count incorrect'; END IF;
 IF (public.portfolio_management_report('00000000-0000-4000-8000-000000009305',0)->>'totalProperties')::int<>0 THEN RAISE EXCEPTION 'Cross-user report'; END IF;
END $$;
INSERT INTO public.properties(id,owner_id,property_name,address,property_type) VALUES('00000000-0000-4000-8000-000000009307','00000000-0000-4000-8000-000000009301','Disposable synthetic home','Synthetic address','residential');
INSERT INTO public.property_document_files(property_id,name,kind,object_path,mime_type,size_bytes) VALUES('00000000-0000-4000-8000-000000009307','Synthetic.pdf','lease','synthetic/document','application/pdf',10);
DELETE FROM public.properties WHERE id='00000000-0000-4000-8000-000000009307';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.property_document_files WHERE object_path='synthetic/document' AND property_id IS NULL) THEN RAISE EXCEPTION 'Cleanup tracking lost'; END IF;
 IF has_table_privilege('authenticated','public.property_document_files','SELECT') THEN RAISE EXCEPTION 'Direct file metadata access'; END IF;
 IF (SELECT public FROM storage.buckets WHERE id='property-documents') THEN RAISE EXCEPTION 'Document bucket public'; END IF;
END $$;
ROLLBACK;
