-- Sync profiles.verified from auth.users.email_confirmed_at.
--
-- 2026-07-26 audit: profiles.verified was only ever set by the web-only
-- /auth/callback route, so users who confirmed their email through any
-- other path (mobile deep link, Supabase auto-confirm) stayed
-- verified=false forever. The POST /api/jobs gate requires
-- profiles.verified AND profiles.phone_verified, so 5 of 6 live
-- homeowners were silently blocked from posting jobs — and the 403
-- misleadingly blamed phone verification.
--
-- Fix: DB-level one-way sync (false -> true on email confirmation) so
-- every client is covered, plus a backfill for the 7 already-confirmed
-- but unsynced live users. One-way on purpose: email re-confirmation
-- windows (address change) briefly null email_confirmed_at, and
-- demoting verified there would re-block posting for users who already
-- proved an inbox once.

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

-- Trigger functions returning `trigger` cannot be called via RPC, but
-- revoke anyway for consistency with the S5 anon-EXECUTE lockdown.
REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_email_confirmed();

-- Backfill everyone whose email is already confirmed in auth.
UPDATE public.profiles p
SET verified = true
FROM auth.users u
WHERE u.id = p.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.verified IS DISTINCT FROM true;
