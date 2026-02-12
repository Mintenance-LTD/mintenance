-- Fix users compatibility view to include ALL columns from profiles
-- Previous view only had core columns; profiles has additional denormalized columns
-- (company_name, city, rating, etc.) added by 20260208000000_add_missing_profile_columns.sql

DROP VIEW IF EXISTS public.users;

CREATE VIEW public.users AS
SELECT * FROM public.profiles;

-- Re-grant permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;
