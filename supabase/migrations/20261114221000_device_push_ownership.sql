-- A device token belongs to its most recently registered account. Keep other devices intact.
-- Keep the lock, deduplication and constraint in one atomic statement, including
-- migration runners that execute individual statements in autocommit mode.
DO $$
BEGIN
LOCK TABLE public.user_push_tokens IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM public.user_push_tokens WHERE id IN (
 SELECT id FROM (SELECT id,row_number() OVER (PARTITION BY push_token ORDER BY updated_at DESC NULLS LAST,id DESC) AS position FROM public.user_push_tokens) ranked WHERE position>1
);
CREATE UNIQUE INDEX user_push_tokens_one_account_per_token ON public.user_push_tokens(push_token);
END;
$$;
