-- =====================================================================
-- contract_signatures: immutable audit table for contract e-signatures
--
-- 2026-05-27 audit-P0-4 — both mobile (Alert "Sign") and web
-- (ContractManagement click-button) accepted contracts with no
-- signature capture and no audit trail. UK Construction Act + RICS
-- disputes need at minimum: who signed, when, from where, what device,
-- and a reproducible signature artifact.
--
-- Schema design notes:
--   - signature_image stores either a data-URL PNG (web canvas
--     toDataURL) or an inline SVG string (mobile PanResponder capture).
--     We tag the format so future renderers/auditors know how to display.
--   - signer_ip is inet to enable network-range queries during fraud
--     investigation. NULL allowed for cases where the client IP isn't
--     extractable (some serverless paths).
--   - No UPDATE / DELETE policies. Once written, a signature row is
--     forever. (Admins can SELECT but not mutate; data correction
--     would happen via a new row + a sequence number, not edits.)
--   - One row per (contract_id, signer_id, signer_role). The unique
--     index lets idempotency retries land safely.
-- =====================================================================

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

-- One signature per (contract, party-role). Idempotent re-signs of the
-- same contract by the same user are blocked at write time; the API
-- handler returns the existing timestamp instead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_signatures_contract_role
  ON public.contract_signatures (contract_id, signer_role);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_signer
  ON public.contract_signatures (signer_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract
  ON public.contract_signatures (contract_id, signed_at);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- SELECT: the two contract parties + any admin. The IDOR-safe pattern
-- joins contracts.id and checks both party columns at once.
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

-- INSERT: only the signer themselves, and only on a contract where they
-- are the matching party. The role they claim must match the contract
-- party column. Both party columns are checked so a homeowner cannot
-- mark themselves as the contractor signature.
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

-- No UPDATE policy → no row can be modified.
-- No DELETE policy → no row can be removed by anyone except service_role
-- (used by GDPR delete_user_data RPC which cascades via FK).

-- Service role full access (cron, admin tools, GDPR cascade).
CREATE POLICY contract_signatures_service_role
  ON public.contract_signatures
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.contract_signatures IS
  'Immutable audit log of contract e-signatures. One row per (contract, party-role).'
  ' RLS: parties + admin SELECT, signer-own INSERT (matching contract party),'
  ' no UPDATE/DELETE outside service_role.';

COMMENT ON COLUMN public.contract_signatures.signature_image IS
  'Raw signature artifact. SVG inline string when signature_format = svg,'
  ' base64 data URL (data:image/png;base64,...) when signature_format = png.'
  ' Max 512 KiB to keep PostgREST + Stripe-webhook-style payloads reasonable.';

COMMIT;

-- =====================================================================
-- Rollback (manual)
-- =====================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.contract_signatures CASCADE;
-- COMMIT;
