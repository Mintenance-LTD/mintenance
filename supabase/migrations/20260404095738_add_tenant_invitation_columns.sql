-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Add invitation and account linking columns to property_tenants
ALTER TABLE public.property_tenants
  ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for fast invitation token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_tenants_invitation_token
  ON public.property_tenants(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Index for tenant user lookups
CREATE INDEX IF NOT EXISTS idx_property_tenants_user_id
  ON public.property_tenants(user_id)
  WHERE user_id IS NOT NULL;

-- RLS: Tenants can view their linked properties
DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenants can view linked properties" ON public.properties;
  CREATE POLICY "Tenants can view linked properties"
    ON public.properties FOR SELECT
    USING (
      id IN (
        SELECT property_id FROM public.property_tenants
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
