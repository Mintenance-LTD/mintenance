-- Property dependents retention safety net (2026-05-21)

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
;
