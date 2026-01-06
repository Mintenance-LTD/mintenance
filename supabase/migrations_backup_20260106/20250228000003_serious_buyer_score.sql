-- Serious Buyer Score Migration
-- Adds serious buyer score to jobs table

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS serious_buyer_score INTEGER DEFAULT 0 CHECK (serious_buyer_score >= 0 AND serious_buyer_score <= 100);

-- Index for filtering by serious buyer score
CREATE INDEX IF NOT EXISTS idx_jobs_serious_buyer_score ON jobs(serious_buyer_score);

-- Add comment
COMMENT ON COLUMN jobs.serious_buyer_score IS 'Score from 0-100 indicating how serious the buyer is (phone verified, previous jobs, budget, etc.)';

