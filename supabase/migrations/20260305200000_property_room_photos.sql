-- Property Room Photos: per-room photo uploads for properties
BEGIN;

CREATE TABLE IF NOT EXISTS public.property_room_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL CHECK (room_type IN (
    'kitchen', 'bathroom', 'bedroom', 'living_room', 'dining_room',
    'garage', 'garden', 'exterior', 'roof', 'hallway', 'office',
    'utility', 'other'
  )),
  storage_path TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_room_photos_property_id
  ON public.property_room_photos(property_id);
CREATE INDEX idx_property_room_photos_property_room
  ON public.property_room_photos(property_id, room_type);
CREATE INDEX idx_property_room_photos_uploaded_by
  ON public.property_room_photos(uploaded_by);

ALTER TABLE public.property_room_photos ENABLE ROW LEVEL SECURITY;

-- Property owner full CRUD
CREATE POLICY "Property owner manages room photos"
  ON public.property_room_photos FOR ALL
  USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

-- Team members can view
CREATE POLICY "Team members can view room photos"
  ON public.property_room_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_team_members ptm
      WHERE ptm.property_id = property_room_photos.property_id
        AND ptm.user_id = auth.uid()
        AND ptm.status = 'accepted'
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on property_room_photos"
  ON public.property_room_photos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
