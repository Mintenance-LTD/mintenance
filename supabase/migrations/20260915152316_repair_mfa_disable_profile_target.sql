BEGIN;
CREATE OR REPLACE FUNCTION public.disable_user_mfa(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  UPDATE public.profiles
  SET mfa_enabled=false, mfa_method=NULL, totp_secret=NULL, mfa_enrolled_at=NULL
  WHERE id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE='P0002'; END IF;
  DELETE FROM public.mfa_backup_codes WHERE user_id=p_user_id;
  DELETE FROM public.trusted_devices WHERE user_id=p_user_id;
  DELETE FROM public.mfa_pending_verifications WHERE user_id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.disable_user_mfa(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.disable_user_mfa(uuid) TO service_role;
COMMIT;
