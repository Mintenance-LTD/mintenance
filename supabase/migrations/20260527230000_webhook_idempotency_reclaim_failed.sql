-- 2026-05-27 whole-app review Critical #2: webhook idempotency must
-- allow Stripe retries to re-process events whose previous handler
-- attempt failed.
--
-- Previous behaviour
-- ------------------
-- `check_webhook_idempotency` returns `is_duplicate = TRUE` for ANY
-- existing row regardless of `status`. The application layer
-- (stripe-webhook-service.ts:101) catches handler errors and calls
-- `mark_webhook_processed(event_id, 'failed', errorMessage)` which
-- UPDATEs the row to status='failed', THEN re-throws 500. Stripe sees
-- the 500 and retries delivery within minutes. But on retry, the
-- idempotency RPC sees the existing 'failed' row, returns
-- `is_duplicate = TRUE`, and the service returns 200 `{duplicate:true}`
-- without ever re-invoking the handler.
--
-- Net effect: any handler failure permanently loses the event. Real
-- money side-effects that can be lost this way include:
--   - payment_intent.succeeded → escrow flip from 'pending' to 'held'
--   - charge.dispute.created → escrow freeze
--   - charge.refunded → refund mirror to internal escrow_transactions
--
-- Fix
-- ---
-- 1. RPC returns `is_duplicate = FALSE` when the existing row has
--    `status = 'failed'`, AND atomically resets the row to 'pending' +
--    bumps `retry_count` + clears `error_message`. Caller re-runs the
--    handler with the same event_id; on success markProcessed flips
--    status to 'processed'; on another failure, status flips to
--    'failed' again, ready for the next Stripe retry.
-- 2. `status='processed'` stays as duplicate (terminal success — must
--    NOT re-run).
-- 3. `status='pending'` stays as duplicate (concurrent delivery is
--    already in flight; let it finish — re-running would double-process).
-- 4. Hard cap on retry_count at 10 — once exceeded, the row is treated
--    as a duplicate to stop infinite retries on a permanently-broken
--    event (e.g. payload references a deleted job). Manual operator
--    intervention required at that point: DELETE the row to unblock,
--    or fix the underlying data and reset retry_count to 0.

CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_idempotency_key TEXT,
  p_event_type TEXT,
  p_event_id TEXT,
  p_source TEXT,
  p_payload JSONB
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_event public.webhook_events%ROWTYPE;
  new_event_id UUID;
  MAX_RETRIES CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO existing_event
  FROM public.webhook_events
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF existing_event.id IS NOT NULL THEN
    -- Successful prior processing: never re-run.
    IF existing_event.status = 'processed' THEN
      RETURN QUERY SELECT true, existing_event.id;
      RETURN;
    END IF;

    -- Failed prior processing: re-claim for retry IF under cap.
    -- Reset status to 'pending' so the handler can run; bump retry
    -- count so we have visibility into how many attempts have happened.
    IF existing_event.status = 'failed'
       AND existing_event.retry_count < MAX_RETRIES THEN
      UPDATE public.webhook_events
      SET
        status = 'pending',
        retry_count = existing_event.retry_count + 1,
        error_message = NULL,
        updated_at = NOW()
      WHERE id = existing_event.id;

      RETURN QUERY SELECT false, existing_event.id;
      RETURN;
    END IF;

    -- Failed but exhausted retries, OR pending (in-flight concurrent
    -- delivery): treat as duplicate. Operator must investigate.
    RETURN QUERY SELECT true, existing_event.id;
    RETURN;
  END IF;

  -- First time seeing this event: insert + claim.
  INSERT INTO public.webhook_events (
    idempotency_key, event_type, event_id, source, payload, status
  ) VALUES (
    p_idempotency_key, p_event_type, p_event_id, p_source, p_payload, 'pending'
  ) RETURNING id INTO new_event_id;

  RETURN QUERY SELECT false, new_event_id;
END;
$$;

COMMENT ON FUNCTION public.check_webhook_idempotency IS
  'Webhook idempotency check. 2026-05-27 whole-app review Critical #2: status=failed rows are now re-claimable on retry (status reset to pending, retry_count bumped) up to MAX_RETRIES=10. status=processed stays terminal. status=pending stays duplicate (in-flight). Above retry cap: duplicate (manual intervention required).';
