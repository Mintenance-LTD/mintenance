ALTER TABLE public.agent_decisions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  agent_decisions_idempotency_key_uidx
  ON public.agent_decisions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.agent_decisions.idempotency_key IS
  'Optional dedup key for cron-driven writes. Partial-unique (non-null only). Sprint 7 (2.3).';

ALTER TABLE public.risk_predictions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  risk_predictions_idempotency_key_uidx
  ON public.risk_predictions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.risk_predictions.idempotency_key IS
  'Optional dedup key for cron-driven writes. Partial-unique (non-null only). Sprint 7 (2.3).';

ALTER TABLE public.ai_service_costs
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  ai_service_costs_idempotency_key_uidx
  ON public.ai_service_costs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.ai_service_costs.idempotency_key IS
  'Optional dedup key for cron-driven cost logging. Partial-unique. Sprint 7 (2.3).';

ALTER TABLE public.vlm_routing_decisions
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  vlm_routing_decisions_idempotency_key_uidx
  ON public.vlm_routing_decisions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.vlm_routing_decisions.idempotency_key IS
  'Optional dedup key for cron-driven routing decisions. Partial-unique. Sprint 7 (2.3).';;
