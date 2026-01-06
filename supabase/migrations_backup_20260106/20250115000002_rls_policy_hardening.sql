-- RLS Policy Hardening: payments and messages
-- Ensures deny-by-default and least-privilege access

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Drop broad policies if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select_policy') THEN
    EXECUTE 'DROP POLICY messages_select_policy ON public.messages';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='payments_select_policy') THEN
    EXECUTE 'DROP POLICY "Users can view their payments as payer or payee" ON public.payments';
  END IF;
END $$;

-- Create tightened policies
CREATE POLICY payments_select_policy
  ON public.payments FOR SELECT
  USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY payments_insert_policy
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY payments_update_policy
  ON public.payments FOR UPDATE
  USING (auth.uid() = payer_id OR auth.uid() = payee_id)
  WITH CHECK (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY messages_select_policy
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id OR
    auth.uid() = assigned_contractor_id OR
    auth.uid() = job_owner_id
  );

-- Optional: disallow deletes unless owner
CREATE POLICY messages_delete_policy
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = job_owner_id);