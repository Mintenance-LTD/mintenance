-- Escrow Payments Table
-- Manages payment escrow for job completion protection

CREATE TABLE IF NOT EXISTS escrow_payments (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment intent reference
  payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,

  -- Relationships
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  contractor_payout DECIMAL(10, 2),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'held', 'released', 'disputed', 'refunded', 'cancelled')
  ),

  -- Release conditions
  release_conditions JSONB DEFAULT '[]'::jsonb,
  auto_release_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  held_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,

  -- Dispute information
  dispute_reason TEXT,
  dispute_evidence JSONB,
  dispute_resolution TEXT,
  disputed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes for performance
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_dates CHECK (
    (released_at IS NULL OR released_at >= created_at) AND
    (disputed_at IS NULL OR disputed_at >= created_at)
  )
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_escrow_payments_job_id ON escrow_payments(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_contractor_id ON escrow_payments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_client_id ON escrow_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_status ON escrow_payments(status);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_payment_intent_id ON escrow_payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_created_at ON escrow_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_auto_release ON escrow_payments(auto_release_date) WHERE status = 'held';

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_escrow_payments_contractor_status
  ON escrow_payments(contractor_id, status, created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_escrow_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_payments_updated_at
  BEFORE UPDATE ON escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_payments_updated_at();

-- Function to calculate contractor payout (amount - platform fee)
CREATE OR REPLACE FUNCTION calculate_contractor_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.platform_fee IS NOT NULL THEN
    NEW.contractor_payout = NEW.amount - NEW.platform_fee;
  ELSE
    -- Default 5% platform fee
    NEW.platform_fee = NEW.amount * 0.05;
    NEW.contractor_payout = NEW.amount - NEW.platform_fee;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_escrow_payout
  BEFORE INSERT OR UPDATE OF amount, platform_fee ON escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_contractor_payout();

-- Function to auto-update held_at timestamp when status changes to 'held'
CREATE OR REPLACE FUNCTION update_escrow_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'held' AND OLD.status != 'held' THEN
    NEW.held_at = now();
    -- Set auto-release date to 7 days from now if not set
    IF NEW.auto_release_date IS NULL THEN
      NEW.auto_release_date = now() + INTERVAL '7 days';
    END IF;
  ELSIF NEW.status = 'released' AND OLD.status != 'released' THEN
    NEW.released_at = now();
  ELSIF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    NEW.disputed_at = now();
  ELSIF NEW.status IN ('released', 'refunded') AND OLD.status = 'disputed' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_status_timestamps
  BEFORE UPDATE OF status ON escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_status_timestamps();

-- Row Level Security (RLS)
ALTER TABLE escrow_payments ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own escrow payments
CREATE POLICY "Contractors can view own escrow payments"
  ON escrow_payments
  FOR SELECT
  USING (
    contractor_id = auth.uid()
    OR client_id = auth.uid()
  );

-- Clients can view escrow payments for their jobs
CREATE POLICY "Clients can view job escrow payments"
  ON escrow_payments
  FOR SELECT
  USING (
    client_id = auth.uid()
  );

-- System can create escrow payments (via service role)
CREATE POLICY "Service role can insert escrow payments"
  ON escrow_payments
  FOR INSERT
  WITH CHECK (true);

-- Only system and authorized users can update escrow status
CREATE POLICY "Authorized updates to escrow payments"
  ON escrow_payments
  FOR UPDATE
  USING (
    contractor_id = auth.uid()
    OR client_id = auth.uid()
  );

-- Admin can view all escrow payments
CREATE POLICY "Admin full access to escrow payments"
  ON escrow_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to get escrow payment by ID with security check
CREATE OR REPLACE FUNCTION get_escrow_payment(p_escrow_id UUID)
RETURNS TABLE (
  id UUID,
  payment_intent_id TEXT,
  job_id UUID,
  contractor_id UUID,
  client_id UUID,
  amount DECIMAL,
  currency TEXT,
  status TEXT,
  release_conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.payment_intent_id,
    e.job_id,
    e.contractor_id,
    e.client_id,
    e.amount,
    e.currency,
    e.status,
    e.release_conditions,
    e.created_at,
    e.released_at,
    e.dispute_reason
  FROM escrow_payments e
  WHERE e.id = p_escrow_id
    AND (
      e.contractor_id = auth.uid()
      OR e.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to release escrow funds (automated)
CREATE OR REPLACE FUNCTION release_escrow_funds(
  p_escrow_id UUID,
  p_reason TEXT DEFAULT 'Job completed successfully'
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM escrow_payments
  WHERE id = p_escrow_id;

  -- Validate status
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Escrow payment not found';
  END IF;

  IF v_current_status NOT IN ('held', 'pending') THEN
    RAISE EXCEPTION 'Cannot release escrow in status: %', v_current_status;
  END IF;

  -- Update status
  UPDATE escrow_payments
  SET
    status = 'released',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{release_reason}',
      to_jsonb(p_reason)
    )
  WHERE id = p_escrow_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to dispute escrow payment
CREATE OR REPLACE FUNCTION dispute_escrow_payment(
  p_escrow_id UUID,
  p_reason TEXT,
  p_evidence JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
DECLARE
  v_current_status TEXT;
  v_user_role TEXT;
BEGIN
  -- Verify user is involved in the escrow
  SELECT status INTO v_current_status
  FROM escrow_payments
  WHERE id = p_escrow_id
    AND (contractor_id = auth.uid() OR client_id = auth.uid());

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or escrow not found';
  END IF;

  IF v_current_status NOT IN ('held', 'pending', 'released') THEN
    RAISE EXCEPTION 'Cannot dispute escrow in status: %', v_current_status;
  END IF;

  -- Update to disputed status
  UPDATE escrow_payments
  SET
    status = 'disputed',
    dispute_reason = p_reason,
    dispute_evidence = p_evidence
  WHERE id = p_escrow_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE escrow_payments IS 'Manages payment escrow for job completion protection';
COMMENT ON COLUMN escrow_payments.release_conditions IS 'JSON array of conditions that must be met for automatic release';
COMMENT ON COLUMN escrow_payments.auto_release_date IS 'Date when funds will be automatically released if no disputes';
COMMENT ON COLUMN escrow_payments.platform_fee IS 'Platform fee amount (typically 5% of transaction)';
COMMENT ON COLUMN escrow_payments.contractor_payout IS 'Amount contractor will receive after platform fee';
