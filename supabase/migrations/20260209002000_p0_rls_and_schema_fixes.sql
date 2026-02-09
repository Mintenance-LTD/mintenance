-- =====================================================================
-- P0/P1 RLS and Schema Fixes
-- =====================================================================
-- Fixes critical security vulnerabilities identified in code review:
--   P0-1: password_history, password_reset_tokens, login_attempts have USING(true)
--   P0-2: domain_configs, jobs_photos have no RLS
--   P0-3: invoice_payments, checkout_sessions, refunds have RLS but no policies
--   P0-5: rotate_refresh_token references dropped users table
--   P0-6: jobs.contractor_id column missing
--   P1-11: SECURITY DEFINER functions lack search_path
--   P1-20: Missing GIN index on message_threads.participant_ids
-- =====================================================================

-- ============================================================
-- P0-1: Fix auth table RLS (restrict to service_role only)
-- ============================================================

-- password_reset_tokens: Drop overly permissive policy, add service_role-only
DROP POLICY IF EXISTS password_reset_tokens_service ON public.password_reset_tokens;
CREATE POLICY password_reset_tokens_service_role
  ON public.password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- password_history: Drop overly permissive policy, add service_role-only
DROP POLICY IF EXISTS password_history_service ON public.password_history;
CREATE POLICY password_history_service_role
  ON public.password_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- login_attempts: Drop overly permissive policy, add service_role-only
DROP POLICY IF EXISTS login_attempts_service ON public.login_attempts;
CREATE POLICY login_attempts_service_role
  ON public.login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- P0-2: Enable RLS on domain_configs and jobs_photos
-- ============================================================

-- domain_configs: AI config data, service_role write + authenticated read
ALTER TABLE IF EXISTS public.domain_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS domain_configs_service_role ON public.domain_configs;
CREATE POLICY domain_configs_service_role
  ON public.domain_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS domain_configs_read ON public.domain_configs;
CREATE POLICY domain_configs_read
  ON public.domain_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- jobs_photos: Enable RLS with proper access control
ALTER TABLE IF EXISTS public.jobs_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_photos_service_role ON public.jobs_photos;
CREATE POLICY jobs_photos_service_role
  ON public.jobs_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view photos for jobs they own or are assigned to
DROP POLICY IF EXISTS jobs_photos_read ON public.jobs_photos;
CREATE POLICY jobs_photos_read
  ON public.jobs_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.bids b ON b.job_id = j.id
      WHERE j.id = job_id AND b.contractor_id = auth.uid()
    )
  );

-- Homeowners can insert photos for their own jobs
DROP POLICY IF EXISTS jobs_photos_insert ON public.jobs_photos;
CREATE POLICY jobs_photos_insert
  ON public.jobs_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND j.homeowner_id = auth.uid()
    )
  );

-- ============================================================
-- P0-3: Add policies for invoice_payments, checkout_sessions, refunds
-- ============================================================

-- invoice_payments: service_role full access + contractors read own
DROP POLICY IF EXISTS invoice_payments_service_role ON public.invoice_payments;
CREATE POLICY invoice_payments_service_role
  ON public.invoice_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS invoice_payments_contractor_read ON public.invoice_payments;
CREATE POLICY invoice_payments_contractor_read
  ON public.invoice_payments
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- checkout_sessions: service_role only (internal tracking)
DROP POLICY IF EXISTS checkout_sessions_service_role ON public.checkout_sessions;
CREATE POLICY checkout_sessions_service_role
  ON public.checkout_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- refunds: service_role full access + users read own job refunds
DROP POLICY IF EXISTS refunds_service_role ON public.refunds;
CREATE POLICY refunds_service_role
  ON public.refunds
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS refunds_user_read ON public.refunds;
CREATE POLICY refunds_user_read
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
    )
  );

-- ============================================================
-- P0-6: Add contractor_id column to jobs table
-- ============================================================
-- Multiple API routes query jobs.contractor_id. The column is needed
-- to track which contractor is assigned to a job (after bid acceptance).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.jobs
      ADD COLUMN contractor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

    CREATE INDEX idx_jobs_contractor_id ON public.jobs(contractor_id);
  END IF;
END $$;

-- ============================================================
-- P0-5: Fix rotate_refresh_token to use profiles (not users)
-- ============================================================

-- Drop existing function first (return type changed, CREATE OR REPLACE cannot alter it)
DROP FUNCTION IF EXISTS rotate_refresh_token(UUID, TEXT);

CREATE OR REPLACE FUNCTION rotate_refresh_token(
  p_user_id UUID,
  p_token_hash TEXT
)
RETURNS TABLE (
  user_email TEXT,
  user_role TEXT,
  family_id UUID,
  next_generation INTEGER,
  session_started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ
) AS $$
DECLARE
  v_old_token RECORD;
  v_next_gen INTEGER;
BEGIN
  -- Get old token details with row-level lock (prevents concurrent rotations)
  -- Fixed: JOIN profiles instead of dropped users table
  SELECT rt.*, p.email, p.role
  INTO v_old_token
  FROM refresh_tokens rt
  JOIN profiles p ON p.id = rt.user_id
  WHERE rt.token_hash = p_token_hash
    AND rt.user_id = p_user_id
    AND rt.revoked_at IS NULL
    AND rt.expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check for token reuse (breach detection)
  IF v_old_token.consumed_at IS NOT NULL THEN
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE family_id = v_old_token.family_id
      AND revoked_at IS NULL;

    RAISE EXCEPTION 'Token reuse detected - security breach';
  END IF;

  -- Mark old token as consumed
  UPDATE refresh_tokens
  SET consumed_at = NOW()
  WHERE token_hash = p_token_hash;

  v_next_gen := COALESCE(v_old_token.generation, 0) + 1;

  user_email := v_old_token.email;
  user_role := v_old_token.role;
  family_id := v_old_token.family_id;
  next_generation := v_next_gen;
  session_started_at := v_old_token.session_started_at;
  last_activity_at := v_old_token.last_activity_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- P1-11: Add search_path to SECURITY DEFINER functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_failed_login(
  attempt_user_id UUID,
  attempt_email TEXT,
  attempt_ip TEXT,
  attempt_user_agent TEXT,
  attempt_failure_reason TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (user_id, email, ip_address, user_agent, success, failure_reason)
  VALUES (attempt_user_id, attempt_email, attempt_ip, attempt_user_agent, false, attempt_failure_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.record_successful_login(
  login_user_id UUID,
  login_email TEXT,
  login_ip TEXT,
  login_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (user_id, email, ip_address, user_agent, success)
  VALUES (login_user_id, login_email, login_ip, login_user_agent, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_account_locked(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE user_id = check_user_id
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.add_password_to_history(
  history_user_id UUID,
  new_password_hash TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (history_user_id, new_password_hash);
  DELETE FROM public.password_history
  WHERE user_id = history_user_id
    AND id NOT IN (
      SELECT id FROM public.password_history
      WHERE user_id = history_user_id
      ORDER BY created_at DESC
      LIMIT 5
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'homeowner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- P1-20: Add GIN index on message_threads.participant_ids
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_message_threads_participant_ids_gin
  ON public.message_threads USING GIN (participant_ids);
