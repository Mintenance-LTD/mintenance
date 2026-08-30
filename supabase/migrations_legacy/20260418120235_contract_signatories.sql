
CREATE TABLE IF NOT EXISTS public.contract_signatories (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id        UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id            UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  role               TEXT        NOT NULL CHECK (role IN ('primary_homeowner','second_homeowner','contractor')),
  invited_email      TEXT        NULL,
  invitation_token   TEXT        NULL UNIQUE,
  signed_at          TIMESTAMPTZ NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contract_signatories_reachable
    CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contract_signatories_contract
  ON public.contract_signatories (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatories_user
  ON public.contract_signatories (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.contract_signatories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_signatories_select ON public.contract_signatories;
CREATE POLICY contract_signatories_select ON public.contract_signatories
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatories.contract_id
        AND (c.contractor_id = auth.uid() OR c.homeowner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS contract_signatories_insert ON public.contract_signatories;
CREATE POLICY contract_signatories_insert ON public.contract_signatories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatories.contract_id
        AND c.homeowner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS contract_signatories_update ON public.contract_signatories;
CREATE POLICY contract_signatories_update ON public.contract_signatories
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatories.contract_id
        AND c.homeowner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatories.contract_id
        AND c.homeowner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS contract_signatories_delete ON public.contract_signatories;
CREATE POLICY contract_signatories_delete ON public.contract_signatories
  FOR DELETE TO authenticated
  USING (
    signed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_signatories.contract_id
        AND c.homeowner_id = auth.uid()
    )
  );
;
