-- 2026-05-23 audit P1: messages_update_policy lets sender or receiver
-- UPDATE *any* column on a message they participated in. Mobile +
-- web only do one direct write — MessageReadTracker marks `read=true`
-- via supabase.from('messages').update({ read: true }). All other
-- mutations (composing, editing — if added later, deleting attachments)
-- belong in API routes.
--
-- Risk surfaced today: a receiver could mutate `content` / `attachment_url`
-- of a message they didn't send. There's no UI for that today but the
-- privilege is open to anyone with a JWT and the supabase-js client.
--
-- Fix:
--   * Drop the duplicate messages_update_read policy (it grants the
--     same thing as messages_update_policy, just with worse copy).
--   * REVOKE UPDATE on messages from authenticated, then
--     GRANT UPDATE (read, updated_at) so MessageReadTracker still
--     works directly. updated_at because Supabase will auto-bump it
--     via the trigger but the user does need privilege to write to
--     it for the trigger-shim path.
--   * messages_update_policy stays as the row-level gate (only
--     sender/receiver can touch the row at all).

DROP POLICY IF EXISTS messages_update_read ON public.messages;

REVOKE UPDATE ON public.messages FROM authenticated;

GRANT UPDATE (read, updated_at) ON public.messages TO authenticated;

COMMENT ON TABLE public.messages IS
  'Direct client UPDATE limited to (read, updated_at) — only MessageReadTracker writes from the client. All other mutations go through API routes (revoked 2026-05-23).';
