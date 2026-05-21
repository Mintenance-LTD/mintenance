-- ============================================================================
-- 20260521170100_compliance_room_aware_uniqueness.sql
--
-- Follow-up to 20260521170000_compliance_certificates_room_link.sql.
-- The existing UNIQUE (property_id, cert_type) constraint blocks the
-- exact use case the new property_room_id column unlocks — namely,
-- letting a property carry multiple EICRs (one per circuit / room)
-- or multiple gas safety certs (one per appliance / room).
--
-- Replacement scheme:
--   - One whole-property cert per type — enforced by a partial unique
--     index on (property_id, cert_type) WHERE property_room_id IS NULL.
--   - One per-room cert per type — enforced by a partial unique
--     index on (property_id, cert_type, property_room_id) WHERE
--     property_room_id IS NOT NULL.
--
-- Partial indexes handle the NULL-vs-NOT-NULL split cleanly without
-- relying on Postgres 15's `NULLS NOT DISTINCT` (we're on 17 but the
-- partial-index pattern is more portable).
--
-- Zero data risk: live row count = 0 at the time this ships
-- (verified via Supabase MCP on 2026-05-21).
-- ============================================================================

BEGIN;

ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_property_id_cert_type_key;

-- Whole-property cert: one per (property, type) when no room is linked.
CREATE UNIQUE INDEX IF NOT EXISTS compliance_certs_property_type_no_room_uniq
  ON public.compliance_certificates(property_id, cert_type)
  WHERE property_room_id IS NULL;

-- Per-room cert: one per (property, type, room) when a room is linked.
CREATE UNIQUE INDEX IF NOT EXISTS compliance_certs_property_type_room_uniq
  ON public.compliance_certificates(property_id, cert_type, property_room_id)
  WHERE property_room_id IS NOT NULL;

COMMIT;
