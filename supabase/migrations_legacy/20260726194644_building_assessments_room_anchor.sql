-- building_assessments: anchor an assessment to a single room.
--
-- Assessments could already be anchored to a property or a job, but not to a
-- room -- so a walkthrough of one kitchen was stored as an anonymous
-- property-level survey and nothing could ask "what has happened in this
-- room?". The room-scoped walkthrough (RoomPicker) already knows which room it
-- filmed and passes it as context; this gives that answer somewhere to live.
--
-- Nullable on purpose: property- and job-anchored assessments remain valid and
-- keep room_id NULL. This is an additional, optional anchor, not a replacement.
--
-- ON DELETE SET NULL rather than CASCADE, matching the retention decisions made
-- across this feature (compliance_certificates, property_tenants,
-- anonymous_report_tokens): deleting a room must not destroy the survey history
-- that was taken in it. The assessment survives with its property anchor and
-- its findings intact, having only lost the room pointer.

ALTER TABLE public.building_assessments
  ADD COLUMN IF NOT EXISTS room_id uuid;

ALTER TABLE public.building_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_room_id_fkey;

ALTER TABLE public.building_assessments
  ADD CONSTRAINT building_assessments_room_id_fkey
  FOREIGN KEY (room_id)
  REFERENCES public.property_rooms(id)
  ON DELETE SET NULL;

-- Every FK on the property-feature tables is covered by an index (verified
-- 2026-07-26); keep it that way. Partial, because the overwhelming majority of
-- rows are property/job-anchored with room_id NULL.
CREATE INDEX IF NOT EXISTS idx_building_assessments_room_id
  ON public.building_assessments (room_id)
  WHERE room_id IS NOT NULL;;
