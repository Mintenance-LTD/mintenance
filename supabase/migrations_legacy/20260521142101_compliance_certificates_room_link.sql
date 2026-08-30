ALTER TABLE public.compliance_certificates
  ADD COLUMN IF NOT EXISTS property_room_id UUID
  REFERENCES public.property_rooms(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_certificates_property_room
  ON public.compliance_certificates(property_room_id)
  WHERE property_room_id IS NOT NULL;

COMMENT ON COLUMN public.compliance_certificates.property_room_id IS
  'Optional FK to property_rooms. When set, the certificate covers just that specific room (e.g. EICR for kitchen sub-circuit, gas safety for the utility room boiler). NULL means whole-property scope. ON DELETE SET NULL so room deletion preserves the cert.';;
