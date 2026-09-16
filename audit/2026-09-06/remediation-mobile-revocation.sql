\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('fa390906-0000-4000-8000-000000000001','audit-mobile-revocation@example.invalid','{}');
INSERT INTO auth.sessions(id,user_id,created_at,refreshed_at) VALUES('fa390906-0000-4000-8000-000000000002','fa390906-0000-4000-8000-000000000001',now()-interval '1 hour',now() AT TIME ZONE 'UTC');
UPDATE public.profiles SET tokens_revoked_at=now()-interval '1 minute' WHERE id='fa390906-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.verified_mobile_session_context('fa390906-0000-4000-8000-000000000001','fa390906-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint)) THEN RAISE EXCEPTION 'Refreshed old session bypassed revocation'; END IF;
END $$;
RESET ROLE;
-- Fresh login within the same second as the cutoff: JWT iat loses fractions,
-- but the authoritative session creation time proves it is new.
UPDATE public.profiles SET tokens_revoked_at=date_trunc('second',now())+interval '0.1 seconds' WHERE id='fa390906-0000-4000-8000-000000000001';
UPDATE auth.sessions SET created_at=date_trunc('second',now())+interval '0.2 seconds' WHERE id='fa390906-0000-4000-8000-000000000002';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.verified_mobile_session_context('fa390906-0000-4000-8000-000000000001','fa390906-0000-4000-8000-000000000002',floor(extract(epoch FROM now()))::bigint))<>1 THEN RAISE EXCEPTION 'Fresh same-second login rejected'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET deleted_at=now() WHERE id='fa390906-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.verified_mobile_session_context('fa390906-0000-4000-8000-000000000001','fa390906-0000-4000-8000-000000000002',extract(epoch FROM now())::bigint+1)) THEN RAISE EXCEPTION 'Deleted account accepted'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
