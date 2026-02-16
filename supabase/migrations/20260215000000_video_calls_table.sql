-- Create video_calls table for scheduling and tracking video calls
CREATE TABLE IF NOT EXISTS public.video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Video Call',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'active', 'ended', 'cancelled', 'missed')),
  type TEXT NOT NULL DEFAULT 'consultation' CHECK (type IN ('consultation', 'site_visit', 'emergency', 'follow_up', 'inspection')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  recording_url TEXT,
  room_id TEXT,
  access_token TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create video_call_invitations table
CREATE TABLE IF NOT EXISTS public.video_call_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create video_call_ice_candidates table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.video_call_ice_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  type TEXT NOT NULL DEFAULT 'offer' CHECK (type IN ('offer', 'answer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create call_quality_metrics table
CREATE TABLE IF NOT EXISTS public.call_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_quality TEXT DEFAULT 'good',
  video_quality TEXT DEFAULT 'good',
  connection_stability TEXT DEFAULT 'stable',
  latency_ms INTEGER DEFAULT 0,
  packets_lost INTEGER DEFAULT 0,
  bandwidth INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_calls_initiator ON public.video_calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_participant ON public.video_calls(participant_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_job ON public.video_calls(job_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON public.video_calls(status);
CREATE INDEX IF NOT EXISTS idx_video_calls_scheduled ON public.video_calls(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_to ON public.video_call_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_video_call_invitations_call ON public.video_call_invitations(call_id);

-- Enable RLS
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_calls
CREATE POLICY "Users can view their own calls" ON public.video_calls
  FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = participant_id);

CREATE POLICY "Users can create calls" ON public.video_calls
  FOR INSERT WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update calls" ON public.video_calls
  FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = participant_id);

-- RLS Policies for video_call_invitations
CREATE POLICY "Users can view their invitations" ON public.video_call_invitations
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create invitations" ON public.video_call_invitations
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Recipients can update invitations" ON public.video_call_invitations
  FOR UPDATE USING (auth.uid() = to_user_id);

-- RLS Policies for ICE candidates
CREATE POLICY "Call participants can manage ICE candidates" ON public.video_call_ice_candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.video_calls
      WHERE id = call_id AND (initiator_id = auth.uid() OR participant_id = auth.uid())
    )
  );

-- RLS Policies for call quality metrics
CREATE POLICY "Users can insert their own metrics" ON public.call_quality_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view metrics for their calls" ON public.call_quality_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.video_calls
      WHERE id = call_id AND (initiator_id = auth.uid() OR participant_id = auth.uid())
    )
  );

-- Updated_at trigger for video_calls
CREATE OR REPLACE FUNCTION update_video_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_calls_updated_at
  BEFORE UPDATE ON public.video_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_video_calls_updated_at();
