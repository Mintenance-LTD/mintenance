-- ============================================================================
-- 20260520000006_job_tips.sql
--
-- Gratuities ("tip jar") — homeowners send a top-up tip directly to
-- the contractor after a completed job. Money flows via Stripe
-- Direct Charge to the contractor's Connect account; the platform
-- takes no fee on tips (intentional — full amount goes to the
-- contractor as a thank-you).
--
-- Workflow:
--   1. Homeowner clicks "Send a tip" on a completed job
--   2. POST /api/jobs/[id]/tip creates a row in `job_tips` with
--      status='pending' + a Stripe PaymentIntent
--   3. Homeowner completes payment via Stripe Elements
--   4. Stripe webhook (`payment_intent.succeeded`) flips status to
--      'completed' + sets `paid_at`
--   5. Notification fires to the contractor
--
-- RLS:
--   - Homeowner: read + insert own (payer_id = auth.uid())
--   - Contractor: read own (payee_id = auth.uid())
--   - Admins: full read for support
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'gbp',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_tips_job_id_idx
  ON public.job_tips (job_id);

CREATE INDEX IF NOT EXISTS job_tips_payee_id_idx
  ON public.job_tips (payee_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS job_tips_payment_intent_uq
  ON public.job_tips (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.job_tips IS
  'Gratuities sent from homeowner to contractor after a completed
   job. Stripe Direct Charge — no platform fee, no escrow hold.';

CREATE OR REPLACE FUNCTION public.tg_job_tips_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_tips_updated_at ON public.job_tips;
CREATE TRIGGER job_tips_updated_at
  BEFORE UPDATE ON public.job_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_job_tips_updated_at();

ALTER TABLE public.job_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_tips_payer_all ON public.job_tips;
CREATE POLICY job_tips_payer_all
  ON public.job_tips
  FOR ALL
  TO authenticated
  USING (payer_id = auth.uid())
  WITH CHECK (payer_id = auth.uid());

DROP POLICY IF EXISTS job_tips_payee_select ON public.job_tips;
CREATE POLICY job_tips_payee_select
  ON public.job_tips
  FOR SELECT
  TO authenticated
  USING (payee_id = auth.uid());

DROP POLICY IF EXISTS job_tips_admin_select ON public.job_tips;
CREATE POLICY job_tips_admin_select
  ON public.job_tips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMIT;

-- ============================================================================
-- Rollback (manual)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.job_tips;
-- DROP FUNCTION IF EXISTS public.tg_job_tips_updated_at();
-- COMMIT;
