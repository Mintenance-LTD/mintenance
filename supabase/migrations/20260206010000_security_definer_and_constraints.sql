-- Migration: SECURITY DEFINER search_path hardening + missing constraints
-- Date: 2026-02-06

BEGIN;

-- Retention helpers (add search_path)
CREATE OR REPLACE FUNCTION public.purge_old_email_history(p_days INT DEFAULT 180)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - make_interval(days => p_days);
BEGIN
  IF to_regclass('public.email_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.email_history WHERE sent_at < $1' USING cutoff;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_quote_interactions(p_days INT DEFAULT 180)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - make_interval(days => p_days);
BEGIN
  IF to_regclass('public.quote_interactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.quote_interactions WHERE created_at < $1' USING cutoff;
  END IF;
END;
$$;

-- Secret encryption helpers (add search_path + ownership check)
CREATE OR REPLACE FUNCTION public.set_user_integration_secret(
  p_id UUID, p_kind TEXT, p_value TEXT, p_key TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_integrations
      WHERE id = p_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized integration access';
    END IF;
  END IF;

  IF p_kind = 'api_key' THEN
    UPDATE public.user_integrations
      SET api_key_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id
        AND (auth.role() = 'service_role' OR user_id = auth.uid());
  ELSIF p_kind = 'access_token' THEN
    UPDATE public.user_integrations
      SET oauth_access_token_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id
        AND (auth.role() = 'service_role' OR user_id = auth.uid());
  ELSIF p_kind = 'refresh_token' THEN
    UPDATE public.user_integrations
      SET oauth_refresh_token_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id
        AND (auth.role() = 'service_role' OR user_id = auth.uid());
  ELSE
    RAISE EXCEPTION 'Unknown secret kind %', p_kind;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_integration_secret(
  p_id UUID, p_kind TEXT, p_key TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v TEXT;
BEGIN
  IF p_kind = 'api_key' THEN
    SELECT pgp_sym_decrypt(api_key_encrypted::bytea, p_key) INTO v
    FROM public.user_integrations WHERE id = p_id AND user_id = auth.uid();
  ELSIF p_kind = 'access_token' THEN
    SELECT pgp_sym_decrypt(oauth_access_token_encrypted::bytea, p_key) INTO v
    FROM public.user_integrations WHERE id = p_id AND user_id = auth.uid();
  ELSIF p_kind = 'refresh_token' THEN
    SELECT pgp_sym_decrypt(oauth_refresh_token_encrypted::bytea, p_key) INTO v
    FROM public.user_integrations WHERE id = p_id AND user_id = auth.uid();
  ELSE
    RAISE EXCEPTION 'Unknown secret kind %', p_kind;
  END IF;
  RETURN v;
END $$;

-- Meeting system status update (add search_path)
CREATE OR REPLACE FUNCTION public.create_meeting_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.meeting_updates (
      meeting_id,
      update_type,
      message,
      updated_by,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'status_change',
      format('Meeting status changed from %s to %s', OLD.status, NEW.status),
      auth.uid(),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Missing constraints
DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.jobs ALTER COLUMN homeowner_id SET NOT NULL';
  END IF;

  IF to_regclass('public.bids') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bids ALTER COLUMN job_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.bids ALTER COLUMN contractor_id SET NOT NULL';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bids_amount_positive') THEN
      EXECUTE 'ALTER TABLE public.bids ADD CONSTRAINT bids_amount_positive CHECK (amount > 0)';
    END IF;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.payments ALTER COLUMN payer_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.payments ALTER COLUMN payee_id SET NOT NULL';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_positive') THEN
      EXECUTE 'ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0)';
    END IF;
  END IF;

  IF to_regclass('public.companies') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.companies ALTER COLUMN owner_id SET NOT NULL';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_rating_range') THEN
      EXECUTE 'ALTER TABLE public.companies ADD CONSTRAINT companies_rating_range CHECK (rating >= 0 AND rating <= 5)';
    END IF;
  END IF;
END $$;

COMMIT;
