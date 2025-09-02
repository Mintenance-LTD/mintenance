-- =====================================================
-- Mintenance Neighborhood Network Effects Migration
-- Creates viral growth system through local communities
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial data if available

-- =====================================================
-- CORE NEIGHBORHOOD TABLES
-- =====================================================

-- Neighborhoods: Geographic communities based on postcodes
CREATE TABLE neighborhoods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., "Westminster", "Canary Wharf"
    postcode_prefix VARCHAR(10) NOT NULL UNIQUE, -- e.g., "SW1", "E14"
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_km DECIMAL(4, 2) NOT NULL DEFAULT 2.0, -- Coverage radius
    member_count INTEGER DEFAULT 0,
    active_jobs_count INTEGER DEFAULT 0,
    completed_jobs_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Neighborhood relationships
CREATE TABLE user_neighborhoods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    postcode VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    verified BOOLEAN DEFAULT FALSE, -- Address verification status
    primary_residence BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, neighborhood_id)
);

-- =====================================================
-- CONTRACTOR RANKING SYSTEM
-- =====================================================

-- Contractor rankings within neighborhoods
CREATE TABLE contractor_neighborhood_rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    contractor_name VARCHAR(255) NOT NULL,
    contractor_avatar TEXT,
    jobs_completed INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    specialties TEXT[] DEFAULT '{}', -- Array of specialties
    response_time_avg INTEGER DEFAULT 0, -- Average response time in minutes
    community_endorsements INTEGER DEFAULT 0,
    rank_position INTEGER DEFAULT 999,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id, neighborhood_id)
);

-- =====================================================
-- COMMUNITY ENDORSEMENT SYSTEM
-- =====================================================

-- Community endorsements for contractors
CREATE TABLE community_endorsements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    endorser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL, -- e.g., "Plumbing Expertise", "Reliability"
    message TEXT, -- Optional message from endorser
    weight DECIMAL(3, 2) DEFAULT 1.0, -- Endorsement weight based on endorser reputation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate endorsements for same skill
    UNIQUE(endorser_id, contractor_id, skill)
);

-- User community statistics for endorsement weighting
CREATE TABLE user_community_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    jobs_completed INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    endorsements_given INTEGER DEFAULT 0,
    endorsements_received INTEGER DEFAULT 0,
    referrals_made INTEGER DEFAULT 0,
    referrals_successful INTEGER DEFAULT 0,
    reputation_score DECIMAL(5, 2) DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, neighborhood_id)
);

-- =====================================================
-- NEIGHBOR REFERRAL SYSTEM
-- =====================================================

-- Neighbor referrals for viral growth
CREATE TABLE neighbor_referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null until they sign up
    referee_contact VARCHAR(255) NOT NULL, -- Email or phone for outreach
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
    reward_points INTEGER DEFAULT 50,
    referral_code VARCHAR(20) UNIQUE, -- Unique code for tracking
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- COMMUNITY ACTIVITY TRACKING
-- =====================================================

-- Neighborhood activity feed for engagement
CREATE TABLE neighborhood_activity_feed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'job_completed', 'contractor_joined', 'review_posted', etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Additional activity data
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'neighborhood', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community champions leaderboard
CREATE TABLE community_champions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    avatar TEXT,
    champion_type VARCHAR(50) NOT NULL, -- 'referral_master', 'review_hero', 'quality_advocate', 'helpful_neighbor'
    score INTEGER DEFAULT 0,
    badge_level VARCHAR(20) DEFAULT 'bronze' CHECK (badge_level IN ('bronze', 'silver', 'gold', 'platinum')),
    achievements TEXT[] DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, neighborhood_id, champion_type)
);

-- =====================================================
-- VIRAL GROWTH TRACKING
-- =====================================================

-- Job success stories for social proof
CREATE TABLE neighborhood_job_successes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contractor_name VARCHAR(255) NOT NULL,
    homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    homeowner_name VARCHAR(100) NOT NULL, -- First name only for privacy
    completion_date TIMESTAMPTZ NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    before_photo TEXT,
    after_photo TEXT,
    success_story TEXT,
    visibility VARCHAR(20) DEFAULT 'neighborhood' CHECK (visibility IN ('public', 'neighborhood', 'private')),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service statistics per neighborhood
CREATE TABLE neighborhood_service_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL, -- 'plumbing', 'electrical', etc.
    jobs_count INTEGER DEFAULT 0,
    average_price DECIMAL(10, 2) DEFAULT 0.0,
    satisfaction_rating DECIMAL(3, 2) DEFAULT 0.0,
    trending_score DECIMAL(3, 2) DEFAULT 0.0, -- 0-1, calculated from recent activity
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(neighborhood_id, service_type)
);

-- =====================================================
-- VIRAL MECHANICS & GAMIFICATION
-- =====================================================

-- Neighborhood challenges for engagement
CREATE TABLE neighborhood_challenges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'jobs_completed', 'referrals_made', 'endorsements_given'
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 100,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User participation in challenges
CREATE TABLE neighborhood_challenge_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES neighborhood_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contribution INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    rewards_claimed BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(challenge_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Neighborhood lookups
CREATE INDEX idx_neighborhoods_postcode ON neighborhoods(postcode_prefix);
CREATE INDEX idx_neighborhoods_location ON neighborhoods(center_latitude, center_longitude);
CREATE INDEX idx_neighborhoods_stats ON neighborhoods(member_count, completed_jobs_count);

-- User-neighborhood relationships
CREATE INDEX idx_user_neighborhoods_user ON user_neighborhoods(user_id);
CREATE INDEX idx_user_neighborhoods_neighborhood ON user_neighborhoods(neighborhood_id);
CREATE INDEX idx_user_neighborhoods_postcode ON user_neighborhoods(postcode);

-- Contractor rankings
CREATE INDEX idx_contractor_rankings_neighborhood ON contractor_neighborhood_rankings(neighborhood_id);
CREATE INDEX idx_contractor_rankings_contractor ON contractor_neighborhood_rankings(contractor_id);
CREATE INDEX idx_contractor_rankings_position ON contractor_neighborhood_rankings(rank_position);
CREATE INDEX idx_contractor_rankings_rating ON contractor_neighborhood_rankings(average_rating DESC);

-- Community endorsements
CREATE INDEX idx_endorsements_contractor ON community_endorsements(contractor_id);
CREATE INDEX idx_endorsements_neighborhood ON community_endorsements(neighborhood_id);
CREATE INDEX idx_endorsements_endorser ON community_endorsements(endorser_id);
CREATE INDEX idx_endorsements_skill ON community_endorsements(skill);

-- Activity feed
CREATE INDEX idx_activity_feed_neighborhood ON neighborhood_activity_feed(neighborhood_id);
CREATE INDEX idx_activity_feed_created ON neighborhood_activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_type ON neighborhood_activity_feed(activity_type);

-- Referrals
CREATE INDEX idx_referrals_referrer ON neighbor_referrals(referrer_id);
CREATE INDEX idx_referrals_neighborhood ON neighbor_referrals(neighborhood_id);
CREATE INDEX idx_referrals_status ON neighbor_referrals(status);
CREATE INDEX idx_referrals_code ON neighbor_referrals(referral_code);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_neighborhood_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_community_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighbor_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_champions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_job_successes ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_service_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_challenge_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Neighborhoods: Public read, admin write
CREATE POLICY "Neighborhoods are publicly viewable"
    ON neighborhoods FOR SELECT
    TO authenticated
    USING (true);

-- User neighborhoods: Users can see their own, others in same neighborhood
CREATE POLICY "Users can view their own neighborhood memberships"
    ON user_neighborhoods FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view others in same neighborhood"
    ON user_neighborhoods FOR SELECT
    TO authenticated
    USING (
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

-- Contractor rankings: Neighborhood members can view
CREATE POLICY "Neighborhood members can view contractor rankings"
    ON contractor_neighborhood_rankings FOR SELECT
    TO authenticated
    USING (
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

-- Community endorsements: Neighborhood members can view and create
CREATE POLICY "Users can view endorsements in their neighborhoods"
    ON community_endorsements FOR SELECT
    TO authenticated
    USING (
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create endorsements in their neighborhoods"
    ON community_endorsements FOR INSERT
    TO authenticated
    WITH CHECK (
        endorser_id = auth.uid() AND
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

-- Referrals: Users can manage their own referrals
CREATE POLICY "Users can manage their own referrals"
    ON neighbor_referrals FOR ALL
    TO authenticated
    USING (referrer_id = auth.uid() OR referee_id = auth.uid());

-- Activity feed: Neighborhood members can view
CREATE POLICY "Neighborhood members can view activity feed"
    ON neighborhood_activity_feed FOR SELECT
    TO authenticated
    USING (
        visibility = 'public' OR
        (visibility = 'neighborhood' AND neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        ))
    );

-- Champions: Neighborhood members can view
CREATE POLICY "Neighborhood members can view champions"
    ON community_champions FOR SELECT
    TO authenticated
    USING (
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

-- Job successes: Based on visibility settings
CREATE POLICY "Users can view job successes based on visibility"
    ON neighborhood_job_successes FOR SELECT
    TO authenticated
    USING (
        visibility = 'public' OR
        (visibility = 'neighborhood' AND neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )) OR
        homeowner_id = auth.uid() OR
        contractor_id = auth.uid()
    );

-- Service stats: Neighborhood members can view
CREATE POLICY "Neighborhood members can view service stats"
    ON neighborhood_service_stats FOR SELECT
    TO authenticated
    USING (
        neighborhood_id IN (
            SELECT neighborhood_id FROM user_neighborhoods WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- STORED FUNCTIONS
-- =====================================================

-- Function to increment contractor endorsement count
CREATE OR REPLACE FUNCTION increment_contractor_endorsements(
    contractor_id UUID,
    neighborhood_id UUID
) RETURNS VOID AS $$
BEGIN
    INSERT INTO contractor_neighborhood_rankings 
        (contractor_id, neighborhood_id, community_endorsements)
    VALUES 
        (contractor_id, neighborhood_id, 1)
    ON CONFLICT (contractor_id, neighborhood_id) 
    DO UPDATE SET 
        community_endorsements = contractor_neighborhood_rankings.community_endorsements + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update neighborhood statistics
CREATE OR REPLACE FUNCTION update_neighborhood_stats(neighborhood_id UUID) RETURNS VOID AS $$
BEGIN
    UPDATE neighborhoods SET
        member_count = (
            SELECT COUNT(*) FROM user_neighborhoods 
            WHERE user_neighborhoods.neighborhood_id = neighborhoods.id
        ),
        active_jobs_count = (
            SELECT COUNT(*) FROM jobs j
            JOIN user_neighborhoods un ON j.homeowner_id = un.user_id
            WHERE un.neighborhood_id = neighborhoods.id AND j.status IN ('open', 'assigned', 'in_progress')
        ),
        completed_jobs_count = (
            SELECT COUNT(*) FROM jobs j
            JOIN user_neighborhoods un ON j.homeowner_id = un.user_id
            WHERE un.neighborhood_id = neighborhoods.id AND j.status = 'completed'
        ),
        average_rating = (
            SELECT COALESCE(AVG(r.rating), 0) FROM reviews r
            JOIN jobs j ON r.job_id = j.id
            JOIN user_neighborhoods un ON j.homeowner_id = un.user_id
            WHERE un.neighborhood_id = neighborhoods.id
        ),
        updated_at = NOW()
    WHERE id = neighborhood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate contractor ranking positions
CREATE OR REPLACE FUNCTION update_contractor_rankings(neighborhood_id UUID) RETURNS VOID AS $$
BEGIN
    WITH ranked_contractors AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                ORDER BY 
                    average_rating DESC,
                    jobs_completed DESC,
                    community_endorsements DESC,
                    response_time_avg ASC
            ) as new_rank
        FROM contractor_neighborhood_rankings
        WHERE contractor_neighborhood_rankings.neighborhood_id = update_contractor_rankings.neighborhood_id
    )
    UPDATE contractor_neighborhood_rankings
    SET 
        rank_position = ranked_contractors.new_rank,
        updated_at = NOW()
    FROM ranked_contractors
    WHERE contractor_neighborhood_rankings.id = ranked_contractors.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update neighborhood stats when user neighborhoods change
CREATE OR REPLACE FUNCTION trigger_update_neighborhood_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_neighborhood_stats(NEW.neighborhood_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_neighborhood_stats(OLD.neighborhood_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.neighborhood_id != OLD.neighborhood_id THEN
            PERFORM update_neighborhood_stats(OLD.neighborhood_id);
            PERFORM update_neighborhood_stats(NEW.neighborhood_id);
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_neighborhood_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_neighborhoods
    FOR EACH ROW EXECUTE FUNCTION trigger_update_neighborhood_stats();

-- Auto-update contractor rankings when endorsements change
CREATE OR REPLACE FUNCTION trigger_update_contractor_rankings() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_contractor_rankings(NEW.neighborhood_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_contractor_rankings(OLD.neighborhood_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contractor_rankings_trigger
    AFTER INSERT OR DELETE ON community_endorsements
    FOR EACH ROW EXECUTE FUNCTION trigger_update_contractor_rankings();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Seed major UK neighborhoods
INSERT INTO neighborhoods (name, postcode_prefix, center_latitude, center_longitude, radius_km) VALUES
-- London Areas
('Westminster', 'SW1', 51.4994, -0.1357, 1.5),
('Chelsea', 'SW3', 51.4875, -0.1687, 1.2),
('South Kensington', 'SW7', 51.4945, -0.1763, 1.0),
('West End', 'W1', 51.5154, -0.1419, 1.5),
('Bloomsbury', 'WC1', 51.5200, -0.1276, 1.0),
('Covent Garden', 'WC2', 51.5120, -0.1243, 0.8),
('Whitechapel', 'E1', 51.5196, -0.0590, 1.8),
('Canary Wharf', 'E14', 51.5054, -0.0235, 1.0),
('Islington', 'N1', 51.5362, -0.1072, 1.5),
('South Bank', 'SE1', 51.5045, -0.0865, 1.2),

-- Manchester Areas
('Manchester City Centre', 'M1', 53.4808, -2.2426, 2.0),
('Rusholme', 'M14', 53.4502, -2.2280, 1.8),
('Didsbury', 'M20', 53.4178, -2.2357, 2.5),

-- Birmingham Areas  
('Birmingham City Centre', 'B1', 52.4862, -1.8904, 2.0),
('Edgbaston', 'B15', 52.4539, -1.9308, 2.2),

-- Leeds Areas
('Leeds City Centre', 'LS1', 53.8008, -1.5491, 2.0),
('Headingley', 'LS6', 53.8198, -1.5757, 2.5),

-- Bristol Areas
('Bristol City Centre', 'BS1', 51.4545, -2.5879, 2.0),
('Clifton', 'BS8', 51.4633, -2.6204, 1.8)

ON CONFLICT (postcode_prefix) DO NOTHING;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON neighborhoods TO authenticated;
GRANT ALL ON user_neighborhoods TO authenticated;
GRANT SELECT ON contractor_neighborhood_rankings TO authenticated;
GRANT ALL ON community_endorsements TO authenticated;
GRANT SELECT ON user_community_stats TO authenticated;
GRANT ALL ON neighbor_referrals TO authenticated;
GRANT SELECT ON neighborhood_activity_feed TO authenticated;
GRANT SELECT ON community_champions TO authenticated;
GRANT SELECT ON neighborhood_job_successes TO authenticated;
GRANT SELECT ON neighborhood_service_stats TO authenticated;
GRANT SELECT ON neighborhood_challenges TO authenticated;
GRANT ALL ON neighborhood_challenge_participants TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_contractor_endorsements TO authenticated;
GRANT EXECUTE ON FUNCTION update_neighborhood_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_contractor_rankings TO authenticated;

COMMENT ON TABLE neighborhoods IS 'Geographic communities for viral network effects';
COMMENT ON TABLE user_neighborhoods IS 'User membership in neighborhoods based on location';
COMMENT ON TABLE contractor_neighborhood_rankings IS 'Contractor performance rankings within neighborhoods';
COMMENT ON TABLE community_endorsements IS 'Peer endorsements for building contractor reputation';
COMMENT ON TABLE neighbor_referrals IS 'Referral system for viral user acquisition';
COMMENT ON TABLE neighborhood_activity_feed IS 'Community activity stream for engagement';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Neighborhood Network Effects migration completed successfully';
    RAISE NOTICE 'Created % neighborhoods for viral growth system', (SELECT COUNT(*) FROM neighborhoods);
END $$;