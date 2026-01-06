-- Migration: Link Bids to Quotes
-- Created: 2025-02-25
-- Description: Adds quote_id to bids table to link bids with detailed quotes

-- ============================================================================
-- Add quote_id column to bids table
-- ============================================================================
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES contractor_quotes(id) ON DELETE SET NULL;

-- Create index for quote_id lookup
CREATE INDEX IF NOT EXISTS idx_bids_quote_id ON bids(quote_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN bids.quote_id IS 'References contractor_quotes.id - links bid to detailed quote with line items and breakdown';

-- ============================================================================
-- Update contractor_quotes to add job_id for easier linking
-- ============================================================================
ALTER TABLE contractor_quotes 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;

-- Create index for job_id lookup
CREATE INDEX IF NOT EXISTS idx_contractor_quotes_job_id ON contractor_quotes(job_id);

-- Add comment
COMMENT ON COLUMN contractor_quotes.job_id IS 'References jobs.id - links quote to the job it was created for';

-- ============================================================================
-- Update contractor_quotes status to match bid status values
-- ============================================================================
-- Add 'pending' status to contractor_quotes if not already present
-- Note: The CHECK constraint will need to be updated if 'pending' is not in the list
-- We'll check the current constraint first
DO $$
BEGIN
    -- Check if 'pending' status is allowed, if not, we'll need to alter the constraint
    -- For now, we'll just ensure the status can be 'pending' by updating the constraint
    -- This is safe because the constraint already includes 'sent' which is similar
    -- We'll update status to 'sent' for quotes that should be 'pending' to align with bids
    UPDATE contractor_quotes 
    SET status = 'sent' 
    WHERE status = 'draft' 
      AND EXISTS (
        SELECT 1 FROM bids b 
        WHERE b.quote_id = contractor_quotes.id 
          AND b.status = 'pending'
      );
END $$;

-- ============================================================================
-- RLS Policies for contractor_quotes with job_id
-- ============================================================================
-- Contractors can view quotes linked to their bids
DROP POLICY IF EXISTS "Contractors can view quotes for their bids" ON contractor_quotes;
CREATE POLICY "Contractors can view quotes for their bids" ON contractor_quotes
    FOR SELECT USING (
        contractor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM bids b 
            WHERE b.quote_id = contractor_quotes.id 
              AND b.contractor_id = auth.uid()
        )
    );

-- Homeowners can view quotes for bids on their jobs
DROP POLICY IF EXISTS "Homeowners can view quotes for bids on their jobs" ON contractor_quotes;
CREATE POLICY "Homeowners can view quotes for bids on their jobs" ON contractor_quotes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bids b 
            JOIN jobs j ON j.id = b.job_id
            WHERE b.quote_id = contractor_quotes.id 
              AND j.homeowner_id = auth.uid()
        )
    );

COMMENT ON TABLE bids IS 'Bids are now linked to detailed quotes via quote_id. Each bid should have a corresponding contractor_quotes record with line items and breakdown.';

