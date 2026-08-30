ALTER TABLE public.property_contacts
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.property_contacts
  DROP CONSTRAINT IF EXISTS property_contacts_property_id_fkey;

ALTER TABLE public.property_contacts
  ADD CONSTRAINT property_contacts_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.property_contacts.property_id IS
  'FK to properties. NULL once the property is deleted — keyholder and managing-agent contact history survives for the owner''s record. owner_id is the authoritative ownership key.';

ALTER TABLE public.recurring_schedules
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.recurring_schedules
  DROP CONSTRAINT IF EXISTS recurring_schedules_property_id_fkey;

ALTER TABLE public.recurring_schedules
  ADD CONSTRAINT recurring_schedules_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.recurring_schedules.property_id IS
  'FK to properties. NULL once the property is deleted — the schedule row survives so the owner can see their historical cycle. The recurring-job cron skips schedules with NULL property_id (the new job would have nowhere to scope to).';;
