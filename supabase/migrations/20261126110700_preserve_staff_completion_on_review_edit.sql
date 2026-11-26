-- Owner edits to the review deadline or notes do not consume the submission.
CREATE FUNCTION public.keep_staff_completion_on_review_metadata_edit()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.completion_revision := NEW.revision;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.keep_staff_completion_on_review_metadata_edit()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keep_staff_completion_on_review_metadata_edit()
  TO service_role;

CREATE TRIGGER keep_staff_completion_after_review_metadata_edit
  BEFORE UPDATE OF revision ON public.property_action_followups
  FOR EACH ROW
  WHEN (OLD.kind = 'report'
        AND OLD.waiting_for = 'approval'
        AND NEW.waiting_for = 'approval'
        AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to
        AND OLD.completion_revision = OLD.revision
        AND NEW.completion_revision = OLD.completion_revision)
  EXECUTE FUNCTION public.keep_staff_completion_on_review_metadata_edit();
