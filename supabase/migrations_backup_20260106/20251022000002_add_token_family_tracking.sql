-- =====================================================
-- Migration: Add Token Family Tracking
-- Date: 2025-10-22
-- Purpose: Detect stolen refresh tokens via family tracking (RFC 6749 Section 10.4)
-- =====================================================

-- Add family tracking columns to refresh_tokens table
-- family_id: Groups tokens in the same rotation chain
-- generation: Tracks token version within a family (increments on rotation)

DO $$
BEGIN
  -- Add family_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'refresh_tokens'
      AND column_name = 'family_id'
  ) THEN
    ALTER TABLE public.refresh_tokens
    ADD COLUMN family_id uuid NOT NULL DEFAULT gen_random_uuid();

    -- Create index for efficient family lookups
    CREATE INDEX idx_refresh_tokens_family_id ON public.refresh_tokens(family_id);

    RAISE NOTICE 'Added family_id column to refresh_tokens table';
  END IF;

  -- Add generation column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'refresh_tokens'
      AND column_name = 'generation'
  ) THEN
    ALTER TABLE public.refresh_tokens
    ADD COLUMN generation integer NOT NULL DEFAULT 1;

    RAISE NOTICE 'Added generation column to refresh_tokens table';
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.refresh_tokens.family_id IS
'Groups tokens in the same rotation chain. Used to detect token theft.';

COMMENT ON COLUMN public.refresh_tokens.generation IS
'Token version within a family. Increments on each rotation.';

-- =====================================================
-- Token Family Breach Detection Function
-- =====================================================

-- This function checks if a token belongs to a family with revoked tokens
-- If so, it indicates a potential security breach (reuse of old token)

CREATE OR REPLACE FUNCTION public.check_token_family_breach(
  p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
  v_token_revoked_at timestamptz;
  v_has_revoked_siblings boolean;
BEGIN
  -- Get family_id and revocation status for the token
  SELECT family_id, revoked_at
  INTO v_family_id, v_token_revoked_at
  FROM public.refresh_tokens
  WHERE token_hash = p_token_hash;

  -- If token not found, return false (no breach, just invalid token)
  IF v_family_id IS NULL THEN
    RETURN false;
  END IF;

  -- If token itself is already revoked, check if family has other revoked tokens
  -- This indicates potential reuse of an old token (security breach)
  IF v_token_revoked_at IS NOT NULL THEN
    -- Check if there are other revoked tokens in this family
    SELECT EXISTS (
      SELECT 1
      FROM public.refresh_tokens
      WHERE family_id = v_family_id
        AND revoked_at IS NOT NULL
        AND revoked_reason = 'rotated'
        AND token_hash != p_token_hash
    ) INTO v_has_revoked_siblings;

    IF v_has_revoked_siblings THEN
      -- SECURITY BREACH DETECTED: Old token reused
      -- Revoke ALL tokens in this family
      UPDATE public.refresh_tokens
      SET
        revoked_at = NOW(),
        revoked_reason = 'breach_detected',
        updated_at = NOW()
      WHERE family_id = v_family_id
        AND revoked_at IS NULL;

      -- Log the security breach
      RAISE WARNING 'Security breach detected: Token family % has reused token', v_family_id;

      RETURN true; -- Breach detected
    END IF;
  END IF;

  RETURN false; -- No breach detected
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.check_token_family_breach(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_token_family_breach(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_token_family_breach(text) TO service_role;

COMMENT ON FUNCTION public.check_token_family_breach(text) IS
'Detects security breaches by checking if a token family has been reused. Returns true if breach detected and revokes all tokens in family.';

-- =====================================================
-- Update Token Rotation Function to Support Families
-- =====================================================

-- Enhanced version that preserves family_id across rotations

CREATE OR REPLACE FUNCTION public.rotate_refresh_token(
  p_user_id uuid,
  p_token_hash text
)
RETURNS TABLE (
  user_email text,
  user_role text,
  token_id uuid,
  family_id uuid,
  next_generation integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
  v_user_email text;
  v_user_role text;
  v_family_id uuid;
  v_current_generation integer;
  v_breach_detected boolean;
BEGIN
  -- First, check for security breach
  SELECT public.check_token_family_breach(p_token_hash) INTO v_breach_detected;

  IF v_breach_detected THEN
    RAISE EXCEPTION 'Security breach detected: Token reuse in family. All tokens revoked.';
  END IF;

  -- Lock and revoke token atomically
  UPDATE public.refresh_tokens
  SET
    revoked_at = NOW(),
    revoked_reason = 'rotated',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND token_hash = p_token_hash
    AND revoked_at IS NULL
    AND expires_at > NOW()
  RETURNING id, family_id, generation
  INTO v_token_id, v_family_id, v_current_generation;

  -- If no token was found or updated, raise an exception
  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'Invalid refresh token: token not found, already revoked, or expired';
  END IF;

  -- Get user details for creating new token
  SELECT email, role
  INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  -- If user not found, raise exception
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found for id: %', p_user_id;
  END IF;

  -- Return user details, token ID, family_id, and next generation number
  RETURN QUERY
  SELECT
    v_user_email,
    v_user_role,
    v_token_id,
    v_family_id,
    v_current_generation + 1;
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.rotate_refresh_token(uuid, text) IS
'Atomically rotates a refresh token with family tracking. Detects breaches via token reuse and preserves family_id across rotations.';

-- =====================================================
-- Backfill existing tokens with family_id
-- =====================================================

-- Set unique family_id for each existing active token
-- This ensures all tokens start in their own family
UPDATE public.refresh_tokens
SET family_id = gen_random_uuid()
WHERE family_id IS NULL OR family_id = '00000000-0000-0000-0000-000000000000';

RAISE NOTICE 'Token family tracking migration completed successfully';
