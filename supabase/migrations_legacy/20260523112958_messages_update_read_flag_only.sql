DROP POLICY IF EXISTS messages_update_read ON public.messages;
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read, updated_at) ON public.messages TO authenticated;
COMMENT ON TABLE public.messages IS
  'Direct client UPDATE limited to (read, updated_at) — only MessageReadTracker writes from the client. All other mutations go through API routes (revoked 2026-05-23).';;
