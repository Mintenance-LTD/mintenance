-- AUDIT_PUNCH_LIST P2 #36 (D-P2-4) — `messages` had two functionally
-- identical DELETE policies. Both check `auth.uid() = sender_id`.
-- Keeping the snake_case `messages_delete_own` (matches the rest of
-- the table's policy naming) and dropping the older human-named
-- variant.

DROP POLICY IF EXISTS "Users can delete their sent messages" ON public.messages;
