-- =====================================================
-- Migration: Add Atomic Token Rotation Function
-- Date: 2025-10-22
-- Purpose: Fix race condition in refresh token rotation
-- =====================================================

-- This function provides atomic token rotation with row-level locking
-- to prevent concurrent requests from creating multiple valid tokens.

CREATE OR REPLACE FUNCTION public.rotate_refresh_token(
  p_user_id uuid,
  p_token_hash text
)
RETURNS TABLE (
  user_email text,
  user_role text,
  token_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
  v_user_email text;
  v_user_role text;
BEGIN
  -- Lock and revoke token atomically using SELECT FOR UPDATE
  -- This prevents race conditions when two requests try to rotate simultaneously
  UPDATE public.refresh_tokens
  SET
    revoked_at = NOW(),
    revoked_reason = 'rotated',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND token_hash = p_token_hash
    AND revoked_at IS NULL
    AND expires_at > NOW()
  RETURNING id INTO v_token_id;

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

  -- Return user details and token ID for audit purposes
  RETURN QUERY
  SELECT v_user_email, v_user_role, v_token_id;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.rotate_refresh_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_refresh_token(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_refresh_token(uuid, text) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.rotate_refresh_token(uuid, text) IS
'Atomically rotates a refresh token with row-level locking to prevent race conditions. Returns user details for creating new token pair.';
