-- Mediation Migration
-- Adds mediation fields to escrow_payments table

ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS mediation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mediation_requested_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS mediation_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mediation_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mediation_status VARCHAR(50) 
  CHECK (mediation_status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS mediation_mediator_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS mediation_outcome TEXT,
ADD COLUMN IF NOT EXISTS mediation_completed_at TIMESTAMP WITH TIME ZONE;

-- Index for mediation tracking
CREATE INDEX IF NOT EXISTS idx_escrow_payments_mediation_status ON escrow_payments(mediation_status) WHERE mediation_requested = true;

-- Add comments
COMMENT ON COLUMN escrow_payments.mediation_requested IS 'Whether mediation has been requested';
COMMENT ON COLUMN escrow_payments.mediation_requested_by IS 'User ID who requested mediation';
COMMENT ON COLUMN escrow_payments.mediation_scheduled_at IS 'Scheduled date/time for mediation session';
COMMENT ON COLUMN escrow_payments.mediation_status IS 'Status of mediation process';
COMMENT ON COLUMN escrow_payments.mediation_mediator_id IS 'Admin or third-party mediator assigned';
COMMENT ON COLUMN escrow_payments.mediation_outcome IS 'Outcome/result of mediation session';

