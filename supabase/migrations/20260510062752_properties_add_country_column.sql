-- Adds the missing `country` column to public.properties.
--
-- App code at apps/web/app/api/properties/route.ts (line 79 SELECT,
-- line 214 INSERT) and apps/web/app/api/properties/[id]/route.ts
-- (line 97 UPDATE) all assume this column exists, and the
-- create-property form on both web + mobile sends a `country` field
-- in the request body. The original schema migration just never
-- added the column.
--
-- Symptom in prod 2026-05-10: GET /api/properties returned 500 with
-- PG error 42703 "column properties.country does not exist", which
-- broke the homeowner job-posting flow (Quick Job + full /jobs/create
-- both rely on the property fetch).
--
-- Nullable text — UI already defaults to "UK" on display (see
-- ProfileHeader.tsx and dashboard-enhanced/page.tsx where
-- `contractor.country || 'UK'` is the pattern). Same shape as the
-- existing `city`, `postcode` columns.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS country TEXT NULL;

COMMENT ON COLUMN public.properties.country IS
  'Country name or ISO code. Nullable; UI defaults to "UK" when empty. Added 2026-05-10 to fix 42703 errors on GET /api/properties.';
