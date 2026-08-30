BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- UK market readiness (Task 2): capture DOB + UK tax identity.
-- Additive only — backward-compatible with currently-running code.
-- Sensitive identifiers (DOB, UTR, NINO) are stored ENCRYPTED at rest as
-- an AES-256-GCM EncryptedField envelope (see apps/web/lib/encryption/
-- field-encryption.ts) in jsonb columns, mirroring how totp_secret and
-- other special-category-adjacent data are handled. Never SELECT these
-- into logs; client reads are revoked (service-role + decrypt only).
-- ─────────────────────────────────────────────────────────────────────

-- Date of birth: needed for BOTH DBS checks (DBSCheckService reads profiles)
-- and HMRC "Reporting rules for digital platforms" seller identity.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth_encrypted jsonb;

COMMENT ON COLUMN public.profiles.date_of_birth_encrypted IS
  'AES-256-GCM EncryptedField envelope of the user''s date of birth. Special-category-adjacent PII: never log, never expose to authenticated clients (service-role read + decrypt only).';

-- contractor_tax_profiles was a US W-9 table and is EMPTY (0 rows, verified
-- 2026-08-05). Repurpose it as the UK contractor tax-identity table. US
-- columns (tin_*, tax_classification, state, zip_code) are left in place for
-- now — dropping them is a deploy-time migration so pre-merge code that still
-- reads them does not break mid-deploy.
ALTER TABLE public.contractor_tax_profiles
  ADD COLUMN IF NOT EXISTS utr_encrypted jsonb,        -- Unique Taxpayer Reference (10 digits)
  ADD COLUMN IF NOT EXISTS nino_encrypted jsonb,       -- National Insurance number
  ADD COLUMN IF NOT EXISTS vat_number text,            -- e.g. GB123456789 (matches invoices.vat_number / contractor_companies.vat_number)
  ADD COLUMN IF NOT EXISTS vat_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_number text,        -- Companies House reg no. (matches contractor_companies.company_registration_number)
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS postcode text;

COMMENT ON COLUMN public.contractor_tax_profiles.utr_encrypted IS
  'AES-256-GCM EncryptedField envelope of the contractor UTR. Never log / never expose to clients.';
COMMENT ON COLUMN public.contractor_tax_profiles.nino_encrypted IS
  'AES-256-GCM EncryptedField envelope of the contractor National Insurance number. Never log / never expose to clients.';

-- Defence in depth: revoke direct client SELECT of the encrypted identifiers.
-- Reads route through the service-role client and decrypt helpers.
REVOKE SELECT (date_of_birth_encrypted) ON public.profiles FROM authenticated;
REVOKE SELECT (utr_encrypted, nino_encrypted) ON public.contractor_tax_profiles FROM authenticated;

COMMIT;;
