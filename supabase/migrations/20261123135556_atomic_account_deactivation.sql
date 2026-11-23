CREATE FUNCTION public.deactivate_account_and_revoke_sessions(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.profiles
  SET deleted_at=now(), updated_at=now(), email='deactivated-' || p_user_id || '@invalid.invalid'
  WHERE id=p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM public.revoke_web_sessions_atomic(p_user_id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.deactivate_account_and_revoke_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_account_and_revoke_sessions(uuid) TO service_role;

-- Serialize fresh issuance with deactivation on the same profile row.
CREATE OR REPLACE FUNCTION public.guard_refresh_session_issuance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cutoff timestamptz;
BEGIN
  SELECT tokens_revoked_at INTO cutoff FROM public.profiles
  WHERE id=NEW.user_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='28000'; END IF;
  IF NEW.session_started_at IS NULL OR (cutoff IS NOT NULL AND NEW.session_started_at < cutoff) THEN
    RAISE EXCEPTION 'Session was revoked; sign in again' USING ERRCODE='28000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_refresh_session_issuance() FROM PUBLIC, anon, authenticated, service_role;
