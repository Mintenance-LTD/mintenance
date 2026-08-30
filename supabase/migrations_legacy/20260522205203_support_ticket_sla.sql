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
  'Snapshot of the user effective subscription tier at ticket creation. Free/basic/professional/enterprise/landlord/agency.';

UPDATE public.support_tickets
SET sla_hours = 48, sla_tier = 'basic'
WHERE sla_hours IS NULL;

CREATE INDEX IF NOT EXISTS support_tickets_sla_open_idx
  ON public.support_tickets (created_at, sla_hours)
  WHERE status = 'open';;
