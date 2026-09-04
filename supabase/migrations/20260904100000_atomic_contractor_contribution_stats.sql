-- Keep contractor contribution counters correct when uploads arrive
-- concurrently. The API previously performed a read/modify/write sequence,
-- which could lose increments and credits under parallel requests.
CREATE OR REPLACE FUNCTION public.increment_contractor_contribution_stats(
  p_contractor_id uuid,
  p_images integer DEFAULT 1,
  p_credits numeric DEFAULT 5
)
RETURNS TABLE(images_contributed integer, credits_earned numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  contribution_row public.contractor_contributions%ROWTYPE;
BEGIN
  IF p_contractor_id IS NULL OR p_images <= 0 OR p_credits < 0 THEN
    RAISE EXCEPTION 'Invalid contractor contribution increment';
  END IF;

  -- Serialize updates for one contractor without relying on a unique
  -- constraint that older installations may not have.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_contractor_id::text, 0));

  SELECT *
    INTO contribution_row
    FROM public.contractor_contributions
   WHERE contractor_id = p_contractor_id
   ORDER BY created_at ASC, id ASC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.contractor_contributions (
      contractor_id,
      images_contributed,
      credits_earned,
      updated_at
    )
    VALUES (p_contractor_id, p_images, p_credits, now())
    RETURNING * INTO contribution_row;
  ELSE
    UPDATE public.contractor_contributions
       SET images_contributed = COALESCE(contribution_row.images_contributed, 0) + p_images,
           credits_earned = COALESCE(contribution_row.credits_earned, 0) + p_credits,
           updated_at = now()
     WHERE id = contribution_row.id
    RETURNING * INTO contribution_row;
  END IF;

  RETURN QUERY SELECT contribution_row.images_contributed, contribution_row.credits_earned;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_contractor_contribution_stats(uuid, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_contractor_contribution_stats(uuid, integer, numeric) TO service_role;

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

REVOKE ALL ON FUNCTION public.claim_contractor_contribution_milestone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_contractor_contribution_milestone(uuid) TO service_role;
