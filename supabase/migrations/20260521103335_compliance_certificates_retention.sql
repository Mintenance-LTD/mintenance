-- UK legal retention safety net for gas safety certs + EICRs (2026-05-21)
--
-- Background: UK landlords are legally required to retain gas safety
-- certificates for at least 2 years and EICRs for at least 5 years.
-- The current schema has compliance_certificates.property_id as a
-- NOT NULL FK with ON DELETE CASCADE — so a property hard-delete (the
-- platform's default delete behaviour) wipes the legally-mandated
-- retention records.
--
-- Fix: make property_id nullable and switch the FK to ON DELETE SET NULL,
-- so the cert row survives the property deletion. The cert can still be
-- looked up by contractor_id, document_url, dates, etc., and can be
-- restored to a new property record if needed.
--
-- Live row count verified zero on 2026-05-21, so making the column
-- nullable doesn't impact existing data.
--
-- NOT scoped here (kept separate per request): the same audit also
-- flagged property_tenants and anonymous_reports as having ON DELETE
-- CASCADE FKs on property_id. Those are independent privacy/legal
-- concerns and are tracked separately.

ALTER TABLE public.compliance_certificates
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_property_id_fkey;

ALTER TABLE public.compliance_certificates
  ADD CONSTRAINT compliance_certificates_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;
