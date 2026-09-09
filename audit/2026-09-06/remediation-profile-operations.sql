\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060907-0000-4000-8000-000000000001','remediation-owner@example.invalid','{}'),
 ('fa060907-0000-4000-8000-000000000002','remediation-other@example.invalid','{}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','fa060907-0000-4000-8000-000000000001',true) IS NOT NULL AS synthetic_owner_context;
UPDATE public.profiles SET first_name='Allowed edit' WHERE id='fa060907-0000-4000-8000-000000000001';
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET role='admin' WHERE id='fa060907-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Role escalation was not denied';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET verified=true WHERE id='fa060907-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Verification forgery was not denied';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.profiles SET first_name='Forbidden edit' WHERE id='fa060907-0000-4000-8000-000000000002';
  IF FOUND THEN RAISE EXCEPTION 'Cross-user profile write succeeded'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.delete_user_data('fa060907-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Anonymous deletion RPC was not denied';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='fa060907-0000-4000-8000-000000000001' AND first_name='Allowed edit' AND role='homeowner') THEN
    RAISE EXCEPTION 'Profile state invariant failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id='fa060907-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Unrelated account was deleted';
  END IF;
END $$;
ROLLBACK;
