-- Migration: Revoke anon/public grants on v_users view
-- Security fix: v_users was accessible to unauthenticated requests, exposing all user records.
-- This revokes all anon and public access, leaving only authenticated and service_role access.

-- Revoke all privileges from anon role
REVOKE ALL ON public.v_users FROM anon;

-- Revoke from PUBLIC role (catches any implicit grants)
REVOKE ALL ON public.v_users FROM PUBLIC;

-- Re-grant correct permissions
GRANT SELECT ON public.v_users TO authenticated;
GRANT ALL    ON public.v_users TO service_role;
