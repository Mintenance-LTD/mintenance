-- A claim and its credit update commit or roll back together. The existing
-- contractor advisory lock serializes this function with contribution updates.
CREATE TABLE public.contractor_milestone_claims (
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_threshold integer NOT NULL CHECK (image_threshold IN (10, 50, 100, 200, 500)),
  source text NOT NULL CHECK (source IN ('award', 'legacy_boundary')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contractor_id, image_threshold)
);
ALTER TABLE public.contractor_milestone_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_milestone_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.contractor_milestone_claims TO service_role;

-- The old counter has no per-milestone ledger. Preserve an explicit migration
-- boundary for previously rewarded accounts rather than award historical
-- milestones again. This records uncertainty, not proof of a historical award;
-- any historic missing/duplicate rewards require reconciliation before rollout.
INSERT INTO public.contractor_milestone_claims (contractor_id, image_threshold, source)
SELECT DISTINCT c.contractor_id, m.threshold, 'legacy_boundary'
FROM public.contractor_contributions c
CROSS JOIN (VALUES (10), (50), (100), (200), (500)) m(threshold)
WHERE c.last_reward_date IS NOT NULL AND c.images_contributed >= m.threshold
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_contractor_contribution_milestone(
  p_contractor_id uuid
)
RETURNS TABLE(bonus numeric, milestone text, premium_months integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  contribution_row public.contractor_contributions%ROWTYPE;
  reward numeric := 0;
  reward_name text := NULL;
  premium integer := 0;
BEGIN
  IF p_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Contractor ID is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_contractor_id::text, 0));

  SELECT *
    INTO contribution_row
    FROM public.contractor_contributions
   WHERE contractor_id = p_contractor_id
   ORDER BY created_at ASC, id ASC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, NULL::text, 0;
    RETURN;
  END IF;

  CASE contribution_row.images_contributed
    WHEN 10 THEN reward := 10; reward_name := 'First 10 images!';
    WHEN 50 THEN reward := 50; reward_name := 'Silver contributor!';
    WHEN 100 THEN reward := 100; reward_name := '100 images - 3 months premium earned!'; premium := 3;
    WHEN 200 THEN reward := 200; reward_name := 'Gold contributor!';
    WHEN 500 THEN reward := 500; reward_name := 'Expert contributor!';
    ELSE NULL;
  END CASE;

  IF reward > 0 THEN
    INSERT INTO public.contractor_milestone_claims (contractor_id, image_threshold, source)
    VALUES (p_contractor_id, contribution_row.images_contributed, 'award')
    ON CONFLICT (contractor_id, image_threshold) DO NOTHING;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 0::numeric, NULL::text, 0;
      RETURN;
    END IF;

    UPDATE public.contractor_contributions
       SET credits_earned = COALESCE(contribution_row.credits_earned, 0) + reward,
           premium_months_earned = COALESCE(contribution_row.premium_months_earned, 0) + premium,
           last_reward_date = CURRENT_DATE,
           updated_at = now()
     WHERE id = contribution_row.id;
  END IF;

  RETURN QUERY SELECT reward, reward_name, premium;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_contractor_contribution_milestone(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_contractor_contribution_milestone(uuid) TO service_role;
