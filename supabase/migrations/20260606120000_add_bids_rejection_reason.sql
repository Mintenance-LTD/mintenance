-- 2026-06-06 audit: the reject + unreject bid routes already write
-- bids.rejection_reason, but the column never existed, so every
-- reject-with-reason and every undo-reject threw. Add it (nullable text)
-- so the existing route code works as written.
-- Applied to live project ukrjudtlvapiajkjbcrd via MCP on 2026-06-06.
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS rejection_reason text;
COMMENT ON COLUMN public.bids.rejection_reason IS 'Optional homeowner-supplied reason when a bid is rejected; cleared on undo-reject.';
