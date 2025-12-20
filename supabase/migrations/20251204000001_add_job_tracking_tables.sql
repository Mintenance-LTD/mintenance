-- Create job_views table to track when contractors view job details
CREATE TABLE IF NOT EXISTS public.job_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 1,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, contractor_id)
);

-- Add missing columns if table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'job_views'
        AND column_name = 'view_count'
    ) THEN
        ALTER TABLE public.job_views ADD COLUMN view_count INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'job_views'
        AND column_name = 'last_viewed_at'
    ) THEN
        ALTER TABLE public.job_views ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        -- Backfill existing rows
        UPDATE public.job_views SET last_viewed_at = viewed_at WHERE last_viewed_at IS NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_contractor_id ON public.job_views(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON public.job_views(viewed_at);

-- Add trigger to update last_viewed_at and increment view_count on conflict
CREATE OR REPLACE FUNCTION update_job_view()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_viewed_at = NOW();
    NEW.view_count = OLD.view_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create saved_jobs table if it doesn't exist (for tracking jobs contractors save)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(job_id, contractor_id)
);

-- Add saved_at column if it doesn't exist (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'saved_jobs'
        AND column_name = 'saved_at'
    ) THEN
        ALTER TABLE public.saved_jobs ADD COLUMN saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        -- Backfill existing rows
        UPDATE public.saved_jobs SET saved_at = created_at WHERE saved_at IS NULL;
    END IF;
END $$;

-- Create indexes for saved_jobs
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_contractor_id ON public.saved_jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_saved_at ON public.saved_jobs(saved_at);

-- Create contractor_job_interactions view for easy querying
CREATE OR REPLACE VIEW contractor_job_interactions AS
SELECT
    j.id as job_id,
    j.title,
    j.description,
    j.budget,
    j.status,
    j.homeowner_id,
    j.location,
    j.category,
    j.priority,
    j.created_at as job_created_at,
    jv.contractor_id,
    jv.viewed_at as first_viewed_at,
    COALESCE(jv.last_viewed_at, jv.viewed_at) as last_viewed_at,
    COALESCE(jv.view_count, 1) as view_count,
    COALESCE(sj.saved_at, sj.created_at) as saved_at,
    b.id as bid_id,
    b.amount as bid_amount,
    b.status as bid_status,
    b.created_at as bid_created_at,
    CASE
        WHEN b.id IS NOT NULL THEN 'bid_placed'
        WHEN sj.id IS NOT NULL THEN 'saved'
        WHEN jv.id IS NOT NULL THEN 'viewed'
        ELSE 'none'
    END as interaction_type,
    GREATEST(
        COALESCE(jv.last_viewed_at, jv.viewed_at),
        COALESCE(sj.saved_at, sj.created_at),
        b.created_at
    ) as last_interaction_at
FROM jobs j
LEFT JOIN job_views jv ON j.id = jv.job_id
LEFT JOIN saved_jobs sj ON j.id = sj.job_id AND (jv.contractor_id = sj.contractor_id OR jv.contractor_id IS NULL)
LEFT JOIN bids b ON j.id = b.job_id AND (jv.contractor_id = b.contractor_id OR sj.contractor_id = b.contractor_id);

-- Create notifications for homeowners when contractors interact with their jobs
CREATE TABLE IF NOT EXISTS public.job_interaction_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'saved', 'bid_placed', 'bid_updated')),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_job_notifications_homeowner ON public.job_interaction_notifications(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_job ON public.job_interaction_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_read ON public.job_interaction_notifications(read);
CREATE INDEX IF NOT EXISTS idx_job_notifications_created ON public.job_interaction_notifications(created_at);

-- Function to create notifications when contractors interact with jobs
CREATE OR REPLACE FUNCTION notify_homeowner_of_interaction()
RETURNS TRIGGER AS $$
DECLARE
    v_homeowner_id UUID;
    v_contractor_name TEXT;
    v_job_title TEXT;
    v_message TEXT;
BEGIN
    -- Get homeowner_id and job title
    SELECT homeowner_id, title INTO v_homeowner_id, v_job_title
    FROM jobs WHERE id = NEW.job_id;

    -- Get contractor name
    SELECT COALESCE(first_name || ' ' || last_name, company_name, email) INTO v_contractor_name
    FROM users WHERE id = NEW.contractor_id;

    -- Create appropriate message based on trigger source
    IF TG_TABLE_NAME = 'job_views' THEN
        v_message := v_contractor_name || ' viewed your job: ' || v_job_title;

        -- Only create notification for first view
        IF NEW.view_count = 1 THEN
            INSERT INTO job_interaction_notifications (
                job_id, homeowner_id, contractor_id, interaction_type, message
            ) VALUES (
                NEW.job_id, v_homeowner_id, NEW.contractor_id, 'viewed', v_message
            );
        END IF;

    ELSIF TG_TABLE_NAME = 'saved_jobs' THEN
        v_message := v_contractor_name || ' saved your job: ' || v_job_title;

        INSERT INTO job_interaction_notifications (
            job_id, homeowner_id, contractor_id, interaction_type, message
        ) VALUES (
            NEW.job_id, v_homeowner_id, NEW.contractor_id, 'saved', v_message
        );

    ELSIF TG_TABLE_NAME = 'bids' THEN
        IF TG_OP = 'INSERT' THEN
            v_message := v_contractor_name || ' placed a bid on: ' || v_job_title;
            INSERT INTO job_interaction_notifications (
                job_id, homeowner_id, contractor_id, interaction_type, message
            ) VALUES (
                NEW.job_id, v_homeowner_id, NEW.contractor_id, 'bid_placed', v_message
            );
        ELSIF TG_OP = 'UPDATE' AND OLD.amount != NEW.amount THEN
            v_message := v_contractor_name || ' updated their bid on: ' || v_job_title;
            INSERT INTO job_interaction_notifications (
                job_id, homeowner_id, contractor_id, interaction_type, message
            ) VALUES (
                NEW.job_id, v_homeowner_id, NEW.contractor_id, 'bid_updated', v_message
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for notifications
DROP TRIGGER IF EXISTS notify_on_job_view ON job_views;
CREATE TRIGGER notify_on_job_view
    AFTER INSERT OR UPDATE ON job_views
    FOR EACH ROW
    EXECUTE FUNCTION notify_homeowner_of_interaction();

DROP TRIGGER IF EXISTS notify_on_job_save ON saved_jobs;
CREATE TRIGGER notify_on_job_save
    AFTER INSERT ON saved_jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_homeowner_of_interaction();

DROP TRIGGER IF EXISTS notify_on_bid ON bids;
CREATE TRIGGER notify_on_bid
    AFTER INSERT OR UPDATE ON bids
    FOR EACH ROW
    EXECUTE FUNCTION notify_homeowner_of_interaction();

-- Grant appropriate permissions
GRANT ALL ON public.job_views TO authenticated;
GRANT ALL ON public.saved_jobs TO authenticated;
GRANT ALL ON public.job_interaction_notifications TO authenticated;
GRANT SELECT ON public.contractor_job_interactions TO authenticated;

-- RLS Policies for job_views
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors can view their own job views" ON public.job_views;
CREATE POLICY "Contractors can view their own job views"
    ON public.job_views
    FOR ALL
    USING (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "Homeowners can see who viewed their jobs" ON public.job_views;
CREATE POLICY "Homeowners can see who viewed their jobs"
    ON public.job_views
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_views.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

-- RLS Policies for saved_jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors can manage their saved jobs" ON public.saved_jobs;
CREATE POLICY "Contractors can manage their saved jobs"
    ON public.saved_jobs
    FOR ALL
    USING (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "Homeowners can see who saved their jobs" ON public.saved_jobs;
CREATE POLICY "Homeowners can see who saved their jobs"
    ON public.saved_jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = saved_jobs.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

-- RLS Policies for notifications
ALTER TABLE public.job_interaction_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.job_interaction_notifications;
CREATE POLICY "Users can see their own notifications"
    ON public.job_interaction_notifications
    FOR ALL
    USING (auth.uid() = homeowner_id OR auth.uid() = contractor_id);