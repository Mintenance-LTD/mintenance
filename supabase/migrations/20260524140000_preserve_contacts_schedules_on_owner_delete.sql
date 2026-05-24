-- 2026-05-24 audit-34 P1: align live FKs with the property-delete-preview
-- preservation promise. The preview tells homeowners property_contacts
-- + recurring_schedules survive a property delete (which is true:
-- property_id is SET NULL). But the SAME rows are also CASCADEd from
-- profiles via owner_id, and delete_user_data deletes the profile at
-- the end of full account deletion — so the "preserved" rows actually
-- vanish during account hard-delete.
--
-- Flip both owner_id FKs to ON DELETE SET NULL and make the column
-- nullable so the rows survive account deletion the way the UI
-- claims. RLS gates them off from non-admins via the same
-- `owner_id = auth.uid()` check (NULL owner ⇒ not owner ⇒ admin-only
-- read, which is the right behaviour for retained records).
--
-- Applied live via Supabase MCP 2026-05-24.

ALTER TABLE public.property_contacts ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.property_contacts
  DROP CONSTRAINT IF EXISTS property_contacts_owner_id_fkey;
ALTER TABLE public.property_contacts
  ADD CONSTRAINT property_contacts_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.recurring_schedules ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.recurring_schedules
  DROP CONSTRAINT IF EXISTS recurring_schedules_owner_id_fkey;
ALTER TABLE public.recurring_schedules
  ADD CONSTRAINT recurring_schedules_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
