-- ==========================================================
-- ADD MESSAGE REACTIONS SUPPORT
-- Mintenance UK - Enable emoji reactions on messages
-- Migration: 20250129000001
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. CREATE MESSAGE_REACTIONS TABLE
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate reactions from same user for same emoji
  -- A user can only react with the same emoji once per message
  CONSTRAINT unique_user_message_emoji UNIQUE(message_id, user_id, emoji)
);

-- Add comment for documentation
COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions on messages for the 2025 UI redesign';
COMMENT ON COLUMN public.message_reactions.emoji IS 'Emoji character (max 10 chars to support combined emojis)';

-- ==========================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==========================================================

-- Fast lookup of all reactions for a message
CREATE INDEX idx_message_reactions_message_id
  ON public.message_reactions(message_id);

-- Fast lookup of all reactions by a user
CREATE INDEX idx_message_reactions_user_id
  ON public.message_reactions(user_id);

-- Fast lookup by creation date (for analytics)
CREATE INDEX idx_message_reactions_created_at
  ON public.message_reactions(created_at DESC);

-- Composite index for common query pattern (message + user)
CREATE INDEX idx_message_reactions_message_user
  ON public.message_reactions(message_id, user_id);

-- ==========================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 4. RLS POLICIES
-- ==========================================================

-- Policy: Users can view reactions on messages they have access to
-- A user can see reactions if they are the sender or receiver of the message
CREATE POLICY "Users can view reactions on accessible messages"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

-- Policy: Users can add reactions to messages they can access
-- A user can react if they are the sender or receiver of the message
CREATE POLICY "Users can add reactions to accessible messages"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================================
-- 5. GRANT PERMISSIONS
-- ==========================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;

-- Service role has full access (for admin operations)
GRANT ALL ON public.message_reactions TO service_role;

-- ==========================================================
-- 6. ADD TRIGGER FOR UPDATED_AT (FUTURE-PROOFING)
-- ==========================================================

-- Note: Not adding updated_at column for now as reactions are immutable
-- If we need to track edits later, we can add it in a future migration

COMMIT;

-- ==========================================================
-- VERIFICATION QUERIES (Run these after migration)
-- ==========================================================

-- Verify table created
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'message_reactions';

-- Verify indexes created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'message_reactions';

-- Verify RLS enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'message_reactions';

-- Verify policies created
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'message_reactions';
