-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Align property_rooms.room_type with the taxonomy already used by
-- property_room_photos (room-photos route VALID_ROOM_TYPES), so the
-- homeowner sees the same room types when defining a room and when
-- tagging a photo.

ALTER TABLE public.property_rooms
  DROP CONSTRAINT IF EXISTS property_rooms_room_type_check;

ALTER TABLE public.property_rooms
  ADD CONSTRAINT property_rooms_room_type_check
  CHECK (room_type IN (
    'kitchen','bathroom','bedroom','living_room','dining_room',
    'garage','garden','exterior','roof','hallway',
    'office','utility','other'
  ));
