\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('fa370906-0000-4000-8000-000000000001','audit-mfa@example.invalid','{}');
UPDATE public.profiles SET mfa_enabled=true,mfa_method='totp',totp_secret='synthetic',mfa_enrolled_at=now() WHERE id='fa370906-0000-4000-8000-000000000001';
INSERT INTO public.mfa_backup_codes(user_id,code_hash) VALUES('fa370906-0000-4000-8000-000000000001','synthetic-hash');
INSERT INTO public.trusted_devices(user_id,device_token,expires_at) VALUES('fa370906-0000-4000-8000-000000000001','synthetic-device',now()+interval '1 day');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.disable_user_mfa('fa370906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Client bypassed password-verifying API';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
CREATE FUNCTION pg_temp.fail_mfa_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic cleanup failure'; END $$;
CREATE TRIGGER audit_fail_mfa_cleanup BEFORE DELETE ON public.mfa_backup_codes FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_mfa_cleanup();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.disable_user_mfa('fa370906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Expected cleanup failure';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'synthetic cleanup failure' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT (SELECT mfa_enabled FROM public.profiles WHERE id='fa370906-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Partial disable escaped rollback'; END IF;
END $$;
DROP TRIGGER audit_fail_mfa_cleanup ON public.mfa_backup_codes;
SET LOCAL ROLE service_role;
SELECT public.disable_user_mfa('fa370906-0000-4000-8000-000000000001');
DO $$ BEGIN
 BEGIN
  PERFORM public.disable_user_mfa('fa370906-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'Missing account reported success';
 EXCEPTION WHEN no_data_found THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='fa370906-0000-4000-8000-000000000001' AND (mfa_enabled OR mfa_method IS NOT NULL OR totp_secret IS NOT NULL OR mfa_enrolled_at IS NOT NULL)) THEN RAISE EXCEPTION 'MFA fields retained'; END IF;
 IF EXISTS(SELECT 1 FROM public.mfa_backup_codes WHERE user_id='fa370906-0000-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.trusted_devices WHERE user_id='fa370906-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Recovery records retained'; END IF;
END $$;
ROLLBACK;
