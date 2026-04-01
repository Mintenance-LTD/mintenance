-- Waitlist position tracking + referral system for coming_soon_signups
-- Adds queue position, referral codes, and referral tracking

-- Add new columns to coming_soon_signups
ALTER TABLE coming_soon_signups
  ADD COLUMN IF NOT EXISTS position integer,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES coming_soon_signups(id),
  ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Backfill position for existing rows based on creation order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS pos
  FROM coming_soon_signups
  WHERE position IS NULL
)
UPDATE coming_soon_signups
SET position = ranked.pos
FROM ranked
WHERE coming_soon_signups.id = ranked.id;

-- Backfill referral codes for existing rows (8-char hex)
UPDATE coming_soon_signups
SET referral_code = SUBSTRING(encode(gen_random_uuid()::bytea, 'hex') FROM 1 FOR 8)
WHERE referral_code IS NULL;

-- Index for fast referral code lookups
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_referral_code
  ON coming_soon_signups(referral_code);

-- Index for position ordering
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_position
  ON coming_soon_signups(position);

-- Index for referred_by lookups (counting referrals)
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_referred_by
  ON coming_soon_signups(referred_by);
