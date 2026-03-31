-- Add missing indexes for frequently queried columns

-- refresh_tokens.token_hash: used in every token rotation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);

-- building_assessments composite index for job page queries
CREATE INDEX IF NOT EXISTS idx_building_assessments_job_created ON public.building_assessments(job_id, created_at DESC);

-- notifications composite index for user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
