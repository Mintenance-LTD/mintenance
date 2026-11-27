-- Service-only current settings; a saved inspection keeps its own snapshot.
CREATE TABLE public.organization_document_branding (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  accent_colour text NOT NULL CHECK (accent_colour ~ '^#[0-9A-F]{6}$'),
  logo_base64 text CHECK (char_length(logo_base64) <= 64000 AND logo_base64 ~ '^[A-Za-z0-9+/]+={0,2}$')
);
ALTER TABLE public.organization_document_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_document_branding FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.organization_document_branding TO service_role;

ALTER TABLE public.property_inspection_reports ADD COLUMN document_branding jsonb;

CREATE FUNCTION public.capture_inspection_document_branding()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  SELECT jsonb_build_object('displayName', b.display_name, 'accentColour', b.accent_colour, 'logoBase64', b.logo_base64)
    INTO NEW.document_branding
    FROM public.properties p
    JOIN public.organizations o ON o.id = p.org_id
    JOIN public.organization_document_branding b ON b.org_id = o.id
    WHERE p.id = NEW.property_id AND o.organization_type IN ('portfolio', 'agency', 'property_management');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_inspection_document_branding() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_inspection_document_branding() TO service_role;
CREATE TRIGGER capture_inspection_document_branding
BEFORE INSERT ON public.property_inspection_reports
FOR EACH ROW EXECUTE FUNCTION public.capture_inspection_document_branding();
