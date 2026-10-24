-- Independent, versioned learning progress. This is never an authorization signal.
CREATE TABLE public.onboarding_journeys (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  journey text NOT NULL CHECK (length(journey) BETWEEN 1 AND 120),
  platform text NOT NULL CHECK (platform IN ('web', 'mobile')),
  version integer NOT NULL DEFAULT 2 CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped')),
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, journey, platform, version)
);
ALTER TABLE public.onboarding_journeys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_journeys FROM anon, authenticated;
GRANT SELECT ON public.onboarding_journeys TO authenticated;
GRANT ALL ON public.onboarding_journeys TO service_role;
CREATE POLICY onboarding_read_own ON public.onboarding_journeys FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Durable inbox delivery is part of the grant transaction. No push/email is sent
-- by this migration; clients can always read the notice without OS permission.
CREATE UNIQUE INDEX notifications_early_access_award_once
ON public.notifications ((metadata->>'early_access_grant_id'))
WHERE type = 'early_access_granted';

CREATE OR REPLACE FUNCTION public.reconcile_early_access_notices(p_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE inserted integer;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  SELECT g.user_id, 'early_access_granted', 'Your early-user benefits are active',
    CASE g.role WHEN 'contractor' THEN
      'Your early-access grant includes Business features without a monthly subscription charge. View your benefits and current platform fee.'
    ELSE 'Your early-access grant includes Agency features without a monthly subscription charge. View your property, portfolio and team benefits.' END,
    CASE g.role WHEN 'contractor' THEN '/contractor/subscription' ELSE '/homeowner/subscription' END,
    jsonb_build_object('early_access_grant_id', g.id::text, 'benefit_version', 1, 'role', g.role)
  FROM public.early_access_grants g
  JOIN public.profiles p ON p.id = g.user_id AND p.role = g.role
  WHERE g.grant_type = 'max_subscription_features'
    AND g.role IN ('homeowner', 'contractor')
    AND (p_user_id IS NULL OR g.user_id = p_user_id)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_early_access_notices(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_early_access_notices(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_early_access_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.reconcile_early_access_notices(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_early_access_award() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER early_access_award_notice AFTER INSERT ON public.early_access_grants
FOR EACH ROW EXECUTE FUNCTION public.notify_early_access_award();

-- Serialize cohort allocation by role, including the boundary at slot 100.
CREATE OR REPLACE FUNCTION public.fn_auto_grant_early_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_count integer;
BEGIN
  IF NEW.role NOT IN ('homeowner', 'contractor') THEN RETURN NEW; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('early-access:' || NEW.role, 0));
  SELECT count(*) INTO current_count FROM public.early_access_grants
    WHERE role = NEW.role AND grant_type = 'max_subscription_features';
  IF current_count < 100 THEN
    INSERT INTO public.early_access_grants(user_id, role, grant_type, granted_by, notes)
    VALUES(NEW.id, NEW.role, 'max_subscription_features', 'auto_cohort_trigger',
      format('Founding member #%s of %s (limit 100)', current_count + 1, NEW.role))
    ON CONFLICT (user_id, grant_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_auto_grant_early_access() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_auto_grant_early_access() TO service_role;

-- Existing awards receive one inbox notice, without granting any new benefits.
SELECT public.reconcile_early_access_notices(NULL);
