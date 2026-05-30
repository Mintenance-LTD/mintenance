-- =====================================================================
-- Compliance retention on user delete, 2026-05-27.
--
-- audit-P1-10 — UK retention statutes require that gas safety
-- certificates (Gas Safety Regs 1998, regulation 36(3): 2 years),
-- EICR / electrical certificates (BS 7671 + DCLG: 5 years), DBS
-- check evidence (DBS guidance: typically retained for the duration
-- of the relevant role + 6 months), and employer's-liability insurance
-- policies (ELI Regs 1998, regulation 4: 40 years from the end of the
-- policy) must survive even after the underlying user (homeowner /
-- contractor) deletes their account.
--
-- Today the five compliance tables FK the user with ON DELETE CASCADE
-- AND the column is NOT NULL, so the GDPR delete_user_data RPC
-- atomically wipes legally-mandated records when it calls
-- DELETE FROM profiles. That's a regulatory exposure even though
-- the records are otherwise correct.
--
-- The fix preserves the artifact (certificate file URL, expiry date,
-- inspector name, scope, etc.) while severing the PII link to the
-- deleted profile. After the delete:
--   - The owner / contractor column goes NULL (the user is gone)
--   - The remaining columns (the document itself + dates + scope)
--     survive for the statutory retention window
--   - The RLS policies on these tables filter on
--     auth.uid() = <column>, which excludes NULL — so the rows are
--     invisible to all logged-in users; only service-role queries
--     (admin / regulator subpoena / scheduled retention cron) can
--     surface them.
--
-- This is the documented GDPR pattern for legal-obligation retention
-- (UK GDPR Art. 6(1)(c)) — the personal data is erased, the legally
-- required artifact persists.
--
-- A separate follow-up adds a scheduled cron to physically delete the
-- now-orphan rows once the per-document retention window expires.
-- That cron isn't in scope for this migration.
-- =====================================================================

BEGIN;

-- ----- compliance_certificates (gas safety + EICR + others) ----------

ALTER TABLE public.compliance_certificates
  ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_owner_id_fkey;
ALTER TABLE public.compliance_certificates
  ADD CONSTRAINT compliance_certificates_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.compliance_certificates.owner_id IS
  'Homeowner / landlord who commissioned the certificate. Goes NULL when the user deletes their account so the certificate itself survives the GDPR-mandated 2yr (gas) / 5yr (EICR) retention window. Application code requires this on INSERT.';

-- ----- contractor_certifications (CSCS / Gas Safe / NICEIC etc.) ----

ALTER TABLE public.contractor_certifications
  ALTER COLUMN contractor_id DROP NOT NULL;

ALTER TABLE public.contractor_certifications
  DROP CONSTRAINT IF EXISTS contractor_certifications_contractor_id_fkey;
ALTER TABLE public.contractor_certifications
  ADD CONSTRAINT contractor_certifications_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contractor_certifications.contractor_id IS
  'Contractor who held the certification. NULL after account deletion; the certification evidence persists for regulator queries (DBS / Gas Safe / NICEIC retention). Application code requires this on INSERT.';

-- ----- contractor_dbs_checks ----------------------------------------

ALTER TABLE public.contractor_dbs_checks
  ALTER COLUMN contractor_id DROP NOT NULL;

ALTER TABLE public.contractor_dbs_checks
  DROP CONSTRAINT IF EXISTS contractor_dbs_checks_contractor_id_fkey;
ALTER TABLE public.contractor_dbs_checks
  ADD CONSTRAINT contractor_dbs_checks_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contractor_dbs_checks.contractor_id IS
  'DBS check subject. NULL after account deletion; the check record persists for the duration of relevance + 6 months per DBS guidance. Application code requires this on INSERT.';

-- ----- contractor_insurance (ELI especially — 40 yr retention) ------

ALTER TABLE public.contractor_insurance
  ALTER COLUMN contractor_id DROP NOT NULL;

ALTER TABLE public.contractor_insurance
  DROP CONSTRAINT IF EXISTS contractor_insurance_contractor_id_fkey;
ALTER TABLE public.contractor_insurance
  ADD CONSTRAINT contractor_insurance_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contractor_insurance.contractor_id IS
  'Insured contractor. NULL after account deletion; the policy record persists. Employer''s Liability Insurance policies must be retained for 40 yrs from end-of-policy per ELI Regs 1998 reg 4. Application code requires this on INSERT.';

-- ----- contractor_licenses ------------------------------------------

ALTER TABLE public.contractor_licenses
  ALTER COLUMN contractor_id DROP NOT NULL;

ALTER TABLE public.contractor_licenses
  DROP CONSTRAINT IF EXISTS contractor_licenses_contractor_id_fkey;
ALTER TABLE public.contractor_licenses
  ADD CONSTRAINT contractor_licenses_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contractor_licenses.contractor_id IS
  'Licence holder. NULL after account deletion; the licence record persists for trade-body audit. Application code requires this on INSERT.';

COMMIT;

-- =====================================================================
-- Rollback (manual)
-- =====================================================================
-- BEGIN;
-- ALTER TABLE public.compliance_certificates ALTER COLUMN owner_id SET NOT NULL;
-- ALTER TABLE public.compliance_certificates DROP CONSTRAINT compliance_certificates_owner_id_fkey;
-- ALTER TABLE public.compliance_certificates ADD CONSTRAINT compliance_certificates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- -- ... repeat for the other four tables.
-- COMMIT;
