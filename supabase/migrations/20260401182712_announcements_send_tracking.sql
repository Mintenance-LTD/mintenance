-- Create announcements table (if not exists) and add send tracking columns
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'general',
  target_audience text NOT NULL DEFAULT 'all',
  priority text NOT NULL DEFAULT 'normal',
  is_published boolean DEFAULT false,
  expires_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  sent_by uuid REFERENCES profiles(id),
  send_results jsonb
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "admin_manage_announcements"
  ON announcements FOR ALL
  USING (true);

CREATE INDEX IF NOT EXISTS idx_announcements_published
  ON announcements(is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_audience
  ON announcements(target_audience);
