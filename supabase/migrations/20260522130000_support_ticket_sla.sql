-- 2026-05-22 Sprint 3: SLA columns on support_tickets so the tiered support
-- promise (Email 48h / Priority 24h / Phone 4h) is enforceable.
--
-- `sla_hours` is the response-time commitment set at ticket creation based
-- on the user's effective tier. `sla_tier` snapshots the tier name so we
-- can report on SLA performance per tier without re-resolving subscriptions
-- after the fact. Neither column is editable by the user; both are set
-- server-side in POST /api/support/tickets.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS sla_hours INTEGER;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS sla_tier TEXT;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_sla_hours_range;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_sla_hours_range
    CHECK (sla_hours IS NULL OR (sla_hours > 0 AND sla_hours <= 720));

COMMENT ON COLUMN public.support_tickets.sla_hours IS
  'Response-time SLA in hours, set at create time based on user tier. 48 = email (Basic/Free), 24 = priority (Pro/Landlord), 4 = phone (Business/Agency).';
COMMENT ON COLUMN public.support_tickets.sla_tier IS
  'Snapshot of the user''s effective subscription tier at ticket creation. Free/basic/professional/enterprise/landlord/agency.';

-- Backfill: assume legacy tickets are Basic-tier (48h). Best-effort; new
-- tickets get the correct tier mapping from the route.
UPDATE public.support_tickets
SET sla_hours = 48, sla_tier = 'basic'
WHERE sla_hours IS NULL;

-- Index for the admin dashboard "tickets approaching SLA breach" query.
CREATE INDEX IF NOT EXISTS support_tickets_sla_open_idx
  ON public.support_tickets (created_at, sla_hours)
  WHERE status = 'open';
