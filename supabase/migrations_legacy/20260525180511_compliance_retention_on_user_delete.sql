
BEGIN;

ALTER TABLE public.compliance_certificates ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.compliance_certificates DROP CONSTRAINT IF EXISTS compliance_certificates_owner_id_fkey;
ALTER TABLE public.compliance_certificates
  ADD CONSTRAINT compliance_certificates_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.compliance_certificates.owner_id IS
  'Homeowner / landlord who commissioned the certificate. Goes NULL when the user deletes their account so the certificate itself survives the GDPR-mandated 2yr (gas) / 5yr (EICR) retention window. Application code requires this on INSERT.';

ALTER TABLE public.contractor_certifications ALTER COLUMN contractor_id DROP NOT NULL;
ALTER TABLE public.contractor_certifications DROP CONSTRAINT IF EXISTS contractor_certifications_contractor_id_fkey;
ALTER TABLE public.contractor_certifications
  ADD CONSTRAINT contractor_certifications_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contractor_certifications.contractor_id IS
  'Contractor who held the certification. NULL after account deletion; the certification evidence persists for regulator queries (DBS / Gas Safe / NICEIC retention). Application code requires this on INSERT.';

ALTER TABLE public.contractor_dbs_checks ALTER COLUMN contractor_id DROP NOT NULL;
ALTER TABLE public.contractor_dbs_checks DROP CONSTRAINT IF EXISTS contractor_dbs_checks_contractor_id_fkey;
ALTER TABLE public.contractor_dbs_checks
  ADD CONSTRAINT contractor_dbs_checks_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contractor_dbs_checks.contractor_id IS
  'DBS check subject. NULL after account deletion; the check record persists for the duration of relevance + 6 months per DBS guidance. Application code requires this on INSERT.';

ALTER TABLE public.contractor_insurance ALTER COLUMN contractor_id DROP NOT NULL;
ALTER TABLE public.contractor_insurance DROP CONSTRAINT IF EXISTS contractor_insurance_contractor_id_fkey;
ALTER TABLE public.contractor_insurance
  ADD CONSTRAINT contractor_insurance_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contractor_insurance.contractor_id IS
  'Insured contractor. NULL after account deletion; the policy record persists. Employer''s Liability Insurance policies must be retained for 40 yrs from end-of-policy per ELI Regs 1998 reg 4. Application code requires this on INSERT.';

ALTER TABLE public.contractor_licenses ALTER COLUMN contractor_id DROP NOT NULL;
ALTER TABLE public.contractor_licenses DROP CONSTRAINT IF EXISTS contractor_licenses_contractor_id_fkey;
ALTER TABLE public.contractor_licenses
  ADD CONSTRAINT contractor_licenses_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contractor_licenses.contractor_id IS
  'Licence holder. NULL after account deletion; the licence record persists for trade-body audit. Application code requires this on INSERT.';

COMMIT;
;
