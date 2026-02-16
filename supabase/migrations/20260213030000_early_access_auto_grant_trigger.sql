-- Auto-grant early access for founding member cohorts on new profile creation
-- First 50 contractors and first 30 homeowners get premium access automatically

BEGIN;

-- Function: check cohort limits and auto-grant early access on profile insert
CREATE OR REPLACE FUNCTION public.fn_auto_grant_early_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cohort_limit INT;
  current_count INT;
BEGIN
  -- Only process homeowner and contractor roles
  IF NEW.role NOT IN ('homeowner', 'contractor') THEN
    RETURN NEW;
  END IF;

  -- Determine cohort limit based on role
  IF NEW.role = 'contractor' THEN
    cohort_limit := 50;
  ELSIF NEW.role = 'homeowner' THEN
    cohort_limit := 30;
  END IF;

  -- Count existing grants for this role
  SELECT COUNT(*)
    INTO current_count
    FROM public.early_access_grants
   WHERE role = NEW.role
     AND grant_type = 'max_subscription_features';

  -- If cohort is not yet full, grant early access
  IF current_count < cohort_limit THEN
    INSERT INTO public.early_access_grants (user_id, role, grant_type, granted_by, notes)
    VALUES (
      NEW.id,
      NEW.role,
      'max_subscription_features',
      'auto_cohort_trigger',
      format('Founding member #%s of %s (limit %s)', current_count + 1, NEW.role, cohort_limit)
    )
    ON CONFLICT (user_id, grant_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: fire after a new profile is inserted
DROP TRIGGER IF EXISTS trg_auto_grant_early_access ON public.profiles;

CREATE TRIGGER trg_auto_grant_early_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_grant_early_access();

-- RLS policy: allow users to read their own early access grants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'early_access_grants'
      AND policyname = 'early_access_grants_select_own'
  ) THEN
    CREATE POLICY early_access_grants_select_own
      ON public.early_access_grants
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

COMMIT;
