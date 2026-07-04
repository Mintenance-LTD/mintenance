-- Sync contractor_skills -> profiles.skills (2026-07-04).
--
-- profiles.skills (text[], added 20260208000000 "for simpler querying
-- patterns") was never written by anything: onboarding, manage-skills, and
-- the mobile skill service all write the normalized contractor_skills
-- table only, so every skills-based reader of profiles.skills (web search
-- + facets, market-insights competition counts, revenue-by-trade, mobile
-- keyword search) has run on NULL since the column was created.
--
-- contractor_skills stays the canonical write store; this trigger keeps
-- the denormalized array in step. SECURITY DEFINER so mobile's direct
-- client-side inserts sync despite the profiles column-grant lock.
-- COALESCE(NEW, OLD) matters: the onboarding save route deletes all rows
-- before reinserting, and NEW is NULL in DELETE triggers.

CREATE OR REPLACE FUNCTION public.sync_contractor_skills_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contractor uuid := COALESCE(NEW.contractor_id, OLD.contractor_id);
BEGIN
  UPDATE public.profiles
     SET skills = COALESCE(
       (SELECT array_agg(DISTINCT skill_name ORDER BY skill_name)
          FROM public.contractor_skills
         WHERE contractor_id = v_contractor),
       ARRAY[]::text[]
     )
   WHERE id = v_contractor;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_contractor_skills ON public.contractor_skills;
CREATE TRIGGER trigger_sync_contractor_skills
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_skills
FOR EACH ROW EXECUTE FUNCTION public.sync_contractor_skills_to_profiles();

-- One-time backfill for contractors who picked skills before the trigger
-- existed. Contractors with no skill rows keep NULL (containment filters
-- treat NULL and empty identically).
UPDATE public.profiles p
   SET skills = sub.arr
  FROM (
    SELECT contractor_id, array_agg(DISTINCT skill_name ORDER BY skill_name) AS arr
      FROM public.contractor_skills
     GROUP BY contractor_id
  ) sub
 WHERE p.id = sub.contractor_id;
