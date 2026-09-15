\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('fa410906-0000-4000-8000-000000000001','audit-password@example.invalid','{}');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.begin_password_change('fa410906-0000-4000-8000-000000000001',NULL); RAISE EXCEPTION 'Client starts privileged password operation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.password_change_revocations; RAISE EXCEPTION 'Client reads password operations'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
CREATE TEMP TABLE operation_id AS SELECT public.begin_password_change('fa410906-0000-4000-8000-000000000001',NULL) AS id;
DO $$ BEGIN
 BEGIN PERFORM public.begin_password_change('fa410906-0000-4000-8000-000000000001',NULL); RAISE EXCEPTION 'Stale proof accepted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;
-- A login raced between initial cutoff and provider confirmation.
INSERT INTO public.refresh_tokens(user_id,token_hash,expires_at,session_started_at) VALUES('fa410906-0000-4000-8000-000000000001','synthetic-password-race',clock_timestamp()+interval '1 day',clock_timestamp());
CREATE FUNCTION pg_temp.fail_password_finish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic finish failure'; END $$;
CREATE TRIGGER audit_fail_password_finish BEFORE UPDATE ON public.password_change_revocations FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_password_finish();
DO $$ BEGIN
 BEGIN PERFORM public.finish_password_change((SELECT id FROM operation_id)); RAISE EXCEPTION 'Expected finish failure'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic finish failure' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.password_change_revocations WHERE completed_at IS NOT NULL) THEN RAISE EXCEPTION 'Lost pending journal'; END IF;
END $$;
DROP TRIGGER audit_fail_password_finish ON public.password_change_revocations;
UPDATE public.password_change_revocations SET recover_after=now()-interval '1 second';
SELECT public.recover_password_change_revocations();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.password_change_revocations WHERE completed_at IS NULL) THEN RAISE EXCEPTION 'Recovery unfinished'; END IF;
 IF EXISTS(SELECT 1 FROM public.refresh_tokens WHERE token_hash='synthetic-password-race' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Race token survived'; END IF;
END $$;
-- Completed-operation replay must not revoke a subsequent fresh login.
INSERT INTO public.refresh_tokens(user_id,token_hash,expires_at,session_started_at) VALUES('fa410906-0000-4000-8000-000000000001','synthetic-after-finish',clock_timestamp()+interval '1 day',clock_timestamp());
SELECT public.finish_password_change((SELECT id FROM operation_id));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.refresh_tokens WHERE token_hash='synthetic-after-finish' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Replay revoked new session'; END IF;
END $$;
ROLLBACK;
