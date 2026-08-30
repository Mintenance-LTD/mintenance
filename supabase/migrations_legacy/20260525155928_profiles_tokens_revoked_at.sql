-- 2026-05-26 audit-56 P0: durable per-user token revocation timestamp.
-- The in-memory token blacklist doesn't survive Vercel serverless cold
-- starts / horizontal scaling: a logout POST writes the blacklisted
-- token to lambda instance A's in-memory Set; the very next request
-- can land on instance B with an empty Set, and the access JWT
-- continues to validate until natural expiry (~1 hour). This column
-- is read on every verifyToken() to compare against the JWT's `iat`
-- claim — any token issued BEFORE this timestamp is rejected. Single
-- profile lookup by PK is cheap and the column is bumped only on
-- logout / password change / account compromise.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tokens_revoked_at timestamptz;

-- Index isn't needed (always read with id=PK lookup) but adding a
-- COMMENT documents the contract for future readers.
COMMENT ON COLUMN public.profiles.tokens_revoked_at IS
  'When set, every access JWT issued before this timestamp is invalid. Bumped on logout, password reset, and admin-driven revocation. Compared against JWT iat (in milliseconds) inside verifyToken().';;
