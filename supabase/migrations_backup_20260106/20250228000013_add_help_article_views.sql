-- Add help_article_views table to track help article views
CREATE TABLE IF NOT EXISTS public.help_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_title TEXT NOT NULL,
  category TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL for anonymous views
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_help_article_views_title ON public.help_article_views(article_title);
CREATE INDEX IF NOT EXISTS idx_help_article_views_category ON public.help_article_views(category);
CREATE INDEX IF NOT EXISTS idx_help_article_views_viewed_at ON public.help_article_views(viewed_at DESC);

-- RLS Policies
ALTER TABLE public.help_article_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can record help article views"
  ON public.help_article_views
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view aggregated view counts (for display)
CREATE POLICY "Anyone can view help article view counts"
  ON public.help_article_views
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.help_article_views IS 'Tracks views of help center articles for analytics and popularity display';

