BEGIN;
CREATE TABLE public.password_change_revocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recover_after timestamptz NOT NULL DEFAULT clock_timestamp()+interval '2 minutes',
 completed_at timestamptz
);
CREATE UNIQUE INDEX password_change_one_pending ON public.password_change_revocations(user_id) WHERE completed_at IS NULL;
ALTER TABLE public.password_change_revocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_change_revocations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.begin_password_change(p_user_id uuid, p_expected_revoked_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE operation uuid; current_cutoff timestamptz;
BEGIN
 SELECT tokens_revoked_at INTO current_cutoff FROM public.profiles WHERE id=p_user_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='28000'; END IF;
 IF current_cutoff IS DISTINCT FROM p_expected_revoked_at THEN RAISE EXCEPTION 'Account session changed; verify again' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM public.password_change_revocations WHERE user_id=p_user_id AND completed_at IS NULL) THEN
  RAISE EXCEPTION 'Password change cleanup is pending' USING ERRCODE='55000';
 END IF;
 INSERT INTO public.password_change_revocations(user_id) VALUES(p_user_id) RETURNING id INTO operation;
 PERFORM public.revoke_web_sessions_atomic(p_user_id);
 RETURN operation;
END;
$$;
CREATE FUNCTION public.finish_password_change(p_operation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE actor uuid;
BEGIN
 SELECT user_id INTO actor FROM public.password_change_revocations WHERE id=p_operation_id;
 IF actor IS NULL THEN RAISE EXCEPTION 'Operation unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
 PERFORM 1 FROM public.password_change_revocations WHERE id=p_operation_id AND completed_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 PERFORM public.revoke_web_sessions_atomic(actor);
 UPDATE public.password_change_revocations SET completed_at=clock_timestamp() WHERE id=p_operation_id;
END;
$$;
CREATE FUNCTION public.recover_password_change_revocations() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE operation uuid; processed integer:=0;
BEGIN
 FOR operation IN SELECT id FROM public.password_change_revocations WHERE completed_at IS NULL AND recover_after<=clock_timestamp() ORDER BY created_at LIMIT 20 LOOP
  PERFORM public.finish_password_change(operation);
  processed:=processed+1;
 END LOOP;
 RETURN processed;
END;
$$;
REVOKE ALL ON FUNCTION public.begin_password_change(uuid,timestamptz), public.finish_password_change(uuid), public.recover_password_change_revocations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_password_change(uuid,timestamptz), public.finish_password_change(uuid), public.recover_password_change_revocations() TO service_role;
COMMIT;
