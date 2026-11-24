CREATE TABLE public.dispute_case_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX dispute_case_status_history_dispute_idx
  ON public.dispute_case_status_history (dispute_id, changed_at, id);

ALTER TABLE public.dispute_case_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispute_case_status_history
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.dispute_case_status_history TO service_role;

CREATE FUNCTION public.record_dispute_case_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.dispute_case_status_history (dispute_id, status)
  VALUES (NEW.id, NEW.status::text);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_dispute_case_status_change()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER record_dispute_case_status_change
AFTER UPDATE OF status ON public.disputes
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IS NOT NULL)
EXECUTE FUNCTION public.record_dispute_case_status_change();
