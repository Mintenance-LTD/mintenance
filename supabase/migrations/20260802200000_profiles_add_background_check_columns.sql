-- profiles: add the background-check columns BackgroundCheckService was
-- always written against but which were never migrated.
--
-- Same partial-migration disease as the MFA columns (20260802190000):
-- `background_check_status` landed on profiles, but the four sibling
-- columns the service reads AND writes never did, so every status
-- update after check initiation failed and the whole flow was inert.
--
-- Types follow the service's usage (BackgroundCheckService.ts):
--   provider      — 'checkr' | 'onfido' | ... (free text, service-validated)
--   id            — the provider's check id (their format, opaque text)
--   completed_at  — stamped when a terminal webhook/status arrives
--   result        — BackgroundCheckResultData structured object → jsonb
--
-- Client access: NONE. profiles is column-grant locked (20260508100543),
-- so new columns are invisible to authenticated/anon by default; the
-- REVOKEs are belt-and-braces. All access is server-role via
-- /api/contractor/background-check. Criminal-record data especially must
-- never be client-readable.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background_check_provider text,
  ADD COLUMN IF NOT EXISTS background_check_id text,
  ADD COLUMN IF NOT EXISTS background_check_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS background_check_result jsonb;

REVOKE SELECT (background_check_provider), UPDATE (background_check_provider), INSERT (background_check_provider)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (background_check_id), UPDATE (background_check_id), INSERT (background_check_id)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (background_check_completed_at), UPDATE (background_check_completed_at), INSERT (background_check_completed_at)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (background_check_result), UPDATE (background_check_result), INSERT (background_check_result)
  ON public.profiles FROM authenticated, anon;

COMMENT ON COLUMN public.profiles.background_check_result IS
  'Structured provider result (criminal records, employment, licenses). Server-role only — never grant to clients.';
