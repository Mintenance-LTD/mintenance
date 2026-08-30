-- Sync profiles.verified from auth.users.email_confirmed_at.
-- profiles.verified was only ever set by the web-only /auth/callback
-- route; mobile/auto-confirm paths left it false, blocking the
-- POST /api/jobs gate (verified AND phone_verified) for 5/6 homeowners.
-- One-way sync (false -> true) + backfill.

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET verified = true
  WHERE id = NEW.id
    AND verified IS DISTINCT FROM true;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_email_confirmed();

UPDATE public.profiles p
SET verified = true
FROM auth.users u
WHERE u.id = p.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.verified IS DISTINCT FROM true;;
