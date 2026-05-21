-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- job_rooms — denormalised snapshot of which property_rooms a job targets.
CREATE TABLE IF NOT EXISTS public.job_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  property_room_id UUID REFERENCES public.property_rooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN (
    'kitchen','bathroom','bedroom','living_room','dining_room',
    'garage','garden','exterior','roof','hallway',
    'office','utility','other'
  )),
  size_sqm_at_post NUMERIC(8,2)
    CHECK (size_sqm_at_post IS NULL OR size_sqm_at_post >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_rooms_job ON public.job_rooms(job_id);
CREATE INDEX IF NOT EXISTS idx_job_rooms_property_room
  ON public.job_rooms(property_room_id);

CREATE UNIQUE INDEX IF NOT EXISTS job_rooms_job_room_unique
  ON public.job_rooms(job_id, property_room_id)
  WHERE property_room_id IS NOT NULL;

ALTER TABLE public.job_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_rooms_select_via_job ON public.job_rooms;
CREATE POLICY job_rooms_select_via_job
  ON public.job_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_rooms.job_id
        AND (
          j.homeowner_id = auth.uid()
          OR j.contractor_id = auth.uid()
          OR j.status IN ('posted','published')
        )
    )
  );

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

DROP POLICY IF EXISTS job_rooms_service_role ON public.job_rooms;
CREATE POLICY job_rooms_service_role
  ON public.job_rooms
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.job_rooms IS
  'Snapshot of property_rooms a job targets at post time. Frozen name/type/sqm so historical job scope is stable across later room edits.';
COMMENT ON COLUMN public.job_rooms.size_sqm_at_post IS
  'Floor area in m^2 captured at the moment the job was posted.';
