\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('fa380906-0000-4000-8000-000000000001','audit-session@example.invalid','{}');
INSERT INTO public.refresh_tokens(user_id,token_hash,expires_at,session_started_at) VALUES('fa380906-0000-4000-8000-000000000001','synthetic-before-revoke',now()+interval '1 day',now()-interval '1 hour');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.revoke_web_sessions_atomic('fa380906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Client can revoke another account';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
CREATE FUNCTION pg_temp.fail_token_revocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic revocation failure'; END $$;
CREATE TRIGGER audit_fail_revocation BEFORE UPDATE ON public.refresh_tokens FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_token_revocation();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.revoke_web_sessions_atomic('fa380906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Expected failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'synthetic revocation failure' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT tokens_revoked_at IS NOT NULL FROM public.profiles WHERE id='fa380906-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Partial cutoff escaped rollback'; END IF;
END $$;
DROP TRIGGER audit_fail_revocation ON public.refresh_tokens;
SET LOCAL ROLE service_role;
SELECT public.revoke_web_sessions_atomic('fa380906-0000-4000-8000-000000000001');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.refresh_tokens(user_id,token_hash,expires_at,session_started_at) VALUES('fa380906-0000-4000-8000-000000000001','synthetic-late-rotation',now()+interval '1 day',now()-interval '1 hour');
  RAISE EXCEPTION 'Late rotation revived revoked session';
 EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
END $$;
INSERT INTO public.refresh_tokens(user_id,token_hash,expires_at,session_started_at) VALUES('fa380906-0000-4000-8000-000000000001','synthetic-fresh-login',clock_timestamp()+interval '1 day',clock_timestamp());
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.refresh_tokens WHERE token_hash='synthetic-before-revoke' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Existing token survived'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.refresh_tokens WHERE token_hash='synthetic-fresh-login' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Fresh login rejected'; END IF;
END $$;
ROLLBACK;
