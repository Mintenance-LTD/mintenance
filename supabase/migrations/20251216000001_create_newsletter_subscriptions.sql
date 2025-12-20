-- ============================================================================
-- Newsletter Subscriptions Migration
-- Creates table for storing newsletter email subscriptions
-- ============================================================================

BEGIN;

-- ============================================================================
-- NEWSLETTER_SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT DEFAULT 'footer' CHECK (source IN ('footer', 'landing', 'popup', 'api', 'manual')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_active_email UNIQUE (email, is_active) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email 
  ON public.newsletter_subscriptions(email);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_is_active 
  ON public.newsletter_subscriptions(is_active) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_subscribed_at 
  ON public.newsletter_subscriptions(subscribed_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_source 
  ON public.newsletter_subscriptions(source);

-- Comments
COMMENT ON TABLE public.newsletter_subscriptions IS 'Stores newsletter email subscriptions from various sources';
COMMENT ON COLUMN public.newsletter_subscriptions.email IS 'Subscriber email address (lowercase, trimmed)';
COMMENT ON COLUMN public.newsletter_subscriptions.source IS 'Where the subscription originated: footer, landing, popup, api, manual';
COMMENT ON COLUMN public.newsletter_subscriptions.subscribed_at IS 'When the user subscribed';
COMMENT ON COLUMN public.newsletter_subscriptions.unsubscribed_at IS 'When the user unsubscribed (if applicable)';
COMMENT ON COLUMN public.newsletter_subscriptions.is_active IS 'Whether the subscription is currently active';
COMMENT ON COLUMN public.newsletter_subscriptions.metadata IS 'Additional metadata (IP address, user agent, etc.)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriptions_updated_at();

-- RLS Policies (if needed in the future)
-- For now, we'll allow service role to manage subscriptions
-- Users don't need direct access to this table

COMMIT;
