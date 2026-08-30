
BEGIN;

CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  signer_role text NOT NULL CHECK (signer_role IN ('homeowner', 'contractor')),
  signature_image text NOT NULL CHECK (length(signature_image) BETWEEN 1 AND 524288),
  signature_format text NOT NULL DEFAULT 'svg' CHECK (signature_format IN ('svg', 'png')),
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'mobile')),
  signer_ip inet,
  signer_user_agent text CHECK (signer_user_agent IS NULL OR length(signer_user_agent) <= 1024),
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_signatures_contract_role
  ON public.contract_signatures (contract_id, signer_role);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_signer
  ON public.contract_signatures (signer_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract
  ON public.contract_signatures (contract_id, signed_at);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_signatures_select_party
  ON public.contract_signatures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contracts c
      WHERE c.id = contract_signatures.contract_id
        AND (c.contractor_id = auth.uid() OR c.homeowner_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY contract_signatures_insert_own
  ON public.contract_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    signer_id = auth.uid()
    AND (
      (signer_role = 'contractor' AND EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_signatures.contract_id
          AND c.contractor_id = auth.uid()
      ))
      OR
      (signer_role = 'homeowner' AND EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_signatures.contract_id
          AND c.homeowner_id = auth.uid()
      ))
    )
  );

CREATE POLICY contract_signatures_service_role
  ON public.contract_signatures
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.contract_signatures IS
  'Immutable audit log of contract e-signatures. One row per (contract, party-role). RLS: parties + admin SELECT, signer-own INSERT (matching contract party), no UPDATE/DELETE outside service_role.';

COMMENT ON COLUMN public.contract_signatures.signature_image IS
  'Raw signature artifact. SVG inline string when signature_format = svg, base64 data URL (data:image/png;base64,...) when signature_format = png. Max 512 KiB.';

COMMIT;
;
