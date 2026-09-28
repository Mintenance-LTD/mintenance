-- Contacts belong to a property; their optional account link must not prevent
-- the invited person from deleting their account. Keep accepted_at unchanged:
-- deleting an account must not make an already-used invitation claimable again.
ALTER TABLE public.property_tenants
 DROP CONSTRAINT property_tenants_user_id_fkey,
 ADD CONSTRAINT property_tenants_user_id_fkey
 FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- A removed property has no remaining contact-management audience. Do not leave
-- detached names/emails/notes behind. This changes future deletion behavior only;
-- existing detached records require a separately reviewed retention cleanup.
ALTER TABLE public.property_tenants
 DROP CONSTRAINT property_tenants_property_id_fkey,
 ADD CONSTRAINT property_tenants_property_id_fkey
 FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
