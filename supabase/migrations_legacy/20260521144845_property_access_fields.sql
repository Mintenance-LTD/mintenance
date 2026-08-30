DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'property_access_mode'
  ) THEN
    CREATE TYPE public.property_access_mode AS ENUM (
      'key_safe',
      'smart_lock',
      'in_person'
    );
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS access_mode public.property_access_mode,
  ADD COLUMN IF NOT EXISTS key_safe_code text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS stopcock_location text,
  ADD COLUMN IF NOT EXISTS gas_isolator_location text,
  ADD COLUMN IF NOT EXISTS consumer_unit_location text;

COMMENT ON COLUMN public.properties.access_mode IS
  'How contractors get in for assigned jobs. NULL = not set yet (UI shows the picker as empty). Surface on /contractor/jobs/[id] sidebar under "Access details" once non-null.';

COMMENT ON COLUMN public.properties.key_safe_code IS
  'Lock-box code. Sensitive — only surface to the assigned contractor within 1h of scheduled job start, and only if access_mode = key_safe.';

COMMENT ON COLUMN public.properties.access_notes IS
  'Free-text instructions ("keys with neighbour", "cat in kitchen"). Always visible to the assigned contractor on the job detail.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'access_code'
  ) THEN
    EXECUTE 'UPDATE public.properties
             SET key_safe_code = access_code,
                 access_mode = ''key_safe''
             WHERE access_code IS NOT NULL
               AND key_safe_code IS NULL
               AND access_mode IS NULL';
  END IF;
END $$;;
