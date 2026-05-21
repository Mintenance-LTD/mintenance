-- Property dependents — retention safety net (2026-05-21)
--
-- Follow-up to 20260521000003_compliance_certificates_retention.sql.
-- Same shape, different tables.
--
-- property_tenants and anonymous_reports both had property_id as a
-- NOT NULL FK with ON DELETE CASCADE. A property hard-delete (the
-- platform's default delete behaviour) wipes:
--   - tenant occupancy history (UK landlords typically need to retain
--     for tax / disputes / GDPR access requests for 6 years post-end
--     of tenancy under the Limitation Act + HMRC rules)
--   - anonymous safety reports (intended to be retained even if the
--     reporter or the property record is removed; they may be evidence
--     in a regulatory investigation)
--
-- Switching to ON DELETE SET NULL lets the dependent row survive the
-- property deletion. The row can still be looked up via other fields
-- (tenant_id, report content, dates) and re-linked manually if needed.
--
-- Live row counts on 2026-05-21:
--   property_tenants: 2 rows (all linked — no migration of existing data)
--   anonymous_reports: 0 rows

ALTER TABLE public.property_tenants
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.property_tenants
  DROP CONSTRAINT IF EXISTS property_tenants_property_id_fkey;

ALTER TABLE public.property_tenants
  ADD CONSTRAINT property_tenants_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;

ALTER TABLE public.anonymous_reports
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.anonymous_reports
  DROP CONSTRAINT IF EXISTS anonymous_reports_property_id_fkey;

ALTER TABLE public.anonymous_reports
  ADD CONSTRAINT anonymous_reports_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;
