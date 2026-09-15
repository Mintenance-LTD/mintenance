BEGIN;
CREATE OR REPLACE FUNCTION public.revoke_web_sessions_atomic(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cutoff timestamptz;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  cutoff := clock_timestamp();
  UPDATE public.profiles SET tokens_revoked_at=cutoff WHERE id=p_user_id;
  UPDATE public.refresh_tokens SET revoked_at=cutoff,revoked_reason='logout_all'
    WHERE user_id=p_user_id AND revoked_at IS NULL;
  DELETE FROM public.pre_mfa_sessions WHERE user_id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_web_sessions_atomic(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_web_sessions_atomic(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_refresh_session_issuance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cutoff timestamptz;
BEGIN
  SELECT tokens_revoked_at INTO cutoff FROM public.profiles WHERE id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='28000'; END IF;
  IF NEW.session_started_at IS NULL OR (cutoff IS NOT NULL AND NEW.session_started_at < cutoff) THEN
    RAISE EXCEPTION 'Session was revoked; sign in again' USING ERRCODE='28000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_refresh_session_issuance() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_refresh_session_issuance BEFORE INSERT ON public.refresh_tokens
FOR EACH ROW EXECUTE FUNCTION public.guard_refresh_session_issuance();
COMMIT;
