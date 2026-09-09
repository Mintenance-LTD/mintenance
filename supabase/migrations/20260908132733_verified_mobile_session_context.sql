-- Called only after Supabase Auth verifies the supplied access token.
-- Session existence and profile revocation make logout/deletion fail closed.
CREATE FUNCTION public.verified_mobile_session_context(p_user_id uuid, p_session_id uuid, p_issued_at bigint)
RETURNS TABLE(profile_role text, first_name text, last_name text, session_start_ms numeric, last_activity_ms numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT p.role, p.first_name, p.last_name,
    extract(epoch FROM s.created_at)*1000,
    extract(epoch FROM coalesce(s.refreshed_at AT TIME ZONE 'UTC',s.created_at))*1000
  FROM auth.sessions s JOIN public.profiles p ON p.id=s.user_id
  WHERE s.id=p_session_id AND s.user_id=p_user_id
    AND (s.not_after IS NULL OR s.not_after>now())
    AND (p.tokens_revoked_at IS NULL OR to_timestamp(p_issued_at)>=p.tokens_revoked_at)
    AND p.role IN ('homeowner','contractor','admin');
$$;
REVOKE ALL ON FUNCTION public.verified_mobile_session_context(uuid,uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verified_mobile_session_context(uuid,uuid,bigint) TO service_role;
