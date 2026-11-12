-- Audit: these existing NOT VALID keys have zero orphaned rows and small tables.
-- Fail promptly if a conflicting DDL lock exists; preserve all data and policies.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
ALTER TABLE public.contractor_meetings VALIDATE CONSTRAINT contractor_meetings_cancelled_by_profiles_fkey;
ALTER TABLE public.contractor_meetings VALIDATE CONSTRAINT contractor_meetings_contractor_id_profiles_fkey;
ALTER TABLE public.contractor_meetings VALIDATE CONSTRAINT contractor_meetings_homeowner_id_profiles_fkey;
ALTER TABLE public.meeting_updates VALIDATE CONSTRAINT meeting_updates_updated_by_profiles_fkey;
ALTER TABLE public.property_favorites VALIDATE CONSTRAINT property_favorites_user_id_profiles_fkey;
