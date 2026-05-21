-- Sprint 7 fix (2.3): idempotency keys for cron-written tables
--
-- Several cron jobs (escrow-auto-release, agent-processor, vlm-retraining,
-- notification-processor, etc.) INSERT into these tables without a natural
-- unique key. When a cron tick is retried after a transient failure, every
-- successful write from the first tick is duplicated. For financial /
-- agent-decision audit tables that's unacceptable — a contractor payout
-- decision must be one row, not two, per retry.
--
-- Adds a nullable `idempotency_key UUID` to each table plus a PARTIAL
-- UNIQUE INDEX that enforces uniqueness ONLY when the column is non-null.
-- This means:
--   - Existing rows keep working (all null keys).
--   - Non-cron callers (user-triggered UIs) can keep inserting with no key.
--   - Cron callers now attach a deterministic key (e.g.
--     hash(agent + contextId + dayBucket)) and .upsert with
--     onConflict: 'idempotency_key', ignoreDuplicates: true.
--
-- This migration is additive + non-breaking. Follow-up application PRs
-- will wire each cron writer to pass a key.

-- agent_decisions --------------------------------------------------------
ALTER TABLE public.agent_decisions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  agent_decisions_idempotency_key_uidx
  ON public.agent_decisions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.agent_decisions.idempotency_key IS
  'Optional dedup key for cron-driven writes. Partial-unique (non-null only). '
  'Sprint 7 (2.3).';

-- risk_predictions -------------------------------------------------------
ALTER TABLE public.risk_predictions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  risk_predictions_idempotency_key_uidx
  ON public.risk_predictions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.risk_predictions.idempotency_key IS
  'Optional dedup key for cron-driven writes. Partial-unique (non-null only). '
  'Sprint 7 (2.3).';

-- ai_service_costs -------------------------------------------------------
ALTER TABLE public.ai_service_costs
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  ai_service_costs_idempotency_key_uidx
  ON public.ai_service_costs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.ai_service_costs.idempotency_key IS
  'Optional dedup key for cron-driven cost logging. Partial-unique. '
  'Sprint 7 (2.3).';

-- vlm_routing_decisions --------------------------------------------------
-- (The audit refers to this as "routing_analytics" but the actual table
-- name in the live DB is vlm_routing_decisions per Phase 1 introspection.)
ALTER TABLE public.vlm_routing_decisions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  vlm_routing_decisions_idempotency_key_uidx
  ON public.vlm_routing_decisions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.vlm_routing_decisions.idempotency_key IS
  'Optional dedup key for cron-driven routing decisions. Partial-unique. '
  'Sprint 7 (2.3).';
