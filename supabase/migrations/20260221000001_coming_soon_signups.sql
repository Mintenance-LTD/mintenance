-- Coming Soon email signups
CREATE TABLE IF NOT EXISTS coming_soon_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coming_soon_signups ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses serverSupabase which bypasses RLS,
-- but this policy ensures admin dashboard access works too)
CREATE POLICY "Service role manages signups"
  ON coming_soon_signups
  FOR ALL
  USING (true);
