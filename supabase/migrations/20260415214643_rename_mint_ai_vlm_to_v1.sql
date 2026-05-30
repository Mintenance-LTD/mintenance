-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Rename legacy 'mint-ai-vlm' model identifier to 'mint-ai-vlm-v1' to match
-- the new versioned convention established in
-- apps/web/lib/services/ai/mint-ai-constants.ts (2026-04-15).
--
-- Also migrates any legacy 'qwen2.5-vl-3b' or 'qwen2.5-vl-7b' rows if they
-- exist (currently 0 in prod per the pre-migration survey, included here
-- as idempotent belt-and-braces).
--
-- Safe to re-run: UPDATE is a no-op if the rename has already happened.
UPDATE public.ai_service_costs
SET model = 'mint-ai-vlm-v1'
WHERE model IN ('mint-ai-vlm', 'qwen2.5-vl-3b', 'qwen2.5-vl-7b');
