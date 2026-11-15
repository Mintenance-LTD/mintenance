-- Applicability is an owner's recorded assessment, not a certificate or legal finding.
CREATE TABLE public.property_compliance_applicability (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  cert_type text NOT NULL CHECK (cert_type IN ('gas_safety','eicr','epc','smoke_alarm','co_detector')),
  decision text NOT NULL CHECK (decision IN ('unknown','applicable','not_applicable')),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 1000),
  updated_by uuid NOT NULL REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id,cert_type),
  CHECK (decision <> 'not_applicable' OR length(btrim(reason)) >= 5)
);
ALTER TABLE public.property_compliance_applicability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_compliance_applicability FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.property_compliance_applicability TO service_role;
