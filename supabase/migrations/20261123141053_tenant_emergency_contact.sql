ALTER TABLE public.properties
  ADD COLUMN tenant_emergency_phone text
    CHECK (tenant_emergency_phone IS NULL OR tenant_emergency_phone ~ '^\+?[0-9]{7,15}$');

COMMENT ON COLUMN public.properties.tenant_emergency_phone IS
  'Optional team-approved phone number shown to holders of active tenant reporting links.';
