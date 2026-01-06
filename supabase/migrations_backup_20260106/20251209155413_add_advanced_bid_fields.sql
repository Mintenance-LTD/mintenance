-- Migration: Add advanced bid fields to bids table
-- Purpose: Support line items, tax rates, and terms for contractor bids
-- Related: BidSubmissionClient2025 component expects these fields

-- Add advanced fields to bids table
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms TEXT;

-- Add helpful comment
COMMENT ON COLUMN bids.line_items IS 'Structured breakdown of bid costs in JSON format [{description, quantity, unitPrice, total}]';
COMMENT ON COLUMN bids.tax_rate IS 'Tax rate percentage applied to the bid (e.g., 20 for 20%)';
COMMENT ON COLUMN bids.terms IS 'Payment terms and conditions for the bid';

-- Add check constraint for tax_rate
ALTER TABLE bids
  ADD CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);
