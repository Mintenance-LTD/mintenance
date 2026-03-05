-- Agency activity audit log for agency-tier homeowners
CREATE TABLE IF NOT EXISTS public.agency_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agency_activity_owner ON public.agency_activity_log(owner_id, created_at DESC);
CREATE INDEX idx_agency_activity_type ON public.agency_activity_log(action_type);

ALTER TABLE public.agency_activity_log ENABLE ROW LEVEL SECURITY;

-- Owner can view their own activity log
CREATE POLICY "agency_activity_select_own"
  ON public.agency_activity_log FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- System can insert (via service role)
CREATE POLICY "agency_activity_insert_service"
  ON public.agency_activity_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Support tickets for dedicated support feature
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "support_tickets_select_own"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create tickets
CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tickets
CREATE POLICY "support_tickets_update_own"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
