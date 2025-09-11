-- 006_secret_encryption.sql
-- Purpose: Harden storage of integration secrets using pgcrypto and restrict raw access.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Revoke direct SELECT of encrypted columns from authenticated (when table/columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_integrations'
      AND column_name IN ('api_key_encrypted','oauth_access_token_encrypted','oauth_refresh_token_encrypted')
  ) THEN
    REVOKE SELECT (api_key_encrypted, oauth_access_token_encrypted, oauth_refresh_token_encrypted)
    ON TABLE public.user_integrations FROM authenticated;
  END IF;
END $$;

-- Setter for secrets (encrypt)
CREATE OR REPLACE FUNCTION public.set_user_integration_secret(
  p_id UUID, p_kind TEXT, p_value TEXT, p_key TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_kind = 'api_key' THEN
    UPDATE public.user_integrations
      SET api_key_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id;
  ELSIF p_kind = 'access_token' THEN
    UPDATE public.user_integrations
      SET oauth_access_token_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id;
  ELSIF p_kind = 'refresh_token' THEN
    UPDATE public.user_integrations
      SET oauth_refresh_token_encrypted = pgp_sym_encrypt(p_value, p_key)
      WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unknown secret kind %', p_kind;
  END IF;
END $$;

-- Getter for secrets (decrypt), restricted to owner via auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_integration_secret(
  p_id UUID, p_kind TEXT, p_key TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
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

GRANT EXECUTE ON FUNCTION public.set_user_integration_secret(UUID,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_integration_secret(UUID,TEXT,TEXT) TO authenticated;

COMMIT;

