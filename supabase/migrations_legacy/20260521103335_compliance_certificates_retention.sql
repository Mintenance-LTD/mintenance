-- UK legal retention safety net for gas safety certs + EICRs (2026-05-21)

ALTER TABLE public.compliance_certificates
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_property_id_fkey;

ALTER TABLE public.compliance_certificates
  ADD CONSTRAINT compliance_certificates_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;
;
