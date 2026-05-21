-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Fix 1: contractor_profiles has two SELECT policies; the permissive one (qual=true)
-- overrides the strict _select_own policy since PERMISSIVE policies OR together.
-- Drop the permissive one, keeping only the owner/admin-restricted policy.
DROP POLICY IF EXISTS contractor_profiles_select ON public.contractor_profiles;

-- Fix 2: companies.companies_select_public allowed ANY authenticated user to read
-- all company records (license_number, insurance_number). Restrict to owner + admin.
-- No app code calls .from('companies') directly, so this is safe to tighten.
DROP POLICY IF EXISTS companies_select_public ON public.companies;

CREATE POLICY companies_select_owner_or_admin ON public.companies
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

-- Note: profiles.SELECT cross-tenant leak NOT fixed here.
-- Tightening it safely requires a public_profiles view + refactor of 20+ query sites
-- (ContractorMatching, MessageFetcher, ExploreMap, etc.) that read cross-user data.
-- Deferred pending architecture decision.
