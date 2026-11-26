-- Reopening starts a new review cycle. Keep the earlier note and attribution.
CREATE FUNCTION public.reset_staff_completion_on_report_reopen()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.property_action_followups
    SET revision = revision + 1,
        waiting_for = 'manager',
        updated_at = now()
    WHERE kind = 'report'
      AND source_id = NEW.id
      AND property_id = NEW.property_id
      AND completion_revision = revision
      AND waiting_for = 'approval';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_staff_completion_on_report_reopen()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_staff_completion_on_report_reopen()
  TO service_role;

CREATE TRIGGER reset_staff_completion_after_report_reopen
  AFTER UPDATE OF status ON public.anonymous_reports
  FOR EACH ROW
  WHEN (OLD.status IN ('resolved', 'dismissed', 'converted')
        AND NEW.status IN ('new', 'acknowledged'))
  EXECUTE FUNCTION public.reset_staff_completion_on_report_reopen();
