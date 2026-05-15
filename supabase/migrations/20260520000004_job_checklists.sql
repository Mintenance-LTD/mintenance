-- ============================================================================
-- 20260520000004_job_checklists.sql
--
-- Pre-arrival checklist for assigned contractors (from the editorial
-- mock — "Pre-arrival checklist" card under Customer brief).
--
-- Workflow: when a job is assigned, the homeowner can add checklist
-- items the contractor should complete before / when arriving on site
-- ("Confirm Gas Safe cert uploaded", "Bring magnetic filter spare",
-- "Take 'before' photos when on site"). Contractor sees the list on
-- `/contractor/jobs/[id]` and ticks items as they go. Homeowner sees
-- the same list with completion state on their job detail.
--
-- Why a dedicated table (not a JSONB column on jobs):
--   1. Per-item completion timestamps (when did the contractor tick
--      "Bring magnetic filter"? — useful for audit + dispute).
--   2. Per-item ordering (drag-to-reorder later).
--   3. Default templates per category — seeded by a future trigger
--      that copies category-specific defaults on job assignment.
--
-- RLS:
--   - Homeowner can read + write items for their own jobs.
--   - Assigned contractor can read + UPDATE `completed_at` (tick) but
--     can't insert / delete (only the homeowner adds items).
--   - Admins can read everything for support.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  label text NOT NULL,
  -- Position in list (homeowner-controlled order). Defaults to insert order.
  position integer NOT NULL DEFAULT 0,
  -- Completion: null until the contractor ticks it.
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Creation audit.
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
  'Pre-arrival + on-site checklist items the homeowner sets for the
   assigned contractor. Used on /contractor/jobs/[id] (read + tick)
   and /jobs/[id] (read + write).';

-- ─── updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_job_checklist_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_checklist_items_updated_at
  ON public.job_checklist_items;
CREATE TRIGGER job_checklist_items_updated_at
  BEFORE UPDATE ON public.job_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_job_checklist_items_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.job_checklist_items ENABLE ROW LEVEL SECURITY;

-- Homeowner: full access to their own jobs.
DROP POLICY IF EXISTS job_checklist_items_homeowner_all
  ON public.job_checklist_items;
CREATE POLICY job_checklist_items_homeowner_all
  ON public.job_checklist_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.homeowner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.homeowner_id = auth.uid()
    )
  );

-- Assigned contractor: SELECT all, UPDATE only `completed_at` /
-- `completed_by` (enforced at API layer — RLS allows the row update
-- but the API endpoint is the one that whitelists which columns the
-- contractor can change).
DROP POLICY IF EXISTS job_checklist_items_contractor_select
  ON public.job_checklist_items;
CREATE POLICY job_checklist_items_contractor_select
  ON public.job_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.contractor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS job_checklist_items_contractor_update
  ON public.job_checklist_items;
CREATE POLICY job_checklist_items_contractor_update
  ON public.job_checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.contractor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.contractor_id = auth.uid()
    )
  );

-- Admin: full read for support.
DROP POLICY IF EXISTS job_checklist_items_admin_select
  ON public.job_checklist_items;
CREATE POLICY job_checklist_items_admin_select
  ON public.job_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

COMMIT;

-- ============================================================================
-- Rollback (manual, for reference)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.job_checklist_items;
-- DROP FUNCTION IF EXISTS public.tg_job_checklist_items_updated_at();
-- COMMIT;
