-- 2026-06-06 audit: POST /api/contractor/quotes calls
-- serverSupabase.rpc('generate_quote_number') but the function never
-- existed, so every quote creation logged an error and fell back to a raw
-- timestamp number (Q-1780749305463) — ugly on a client-facing quote.
-- Create a sequence-backed generator producing clean sequential numbers.
-- Applied to live project ukrjudtlvapiajkjbcrd via MCP on 2026-06-06.
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$ SELECT 'Q-' || to_char(nextval('public.quote_number_seq'), 'FM000000'); $$;

-- The only caller is the server-side quotes route (service role). Keep it
-- off the anon role so a public client can't burn sequence values.
REVOKE EXECUTE ON FUNCTION public.generate_quote_number() FROM anon;
