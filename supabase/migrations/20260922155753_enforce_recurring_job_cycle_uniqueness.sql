-- A cycle is identified by its schedule, original due date and homeowner.
-- Concurrent workers cannot insert two jobs for the same occurrence.
CREATE UNIQUE INDEX jobs_recurring_schedule_cycle_unique
ON public.jobs(homeowner_id,(requirements->>'from_schedule_id'),(requirements->>'schedule_cycle_due'))
WHERE requirements->>'from_schedule_id' IS NOT NULL
 AND requirements->>'schedule_cycle_due' IS NOT NULL;

CREATE FUNCTION public.validate_recurring_job_cycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE schedule public.recurring_schedules%ROWTYPE;
BEGIN
 IF NEW.requirements->>'from_schedule_id' IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO schedule FROM public.recurring_schedules
 WHERE id::text=NEW.requirements->>'from_schedule_id' FOR UPDATE;
 IF NOT FOUND OR schedule.owner_id IS DISTINCT FROM NEW.homeowner_id
 OR schedule.property_id IS DISTINCT FROM NEW.property_id
 OR schedule.property_id IS NULL OR schedule.owner_id IS NULL
 OR NOT schedule.is_active OR NOT schedule.auto_create_job
 OR schedule.next_due_date::text IS DISTINCT FROM NEW.requirements->>'schedule_cycle_due' THEN
  RAISE EXCEPTION 'Recurring schedule changed or is not authorized' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_recurring_job_cycle() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_recurring_job_cycle BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_job_cycle();
