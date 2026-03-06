-- Increase early access cohort limits from 50/30 to 100/100
-- Both contractors and homeowners now get 100 founding member slots

BEGIN;

-- Update the auto-grant trigger function with new limits
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

  -- Determine cohort limit based on role (100 each)
  cohort_limit := 100;

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

-- Backfill: grant early access to existing users who signed up after the
-- original cohort but are within the new 100 limit.
-- This picks the earliest profiles by created_at that don't already have a grant.

-- Backfill contractors (up to 100 total)
INSERT INTO public.early_access_grants (user_id, role, grant_type, granted_by, notes)
SELECT
  p.id,
  'contractor',
  'max_subscription_features',
  'migration_backfill_100',
  format('Founding member #%s of contractor (limit 100, backfilled)', row_number)
FROM (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.created_at ASC) AS row_number
    FROM public.profiles p
   WHERE p.role = 'contractor'
     AND NOT EXISTS (
       SELECT 1 FROM public.early_access_grants eag
        WHERE eag.user_id = p.id
          AND eag.grant_type = 'max_subscription_features'
     )
) p
WHERE p.row_number <= (
  100 - (SELECT COUNT(*) FROM public.early_access_grants WHERE role = 'contractor' AND grant_type = 'max_subscription_features')
)
ON CONFLICT (user_id, grant_type) DO NOTHING;

-- Backfill homeowners (up to 100 total)
INSERT INTO public.early_access_grants (user_id, role, grant_type, granted_by, notes)
SELECT
  p.id,
  'homeowner',
  'max_subscription_features',
  'migration_backfill_100',
  format('Founding member #%s of homeowner (limit 100, backfilled)', row_number)
FROM (
  SELECT p.id,
         ROW_NUMBER() OVER (ORDER BY p.created_at ASC) AS row_number
    FROM public.profiles p
   WHERE p.role = 'homeowner'
     AND NOT EXISTS (
       SELECT 1 FROM public.early_access_grants eag
        WHERE eag.user_id = p.id
          AND eag.grant_type = 'max_subscription_features'
     )
) p
WHERE p.row_number <= (
  100 - (SELECT COUNT(*) FROM public.early_access_grants WHERE role = 'homeowner' AND grant_type = 'max_subscription_features')
)
ON CONFLICT (user_id, grant_type) DO NOTHING;

COMMIT;
