ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_property_id_cert_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS compliance_certs_property_type_no_room_uniq
  ON public.compliance_certificates(property_id, cert_type)
  WHERE property_room_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS compliance_certs_property_type_room_uniq
  ON public.compliance_certificates(property_id, cert_type, property_room_id)
  WHERE property_room_id IS NOT NULL;;
