-- Keep manual account review and formal trade verification distinct. A recent,
-- pending mobile declaration can be queued for an administrator to review.
-- Missing or rejected individual evidence never closes an open assignment.
CREATE INDEX IF NOT EXISTS credential_verifications_latest_review_idx
  ON public.credential_verifications (user_id, register, created_at DESC, id DESC);

CREATE OR REPLACE VIEW public.admin_verification_queue WITH (security_invoker = true) AS
SELECT p.id, p.email, p.first_name, p.last_name, p.phone, p.role,
       p.company_name, p.license_number, p.insurance_expiry_date,
       p.business_address, p.admin_verified, p.skills, p.rating,
       p.total_jobs_completed, p.city, p.created_at, p.updated_at,
       p.background_check_status,
       GREATEST(identity_doc.created_at, business_doc.created_at, credential.submitted_at) AS latest_evidence_at,
       COALESCE(identity_doc.review_status IN ('pending','approved'), false) AS identity_submitted,
       COALESCE(business_doc.review_status IN ('pending','approved'), false) AS business_submitted,
       CASE
         WHEN p.admin_verified IS TRUE THEN 'verified'
         WHEN p.background_check_status = 'rejected' THEN 'rejected'
         WHEN identity_doc.review_status IN ('pending','approved')
          AND business_doc.review_status IN ('pending','approved') THEN 'ready'
         WHEN credential.submitted_at IS NOT NULL
          AND NULLIF(btrim(p.company_name), '') IS NOT NULL
          AND NULLIF(btrim(p.business_address), '') IS NOT NULL THEN 'ready'
         ELSE 'incomplete'
       END AS queue_status,
       credential.submitted_at IS NOT NULL AS mobile_credential_submitted,
       p.verification_status IS NOT DISTINCT FROM 'pending' AS mobile_review_requested,
       NULLIF(btrim(p.company_name), '') IS NOT NULL
        AND NULLIF(btrim(p.business_address), '') IS NOT NULL AS business_details_submitted
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT d.review_status, d.created_at FROM public.contractor_documents d
  WHERE d.contractor_id = p.id AND d.verification_type = 'identity'
  ORDER BY d.created_at DESC, d.id DESC LIMIT 1
) identity_doc ON true
LEFT JOIN LATERAL (
  SELECT d.review_status, d.created_at FROM public.contractor_documents d
  WHERE d.contractor_id = p.id AND d.verification_type = 'business_licence'
  ORDER BY d.created_at DESC, d.id DESC LIMIT 1
) business_doc ON true
LEFT JOIN LATERAL (
  SELECT max(latest.created_at) AS submitted_at
  FROM (
    SELECT DISTINCT ON (c.register) c.status, c.registration_number, c.created_at, c.expires_at
    FROM public.credential_verifications c
    WHERE c.user_id = p.id
    ORDER BY c.register, c.created_at DESC, c.id DESC
  ) latest
  WHERE latest.status = 'pending'
    AND NULLIF(btrim(latest.registration_number), '') IS NOT NULL
    AND (latest.expires_at IS NULL OR latest.expires_at > now())
) credential ON p.verification_status = 'pending'
WHERE p.role = 'contractor' AND p.deleted_at IS NULL;

REVOKE ALL ON public.admin_verification_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_verification_queue TO service_role;
