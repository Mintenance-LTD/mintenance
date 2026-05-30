-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Property rooms — homeowners can describe each room of their property
-- (name, type, optional size) so jobs can be posted against specific
-- rooms and bids/quotes can later compute per-sqm costs.
--
-- This is the foundation for the rooms feature. Subsequent work
-- (job_rooms join table, per-sqm bid pricing, market-rate insights)
-- builds on this.

CREATE TABLE IF NOT EXISTS public.property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN (
    'kitchen','bathroom','bedroom','lounge','dining','hallway',
    'utility','garage','loft','garden','exterior','office','other'
  )),
  -- Floor area in square metres. Nullable — the homeowner may not know.
  size_sqm NUMERIC(8,2) CHECK (size_sqm IS NULL OR size_sqm >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_rooms_property
  ON public.property_rooms(property_id);

-- Updated_at trigger — reuses canonical function
DROP TRIGGER IF EXISTS property_rooms_updated_at ON public.property_rooms;
CREATE TRIGGER property_rooms_updated_at
  BEFORE UPDATE ON public.property_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.property_rooms ENABLE ROW LEVEL SECURITY;

-- Property owner can CRUD rooms on their own properties
DROP POLICY IF EXISTS property_rooms_owner_all ON public.property_rooms;
CREATE POLICY property_rooms_owner_all
  ON public.property_rooms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_rooms.property_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_rooms.property_id
        AND p.owner_id = auth.uid()
    )
  );

-- Contractor can read rooms of properties they have an active or
-- completed job on. Scoped to assigned/in_progress/completed so
-- a bidding contractor doesn't see the full layout until accepted.
DROP POLICY IF EXISTS property_rooms_contractor_read ON public.property_rooms;
CREATE POLICY property_rooms_contractor_read
  ON public.property_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.property_id = property_rooms.property_id
        AND j.contractor_id = auth.uid()
        AND j.status IN ('assigned','in_progress','completed')
    )
  );

-- Service role for admin tasks + server APIs
DROP POLICY IF EXISTS property_rooms_service_role ON public.property_rooms;
CREATE POLICY property_rooms_service_role
  ON public.property_rooms
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.property_rooms IS
  'Rooms within a property — homeowner describes name/type/size_sqm so jobs can target specific rooms and quotes can compute per-sqm costs.';
COMMENT ON COLUMN public.property_rooms.size_sqm IS
  'Floor area in square metres; nullable when the homeowner does not know.';
