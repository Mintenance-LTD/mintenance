CREATE TABLE IF NOT EXISTS public.job_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_checklist_items_job_id_idx
  ON public.job_checklist_items (job_id);

CREATE INDEX IF NOT EXISTS job_checklist_items_completed_idx
  ON public.job_checklist_items (job_id, completed_at)
  WHERE completed_at IS NOT NULL;

COMMENT ON TABLE public.job_checklist_items IS
  'Pre-arrival + on-site checklist items the homeowner sets for the assigned contractor.';

CREATE OR REPLACE FUNCTION public.tg_job_checklist_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_checklist_items_updated_at ON public.job_checklist_items;
CREATE TRIGGER job_checklist_items_updated_at
  BEFORE UPDATE ON public.job_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_job_checklist_items_updated_at();

ALTER TABLE public.job_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_checklist_items_homeowner_all ON public.job_checklist_items;
CREATE POLICY job_checklist_items_homeowner_all ON public.job_checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_checklist_items.job_id AND j.homeowner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_checklist_items.job_id AND j.homeowner_id = auth.uid()));

DROP POLICY IF EXISTS job_checklist_items_contractor_select ON public.job_checklist_items;
CREATE POLICY job_checklist_items_contractor_select ON public.job_checklist_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_checklist_items.job_id AND j.contractor_id = auth.uid()));

DROP POLICY IF EXISTS job_checklist_items_contractor_update ON public.job_checklist_items;
CREATE POLICY job_checklist_items_contractor_update ON public.job_checklist_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_checklist_items.job_id AND j.contractor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_checklist_items.job_id AND j.contractor_id = auth.uid()));

DROP POLICY IF EXISTS job_checklist_items_admin_select ON public.job_checklist_items;
CREATE POLICY job_checklist_items_admin_select ON public.job_checklist_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));;
