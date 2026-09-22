\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES('fc220922-0000-4000-8000-000000000001','recurring-audit@example.invalid');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type) VALUES('fc220922-0000-4000-8000-000000000010','fc220922-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
INSERT INTO public.recurring_schedules(id,owner_id,property_id,task_type,title,frequency,next_due_date,auto_create_job) VALUES('fc220922-0000-4000-8000-000000000020','fc220922-0000-4000-8000-000000000001','fc220922-0000-4000-8000-000000000010','general','Synthetic','monthly','2026-01-31',true);
INSERT INTO public.jobs(homeowner_id,property_id,title,description,location,status,requirements) VALUES('fc220922-0000-4000-8000-000000000001','fc220922-0000-4000-8000-000000000010','Synthetic recurring job','Synthetic recurring maintenance diagnostic','Synthetic','posted','{"from_schedule_id":"fc220922-0000-4000-8000-000000000020","schedule_cycle_due":"2026-01-31"}');
DO $$ BEGIN
 BEGIN
 INSERT INTO public.jobs(homeowner_id,property_id,title,description,location,status,requirements) VALUES('fc220922-0000-4000-8000-000000000001','fc220922-0000-4000-8000-000000000010','Synthetic recurring job','Synthetic recurring maintenance diagnostic','Synthetic','posted','{"from_schedule_id":"fc220922-0000-4000-8000-000000000020","schedule_cycle_due":"2026-01-31"}');
 RAISE EXCEPTION 'Duplicate cycle accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 UPDATE public.recurring_schedules SET next_due_date='2026-02-28',is_active=false WHERE id='fc220922-0000-4000-8000-000000000020';
 BEGIN
 INSERT INTO public.jobs(homeowner_id,property_id,title,description,location,status,requirements) VALUES('fc220922-0000-4000-8000-000000000001','fc220922-0000-4000-8000-000000000010','Synthetic recurring job','Synthetic recurring maintenance diagnostic','Synthetic','posted','{"from_schedule_id":"fc220922-0000-4000-8000-000000000020","schedule_cycle_due":"2026-02-28"}');
 RAISE EXCEPTION 'Paused schedule accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.recurring_schedules SET is_active=true WHERE id='fc220922-0000-4000-8000-000000000020';
 INSERT INTO public.jobs(homeowner_id,property_id,title,description,location,status,requirements) VALUES('fc220922-0000-4000-8000-000000000001','fc220922-0000-4000-8000-000000000010','Synthetic recurring job','Synthetic recurring maintenance diagnostic','Synthetic','posted','{"from_schedule_id":"fc220922-0000-4000-8000-000000000020","schedule_cycle_due":"2026-02-28"}');
 IF (SELECT count(*) FROM public.jobs WHERE homeowner_id='fc220922-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Distinct cycle skipped'; END IF;
END $$;
ROLLBACK;
