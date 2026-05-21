-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.
-- Original applied version of the credential_verifications table. A second
-- version (20260420000004) also ran with the same name; both tracker rows
-- are real. Schema unchanged because of IF NOT EXISTS / DROP IF EXISTS
-- guards in the second run.

CREATE TABLE IF NOT EXISTS public.credential_verifications (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  register              TEXT        NOT NULL CHECK (register IN ('gas_safe','niceic','trustmark','other')),
  registration_number   TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','verified','rejected','expired')),
  evidence_url          TEXT        NULL,
  evidence_path         TEXT        NULL,
  verified_at           TIMESTAMPTZ NULL,
  verified_by           UUID        NULL REFERENCES auth.users(id),
  expires_at            TIMESTAMPTZ NULL,
  rejected_reason       TEXT        NULL,
  raw_response          JSONB       NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_verifications_user
  ON public.credential_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_credential_verifications_register_status
  ON public.credential_verifications (register, status);
CREATE INDEX IF NOT EXISTS idx_credential_verifications_pending
  ON public.credential_verifications (created_at DESC)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS ux_credential_verifications_unique_active
  ON public.credential_verifications (user_id, register, registration_number)
  WHERE status IN ('pending','verified');

ALTER TABLE public.credential_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credential_verifications_select_own ON public.credential_verifications;
CREATE POLICY credential_verifications_select_own
  ON public.credential_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS credential_verifications_select_public ON public.credential_verifications;
CREATE POLICY credential_verifications_select_public
  ON public.credential_verifications
  FOR SELECT TO authenticated
  USING (status = 'verified');

DROP POLICY IF EXISTS credential_verifications_insert_own ON public.credential_verifications;
CREATE POLICY credential_verifications_insert_own
  ON public.credential_verifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS credential_verifications_service_role ON public.credential_verifications;
CREATE POLICY credential_verifications_service_role
  ON public.credential_verifications
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS credential_verifications_set_updated_at
  ON public.credential_verifications;
CREATE TRIGGER credential_verifications_set_updated_at
  BEFORE UPDATE ON public.credential_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
