-- Dispute Workflow Migration
-- Adds dispute workflow fields to escrow_payments table

ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS dispute_priority VARCHAR(50) DEFAULT 'medium' 
  CHECK (dispute_priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0),
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;

-- Index for SLA tracking
CREATE INDEX IF NOT EXISTS idx_escrow_payments_sla_deadline ON escrow_payments(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_payments_priority ON escrow_payments(dispute_priority) WHERE status = 'disputed';

-- Add comments
COMMENT ON COLUMN escrow_payments.dispute_priority IS 'Dispute priority: low (14 days), medium (7 days), high (3 days), critical (24 hours)';
COMMENT ON COLUMN escrow_payments.escalation_level IS 'Escalation level (0 = initial, increases with auto-escalation)';
COMMENT ON COLUMN escrow_payments.sla_deadline IS 'SLA deadline for dispute resolution';

