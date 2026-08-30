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
  'Structured provider result (criminal records, employment, licenses). Server-role only — never grant to clients.';;
