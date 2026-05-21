-- ============================================================================
-- 20260521170000_compliance_certificates_room_link.sql
--
-- Slice 4 of the Property Rooms feature — let landlords scope a
-- compliance certificate to a specific room (e.g. EICR for the
-- kitchen sub-circuit, gas safety for the utility-room boiler)
-- rather than the whole property.
--
-- Adds:
--   - compliance_certificates.property_room_id  UUID, nullable
--     FK → public.property_rooms(id) ON DELETE SET NULL
--
-- Nullable on purpose: certs that legitimately cover the whole
-- property keep the column NULL — the new column is additive, not a
-- required scope narrower. ON DELETE SET NULL because rooms can be
-- deleted independently of the cert; the cert itself must survive
-- (UK retention: gas ≥2yr, EICR ≥5yr — already enforced by
-- compliance_certificates.property_id being SET NULL too).
--
-- App-layer guard (added in same commit as this migration): the
-- compliance route validates the supplied room belongs to the cert's
-- property. RLS is unchanged — `compliance_certs_owner_all` already
-- gates on owner_id, which is the authoritative ownership key.
--
-- Zero data risk: live row count = 0 at the time this ships (verified
-- via Supabase MCP on 2026-05-21).
-- ============================================================================

BEGIN;

ALTER TABLE public.compliance_certificates
  ADD COLUMN IF NOT EXISTS property_room_id UUID
  REFERENCES public.property_rooms(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_certificates_property_room
  ON public.compliance_certificates(property_room_id)
  WHERE property_room_id IS NOT NULL;

COMMENT ON COLUMN public.compliance_certificates.property_room_id IS
  'Optional FK to property_rooms. When set, the certificate covers
   just that specific room (e.g. EICR for kitchen sub-circuit, gas
   safety for the utility room boiler). NULL means whole-property
   scope. ON DELETE SET NULL so room deletion preserves the cert.';

COMMIT;
