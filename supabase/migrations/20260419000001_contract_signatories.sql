-- R3 #4 of docs/RETENTION_ROADMAP_2026.md — second-homeowner approval gate.
--
-- Existing contracts carry `contract.contractor_signed_at` +
-- `contract.homeowner_signed_at` (primary homeowner). This table holds
-- ADDITIONAL co-signers (typically the primary homeowner's partner).
-- Contracts with no signatories row keep the legacy "both signed"
-- behaviour — the accept route falls back to the existing columns.
--
-- Role is an enum-like check for future extensibility (primary_homeowner
-- + contractor are carried for symmetry) but only 'second_homeowner'
-- rows are created today.

BEGIN;

CREATE TABLE IF NOT EXISTS public.contract_signatories (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id        UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id            UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  role               TEXT        NOT NULL CHECK (role IN ('primary_homeowner','second_homeowner','contractor')),
  invited_email      TEXT        NULL,
  invitation_token   TEXT        NULL UNIQUE,
  signed_at          TIMESTAMPTZ NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A cosigner must be reachable by either a resolved user_id or an
  -- email we emailed an invite to. Both-null is invalid.
  CONSTRAINT contract_signatories_reachable
    CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contract_signatories_contract
  ON public.contract_signatories (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatories_user
  ON public.contract_signatories (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.contract_signatories ENABLE ROW LEVEL SECURITY;

-- Visible to: the signatory themselves, OR any current contract party
-- (contractor or primary homeowner on the underlying contract).
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

-- Only the primary homeowner on a contract can add co-signers.
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

-- A signatory can update only their own row (to sign). The primary
-- homeowner can also update (e.g. to cancel a pending invite).
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

-- Primary homeowner can remove a pending (unsigned) co-signer invite.
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

COMMIT;
