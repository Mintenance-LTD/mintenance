DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoice_payments'
      AND policyname = 'invoice_payments_user_read'
  ) THEN
    CREATE POLICY invoice_payments_user_read ON public.invoice_payments
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
;
