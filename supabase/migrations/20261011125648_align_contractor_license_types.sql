BEGIN;
-- Keep the database aligned with all options offered by contractor verification.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_license_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_license_type_check CHECK (
  license_type IS NULL OR license_type IN ('trade', 'gas_safe', 'electrical', 'plumbing', 'hvac', 'roofing', 'other')
);
COMMIT;
