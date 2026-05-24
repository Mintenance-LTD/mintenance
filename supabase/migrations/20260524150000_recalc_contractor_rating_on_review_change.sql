-- 2026-05-24 audit-35 P1: update_contractor_rating only fired on
-- AFTER INSERT and read NEW.reviewee_id. When a review was deleted —
-- most commonly via the homeowner-profile CASCADE during account
-- hard-delete (reviews.reviewer_id is ON DELETE CASCADE), but also
-- by a future admin moderation flow — the contractor's stored
-- profiles.rating never recalculated. A contractor whose only
-- 5-star reviewer deleted their account would still show 5.00
-- on their public profile while the reviews table held zero rows
-- for them. Extend the trigger to fire on DELETE + UPDATE OF rating
-- too, recompute against COALESCE(NEW.reviewee_id, OLD.reviewee_id),
-- and set rating to NULL when there are no reviews left so the
-- profile doesn't keep a frozen number from a deleted review.
--
-- Applied live via Supabase MCP 2026-05-24.

CREATE OR REPLACE FUNCTION public.update_contractor_rating()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  v_reviewee_id UUID;
  v_new_rating NUMERIC;
BEGIN
  v_reviewee_id := COALESCE(NEW.reviewee_id, OLD.reviewee_id);

  SELECT ROUND(AVG(rating)::numeric, 2)
    INTO v_new_rating
  FROM public.reviews
  WHERE reviewee_id = v_reviewee_id;

  UPDATE public.profiles
     SET rating = v_new_rating
   WHERE id = v_reviewee_id;

  IF TG_OP = 'UPDATE'
     AND OLD.reviewee_id IS NOT NULL
     AND OLD.reviewee_id <> NEW.reviewee_id THEN
    SELECT ROUND(AVG(rating)::numeric, 2)
      INTO v_new_rating
    FROM public.reviews
    WHERE reviewee_id = OLD.reviewee_id;
    UPDATE public.profiles
       SET rating = v_new_rating
     WHERE id = OLD.reviewee_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS update_contractor_rating_trigger ON public.reviews;

CREATE TRIGGER update_contractor_rating_trigger
  AFTER INSERT OR DELETE OR UPDATE OF rating, reviewee_id
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contractor_rating();
