-- =============================================================================
-- Migration: Add contractor_clients, client_interactions, client_follow_up_tasks
-- Date: 2026-03-03
-- Fixes: "Could not find the table 'public.contractor_clients' in the schema cache"
-- =============================================================================

-- ============================================================================
-- contractor_clients
-- Used by: CRMDashboardScreen, ClientRepository, ClientAnalyticsService
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Client type from service layer
  type                  TEXT NOT NULL DEFAULT 'individual'
                          CHECK (type IN ('individual', 'business', 'property_manager')),

  -- Client type from UI layer (residential/commercial classification)
  client_type           TEXT NOT NULL DEFAULT 'residential'
                          CHECK (client_type IN ('residential', 'commercial', 'industrial', 'government')),

  -- Basic info
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  company_name          TEXT,

  -- Relationship management
  relationship_status   TEXT NOT NULL DEFAULT 'prospect'
                          CHECK (relationship_status IN ('prospect', 'active', 'inactive', 'former')),
  priority              TEXT NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high', 'vip')),
  source                TEXT,
  tags                  TEXT[] DEFAULT '{}',
  notes                 TEXT DEFAULT '',

  -- Address stored as JSONB: { street, city, state, zipCode, country, coordinates? }
  address               JSONB DEFAULT '{}'::jsonb,

  -- Preferences: { communicationMethod, bestTimeToContact, serviceTypes, budgetRange, urgencyPreference, paymentMethod }
  preferences           JSONB DEFAULT '{}'::jsonb,

  -- Lifecycle: { stage, stageDate, totalJobs, totalValue, avgJobValue, lifetimeValue, satisfactionScore, retentionRisk }
  lifecycle             JSONB DEFAULT '{}'::jsonb,

  -- Financials: { totalSpent, outstandingBalance, paymentHistory, averagePaymentTime, paymentRating }
  financials            JSONB DEFAULT '{}'::jsonb,

  -- Properties list JSONB array
  properties            JSONB DEFAULT '[]'::jsonb,

  -- Denormalised analytics columns (updated by app logic / triggers)
  total_jobs            INTEGER DEFAULT 0,
  total_revenue         NUMERIC(10, 2) DEFAULT 0,
  last_job_date         TIMESTAMPTZ,
  satisfaction_score    NUMERIC(4, 2),
  payment_history_score NUMERIC(4, 2) DEFAULT 5,
  churn_risk_score      NUMERIC(4, 2) DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: one email per contractor (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_clients_contractor_email
  ON public.contractor_clients(contractor_id, email);

CREATE INDEX IF NOT EXISTS idx_contractor_clients_contractor_id
  ON public.contractor_clients(contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_clients_status
  ON public.contractor_clients(contractor_id, relationship_status);

CREATE INDEX IF NOT EXISTS idx_contractor_clients_priority
  ON public.contractor_clients(contractor_id, priority);

-- RLS
ALTER TABLE public.contractor_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_clients_select"
  ON public.contractor_clients FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "contractor_clients_insert"
  ON public.contractor_clients FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "contractor_clients_update"
  ON public.contractor_clients FOR UPDATE
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "contractor_clients_delete"
  ON public.contractor_clients FOR DELETE
  USING (contractor_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER set_contractor_clients_updated_at
  BEFORE UPDATE ON public.contractor_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- client_interactions
-- Used by: ClientRepository.logInteraction()
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_interactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES public.contractor_clients(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
                   CHECK (type IN ('call', 'email', 'meeting', 'site_visit', 'quote_sent', 'invoice_sent', 'follow_up', 'other')),
  subject        TEXT NOT NULL,
  description    TEXT,
  outcome        TEXT,
  next_action    TEXT,
  scheduled_date TIMESTAMPTZ,
  duration       INTEGER, -- minutes
  attachments    TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id
  ON public.client_interactions(client_id);

CREATE INDEX IF NOT EXISTS idx_client_interactions_created_at
  ON public.client_interactions(client_id, created_at DESC);

-- RLS via join to contractor_clients
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_interactions_select"
  ON public.client_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_clients cc
      WHERE cc.id = client_id AND cc.contractor_id = auth.uid()
    )
  );

CREATE POLICY "client_interactions_insert"
  ON public.client_interactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractor_clients cc
      WHERE cc.id = client_id AND cc.contractor_id = auth.uid()
    )
  );

-- ============================================================================
-- client_follow_up_tasks
-- Used by: ClientRepository.getFollowUpTasks(), createFollowUpTask(), completeFollowUpTask()
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_follow_up_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES public.contractor_clients(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
                   CHECK (type IN ('call', 'email', 'meeting', 'quote', 'check_in')),
  title          TEXT NOT NULL,
  description    TEXT,
  due_date       TIMESTAMPTZ NOT NULL,
  priority       TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
  completed_date TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_follow_up_tasks_client_id
  ON public.client_follow_up_tasks(client_id);

CREATE INDEX IF NOT EXISTS idx_client_follow_up_tasks_due_date
  ON public.client_follow_up_tasks(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_client_follow_up_tasks_status
  ON public.client_follow_up_tasks(status);

-- RLS via join to contractor_clients
ALTER TABLE public.client_follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_follow_up_tasks_select"
  ON public.client_follow_up_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_clients cc
      WHERE cc.id = client_id AND cc.contractor_id = auth.uid()
    )
  );

CREATE POLICY "client_follow_up_tasks_insert"
  ON public.client_follow_up_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractor_clients cc
      WHERE cc.id = client_id AND cc.contractor_id = auth.uid()
    )
  );

CREATE POLICY "client_follow_up_tasks_update"
  ON public.client_follow_up_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_clients cc
      WHERE cc.id = client_id AND cc.contractor_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER set_client_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.client_follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
