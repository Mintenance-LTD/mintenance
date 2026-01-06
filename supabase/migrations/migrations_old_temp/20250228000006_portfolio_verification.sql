-- Portfolio Verification Migration
-- Adds verification fields to contractor_posts table

ALTER TABLE contractor_posts 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Index for verified portfolio items
CREATE INDEX IF NOT EXISTS idx_contractor_posts_verified ON contractor_posts(is_verified) WHERE is_verified = true;

-- Add comments
COMMENT ON COLUMN contractor_posts.is_verified IS 'Whether this portfolio item has been verified by admin';
COMMENT ON COLUMN contractor_posts.verified_by IS 'Admin user ID who verified this portfolio item';
COMMENT ON COLUMN contractor_posts.verified_at IS 'Timestamp when portfolio item was verified';

