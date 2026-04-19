-- Audit 2026-04-16 P2 #15: three public buckets (avatars, contractor-portfolio,
-- profile-images) have broad "Anyone can view X" SELECT policies on
-- storage.objects that allow unauthenticated clients to LIST every file.
-- Public object URLs do NOT need this — Supabase's storage CDN serves objects
-- in public buckets without consulting RLS. The broad SELECT only exposes
-- filenames and metadata via the .list() SDK call.
--
-- Flagged by advisor `public_bucket_allows_listing`. Removing the policies
-- preserves direct URL access (CDN path) while blocking enumeration.

BEGIN;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contractor portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;

COMMIT;
