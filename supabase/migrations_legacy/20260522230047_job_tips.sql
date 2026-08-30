CREATE TABLE IF NOT EXISTS public.job_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'gbp',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_tips_job_id_idx ON public.job_tips (job_id);
CREATE INDEX IF NOT EXISTS job_tips_payee_id_idx ON public.job_tips (payee_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS job_tips_payment_intent_uq ON public.job_tips (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.job_tips IS 'Gratuities sent from homeowner to contractor after a completed job. Stripe Direct Charge - no platform fee.';

CREATE OR REPLACE FUNCTION public.tg_job_tips_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_tips_updated_at ON public.job_tips;
CREATE TRIGGER job_tips_updated_at BEFORE UPDATE ON public.job_tips FOR EACH ROW EXECUTE FUNCTION public.tg_job_tips_updated_at();

ALTER TABLE public.job_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_tips_payer_all ON public.job_tips;
CREATE POLICY job_tips_payer_all ON public.job_tips FOR ALL TO authenticated USING (payer_id = auth.uid()) WITH CHECK (payer_id = auth.uid());

DROP POLICY IF EXISTS job_tips_payee_select ON public.job_tips;
CREATE POLICY job_tips_payee_select ON public.job_tips FOR SELECT TO authenticated USING (payee_id = auth.uid());

DROP POLICY IF EXISTS job_tips_admin_select ON public.job_tips;
CREATE POLICY job_tips_admin_select ON public.job_tips FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));;
