-- job_rooms — denormalised snapshot of which property_rooms a job targets.
--
-- Why a snapshot (not a plain join):
--   * If the homeowner later renames "Master bathroom" → "Family bath" or
--     corrects the sqm, the historical job scope must NOT change. Bids,
--     contracts and any per-sqm calculations were quoted against the
--     values at posting time, so we freeze them here.
--   * If the homeowner deletes a room (`property_rooms.id` → ON DELETE
--     SET NULL on this table), the job still remembers what was in scope
--     via the captured `name` / `room_type` / `size_sqm_at_post`.
--
-- Visibility:
--   * Mirrors the parent job's read visibility — anyone who can read the
--     job can read its room scope. Posted jobs are public-readable so
--     bidding contractors see the scope without us widening the (narrow)
--     property_rooms RLS at all.
--   * Only the job's homeowner (or service_role) can write.

CREATE TABLE IF NOT EXISTS public.job_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  -- Nullable so a later room delete doesn't lose the job's scope row.
  property_room_id UUID REFERENCES public.property_rooms(id) ON DELETE SET NULL,
  -- Frozen-at-post snapshot of the room's display data.
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN (
    'kitchen','bathroom','bedroom','living_room','dining_room',
    'garage','garden','exterior','roof','hallway',
    'office','utility','other'
  )),
  -- Snapshot of the room's size at the moment the job was posted.
  -- Nullable when the homeowner hadn't entered it.
  size_sqm_at_post NUMERIC(8,2)
    CHECK (size_sqm_at_post IS NULL OR size_sqm_at_post >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_rooms_job ON public.job_rooms(job_id);
CREATE INDEX IF NOT EXISTS idx_job_rooms_property_room
  ON public.job_rooms(property_room_id);

-- Prevent the same property_room being added twice to the same job.
-- (Multiple null `property_room_id` rows are still allowed — they
-- represent rooms whose source was hard-deleted post-snapshot.)
CREATE UNIQUE INDEX IF NOT EXISTS job_rooms_job_room_unique
  ON public.job_rooms(job_id, property_room_id)
  WHERE property_room_id IS NOT NULL;

ALTER TABLE public.job_rooms ENABLE ROW LEVEL SECURITY;

-- READ: anyone who can see the parent job can see its room scope.
-- Mirrors the public/contractor read paths on `jobs` so we don't
-- accidentally hide the scope from a contractor who can already see
-- the job in their discover feed.
DROP POLICY IF EXISTS job_rooms_select_via_job ON public.job_rooms;
CREATE POLICY job_rooms_select_via_job
  ON public.job_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_rooms.job_id
        AND (
          -- Job participants
          j.homeowner_id = auth.uid()
          OR j.contractor_id = auth.uid()
          -- Posted jobs are readable platform-wide (matches
          -- "Anyone can view published jobs" on the jobs table).
          OR j.status IN ('posted','published')
        )
    )
  );

-- WRITE: only the job's homeowner (the poster).
DROP POLICY IF EXISTS job_rooms_homeowner_write ON public.job_rooms;
CREATE POLICY job_rooms_homeowner_write
  ON public.job_rooms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_rooms.job_id
        AND j.homeowner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_rooms.job_id
        AND j.homeowner_id = auth.uid()
    )
  );

-- Service role
DROP POLICY IF EXISTS job_rooms_service_role ON public.job_rooms;
CREATE POLICY job_rooms_service_role
  ON public.job_rooms
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.job_rooms IS
  'Snapshot of property_rooms a job targets at post time. Frozen name/type/sqm so historical job scope is stable across later room edits.';
COMMENT ON COLUMN public.job_rooms.size_sqm_at_post IS
  'Floor area in m^2 captured at the moment the job was posted.';
