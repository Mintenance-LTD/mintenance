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
