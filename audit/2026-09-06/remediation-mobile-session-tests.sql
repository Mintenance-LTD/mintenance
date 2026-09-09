\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('fa060908-0000-4000-8000-000000000001','mobile-session@example.invalid','{}');
INSERT INTO auth.sessions(id,user_id,created_at,refreshed_at) VALUES ('fa060908-0000-4000-8000-000000000002','fa060908-0000-4000-8000-000000000001',now(),now() AT TIME ZONE 'UTC');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.verified_mobile_session_context('fa060908-0000-4000-8000-000000000001','fa060908-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint)) <> 1 THEN RAISE EXCEPTION 'Live session missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.verified_mobile_session_context('fa060908-0000-4000-8000-000000000099','fa060908-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint)) THEN RAISE EXCEPTION 'Cross-user session accepted'; END IF;
END $$;
UPDATE public.profiles SET tokens_revoked_at=now() WHERE id='fa060908-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.verified_mobile_session_context('fa060908-0000-4000-8000-000000000001','fa060908-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint-10)) THEN RAISE EXCEPTION 'Revoked token accepted'; END IF;
END $$;
DELETE FROM auth.sessions WHERE id='fa060908-0000-4000-8000-000000000002';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.verified_mobile_session_context('fa060908-0000-4000-8000-000000000001','fa060908-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint+1)) THEN RAISE EXCEPTION 'Deleted session accepted'; END IF;
END $$;
ROLLBACK;
