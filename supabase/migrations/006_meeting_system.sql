-- Meeting System Tables
-- For scheduling and tracking site visits, consultations, and work sessions

-- Create contractor_meetings table
CREATE TABLE IF NOT EXISTS public.contractor_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    homeowner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('site_visit', 'consultation', 'work_session')),
    scheduled_datetime TIMESTAMPTZ NOT NULL,
    duration INTEGER DEFAULT 60, -- duration in minutes
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancelled_at TIMESTAMPTZ,
    rescheduled_from UUID REFERENCES public.contractor_meetings(id),
    rescheduled_to UUID REFERENCES public.contractor_meetings(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create meeting_updates table for tracking changes and communication
CREATE TABLE IF NOT EXISTS public.meeting_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES public.contractor_meetings(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL CHECK (update_type IN (
        'status_change',
        'rescheduled',
        'location_update',
        'contractor_enroute',
        'contractor_arrived',
        'meeting_started',
        'meeting_completed',
        'notes_added',
        'cancelled',
        'no_show'
    )),
    message TEXT NOT NULL,
    updated_by UUID NOT NULL REFERENCES public.profiles(id),
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_contractor_meetings_job_id ON public.contractor_meetings(job_id);
CREATE INDEX idx_contractor_meetings_contractor_id ON public.contractor_meetings(contractor_id);
CREATE INDEX idx_contractor_meetings_homeowner_id ON public.contractor_meetings(homeowner_id);
CREATE INDEX idx_contractor_meetings_status ON public.contractor_meetings(status);
CREATE INDEX idx_contractor_meetings_scheduled_datetime ON public.contractor_meetings(scheduled_datetime);
CREATE INDEX idx_contractor_meetings_created_at ON public.contractor_meetings(created_at DESC);

CREATE INDEX idx_meeting_updates_meeting_id ON public.meeting_updates(meeting_id);
CREATE INDEX idx_meeting_updates_updated_by ON public.meeting_updates(updated_by);
CREATE INDEX idx_meeting_updates_timestamp ON public.meeting_updates(timestamp DESC);

-- Enable RLS
ALTER TABLE public.contractor_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractor_meetings
-- Users can see meetings they're involved in
CREATE POLICY "Users can view their own meetings" ON public.contractor_meetings
    FOR SELECT
    USING (
        auth.uid() = contractor_id
        OR auth.uid() = homeowner_id
    );

-- Contractors and homeowners can create meetings
CREATE POLICY "Users can create meetings" ON public.contractor_meetings
    FOR INSERT
    WITH CHECK (
        auth.uid() = contractor_id
        OR auth.uid() = homeowner_id
    );

-- Users can update meetings they're involved in
CREATE POLICY "Users can update their own meetings" ON public.contractor_meetings
    FOR UPDATE
    USING (
        auth.uid() = contractor_id
        OR auth.uid() = homeowner_id
    );

-- Users can delete meetings they created
CREATE POLICY "Users can delete their own meetings" ON public.contractor_meetings
    FOR DELETE
    USING (
        auth.uid() = contractor_id
        OR auth.uid() = homeowner_id
    );

-- RLS Policies for meeting_updates
-- Users can view updates for meetings they're involved in
CREATE POLICY "Users can view meeting updates" ON public.meeting_updates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contractor_meetings
            WHERE contractor_meetings.id = meeting_updates.meeting_id
            AND (
                contractor_meetings.contractor_id = auth.uid()
                OR contractor_meetings.homeowner_id = auth.uid()
            )
        )
    );

-- Users can create updates for meetings they're involved in
CREATE POLICY "Users can create meeting updates" ON public.meeting_updates
    FOR INSERT
    WITH CHECK (
        auth.uid() = updated_by
        AND EXISTS (
            SELECT 1 FROM public.contractor_meetings
            WHERE contractor_meetings.id = meeting_updates.meeting_id
            AND (
                contractor_meetings.contractor_id = auth.uid()
                OR contractor_meetings.homeowner_id = auth.uid()
            )
        )
    );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at on contractor_meetings
DROP TRIGGER IF EXISTS update_contractor_meetings_updated_at ON public.contractor_meetings;
CREATE TRIGGER update_contractor_meetings_updated_at
    BEFORE UPDATE ON public.contractor_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create meeting status update when status changes
CREATE OR REPLACE FUNCTION create_meeting_status_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.meeting_updates (
            meeting_id,
            update_type,
            message,
            updated_by,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            'status_change',
            format('Meeting status changed from %s to %s', OLD.status, NEW.status),
            auth.uid(),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status update logging
DROP TRIGGER IF EXISTS log_meeting_status_change ON public.contractor_meetings;
CREATE TRIGGER log_meeting_status_change
    AFTER UPDATE ON public.contractor_meetings
    FOR EACH ROW
    EXECUTE FUNCTION create_meeting_status_update();

-- Add comment for documentation
COMMENT ON TABLE public.contractor_meetings IS 'Stores scheduled meetings between contractors and homeowners for site visits, consultations, and work sessions';
COMMENT ON TABLE public.meeting_updates IS 'Tracks all updates and changes to meetings for audit and communication purposes';