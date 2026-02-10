-- Migration: Add property favorites system
-- Date: 2026-02-03
-- Purpose: Allow users to favorite/bookmark properties for quick access

BEGIN;

-- Create property_favorites table
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.property_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.property_favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.property_favorites(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.property_favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.property_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their favorites"
  ON public.property_favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.property_favorites IS 'Stores user favorites/bookmarks for properties';
COMMENT ON COLUMN public.property_favorites.user_id IS 'User who favorited the property';
COMMENT ON COLUMN public.property_favorites.property_id IS 'Property that was favorited';

COMMIT;
