ALTER FUNCTION public.tg_job_tips_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.tg_job_checklist_items_updated_at()
  SET search_path = public, pg_temp;;
