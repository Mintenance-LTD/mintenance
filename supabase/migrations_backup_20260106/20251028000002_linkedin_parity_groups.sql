-- =====================================================
-- Trade-Based Groups Migration (LinkedIn Parity Feature 1/3)
-- Professional networking groups for contractors by trade
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CONTRACTOR GROUPS
-- =====================================================

-- Main groups table
CREATE TABLE IF NOT EXISTS contractor_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Group identity
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL, -- URL-friendly name
    description TEXT NOT NULL,

    -- Trade categorization
    trade_type VARCHAR(100) NOT NULL CHECK (trade_type IN (
        'electricians', 'plumbers', 'carpenters', 'hvac',
        'painters', 'landscapers', 'roofers', 'builders',
        'tilers', 'decorators', 'handymen', 'cleaners',
        'general', 'multi_trade'
    )),

    -- Group settings
    is_private BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,

    -- Group branding
    cover_image TEXT,
    group_icon TEXT,

    -- Creator and admin
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Location (optional - for local groups)
    location_type VARCHAR(50) CHECK (location_type IN ('global', 'country', 'region', 'city', 'local')),
    location_name VARCHAR(200), -- e.g., "London", "Manchester", "UK"
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    radius_km DECIMAL(6, 2), -- For local groups

    -- Statistics
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    active_members_30d INTEGER DEFAULT 0,

    -- Group rules and info
    rules TEXT,
    welcome_message TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Moderation
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT valid_location CHECK (
        (location_type IS NULL) OR
        (location_type IS NOT NULL AND location_name IS NOT NULL)
    )
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL REFERENCES contractor_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Member role
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),

    -- Member status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'banned', 'left')),

    -- Join request
    join_message TEXT, -- Message when requesting to join private group
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Member activity
    posts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Notifications
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,

    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(group_id, user_id)
);

-- =====================================================
-- GROUP DISCUSSIONS (POSTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS group_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL REFERENCES contractor_groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT, -- Rendered HTML from markdown

    -- Post type
    post_type VARCHAR(50) DEFAULT 'discussion' CHECK (post_type IN (
        'discussion', 'question', 'announcement',
        'event', 'job_posting', 'resource'
    )),

    -- Media
    images JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]

    -- Moderation
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE, -- Prevent new comments
    is_hidden BOOLEAN DEFAULT FALSE,

    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,

    -- For questions
    has_accepted_answer BOOLEAN DEFAULT FALSE,
    accepted_answer_id UUID, -- References group_discussion_comments(id)

    -- Tags
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group discussion comments
CREATE TABLE IF NOT EXISTS group_discussion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    discussion_id UUID NOT NULL REFERENCES group_discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    comment_text TEXT NOT NULL,
    comment_html TEXT, -- Rendered HTML

    -- Threading
    parent_comment_id UUID REFERENCES group_discussion_comments(id) ON DELETE CASCADE,

    -- Solution marking
    is_accepted_answer BOOLEAN DEFAULT FALSE,

    -- Media
    images JSONB DEFAULT '[]',

    -- Engagement
    likes_count INTEGER DEFAULT 0,

    -- Moderation
    is_hidden BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion likes
CREATE TABLE IF NOT EXISTS group_discussion_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES group_discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id)
);

-- Comment likes
CREATE TABLE IF NOT EXISTS group_discussion_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES group_discussion_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- =====================================================
-- GROUP EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL REFERENCES contractor_groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event details
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,

    -- Event type
    event_type VARCHAR(50) NOT NULL DEFAULT 'meetup' CHECK (event_type IN (
        'meetup', 'workshop', 'training', 'networking',
        'conference', 'webinar', 'social', 'other'
    )),

    -- Location
    location_type VARCHAR(50) NOT NULL DEFAULT 'in_person' CHECK (location_type IN ('in_person', 'virtual', 'hybrid')),
    location_name VARCHAR(300),
    location_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Virtual event details
    meeting_url TEXT,
    meeting_platform VARCHAR(100), -- e.g., "Zoom", "Google Meet"

    -- Date & Time
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- Capacity
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,

    -- Registration
    requires_registration BOOLEAN DEFAULT TRUE,
    registration_deadline TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming' CHECK (status IN (
        'draft', 'upcoming', 'ongoing', 'completed', 'cancelled'
    )),

    -- Media
    cover_image TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_capacity CHECK (max_attendees IS NULL OR max_attendees > 0)
);

-- Event attendees
CREATE TABLE IF NOT EXISTS group_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- RSVP status
    status VARCHAR(50) NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going', 'waitlist')),

    -- Additional info
    guest_count INTEGER DEFAULT 0,
    notes TEXT,

    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(event_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_contractor_groups_trade_type ON contractor_groups(trade_type);
CREATE INDEX IF NOT EXISTS idx_contractor_groups_slug ON contractor_groups(slug);
CREATE INDEX IF NOT EXISTS idx_contractor_groups_location ON contractor_groups(location_type, location_name);
CREATE INDEX IF NOT EXISTS idx_contractor_groups_active ON contractor_groups(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_contractor_groups_created_by ON contractor_groups(created_by);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);

-- Discussions indexes
CREATE INDEX IF NOT EXISTS idx_group_discussions_group_id ON group_discussions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_discussions_author_id ON group_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_group_discussions_post_type ON group_discussions(post_type);
CREATE INDEX IF NOT EXISTS idx_group_discussions_activity ON group_discussions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_discussions_pinned ON group_discussions(is_pinned, created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_group_discussion_comments_discussion ON group_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_group_discussion_comments_author ON group_discussion_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_group_discussion_comments_parent ON group_discussion_comments(parent_comment_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_start_date ON group_events(start_date);
CREATE INDEX IF NOT EXISTS idx_group_events_status ON group_events(status);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_group_event_attendees_event ON group_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_group_event_attendees_user ON group_event_attendees(user_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE contractor_groups
        SET member_count = member_count + 1
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
        UPDATE contractor_groups
        SET member_count = member_count + 1
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
        UPDATE contractor_groups
        SET member_count = member_count - 1
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE contractor_groups
        SET member_count = member_count - 1
        WHERE id = OLD.group_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON group_members
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Update group post count
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_groups
        SET post_count = post_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_groups
        SET post_count = GREATEST(0, post_count - 1)
        WHERE id = OLD.group_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_post_count_trigger
    AFTER INSERT OR DELETE ON group_discussions
    FOR EACH ROW EXECUTE FUNCTION update_group_post_count();

-- Update discussion likes count
CREATE OR REPLACE FUNCTION update_discussion_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE group_discussions
        SET likes_count = likes_count + 1
        WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE group_discussions
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.discussion_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discussion_likes_count_trigger
    AFTER INSERT OR DELETE ON group_discussion_likes
    FOR EACH ROW EXECUTE FUNCTION update_discussion_likes_count();

-- Update discussion comments count
CREATE OR REPLACE FUNCTION update_discussion_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE group_discussions
        SET comments_count = comments_count + 1,
            last_activity_at = NOW()
        WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE group_discussions
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.discussion_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discussion_comments_count_trigger
    AFTER INSERT OR DELETE ON group_discussion_comments
    FOR EACH ROW EXECUTE FUNCTION update_discussion_comments_count();

-- Update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE group_discussion_comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE group_discussion_comments
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.comment_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON group_discussion_comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Update event attendees count
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'going' THEN
        UPDATE group_events
        SET current_attendees = current_attendees + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'going' AND NEW.status = 'going' THEN
        UPDATE group_events
        SET current_attendees = current_attendees + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'going' AND NEW.status != 'going' THEN
        UPDATE group_events
        SET current_attendees = GREATEST(0, current_attendees - 1)
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'going' THEN
        UPDATE group_events
        SET current_attendees = GREATEST(0, current_attendees - 1)
        WHERE id = OLD.event_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_attendees_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON group_event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at_trigger
    BEFORE UPDATE ON contractor_groups
    FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER discussions_updated_at_trigger
    BEFORE UPDATE ON group_discussions
    FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER events_updated_at_trigger
    BEFORE UPDATE ON group_events
    FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE contractor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discussion_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_event_attendees ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Anyone can view public groups" ON contractor_groups
    FOR SELECT USING (is_active = TRUE AND is_private = FALSE);

CREATE POLICY "Members can view private groups they belong to" ON contractor_groups
    FOR SELECT USING (
        is_active = TRUE AND (
            is_private = FALSE OR
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = contractor_groups.id
                AND group_members.user_id = auth.uid()
                AND group_members.status = 'active'
            )
        )
    );

CREATE POLICY "Contractors can create groups" ON contractor_groups
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'contractor')
    );

CREATE POLICY "Group admins can update groups" ON contractor_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = contractor_groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin')
        )
    );

-- Members policies
CREATE POLICY "Members can view group memberships" ON group_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

CREATE POLICY "Users can join groups" ON group_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own membership" ON group_members
    FOR UPDATE USING (user_id = auth.uid());

-- Discussions policies
CREATE POLICY "Members can view group discussions" ON group_discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_discussions.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM contractor_groups
            WHERE contractor_groups.id = group_discussions.group_id
            AND contractor_groups.is_private = FALSE
        )
    );

CREATE POLICY "Members can create discussions" ON group_discussions
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_discussions.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

CREATE POLICY "Authors and admins can update discussions" ON group_discussions
    FOR UPDATE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_discussions.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );

-- Comments policies
CREATE POLICY "Members can view comments" ON group_discussion_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_discussions gd
            JOIN group_members gm ON gm.group_id = gd.group_id
            WHERE gd.id = group_discussion_comments.discussion_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

CREATE POLICY "Members can create comments" ON group_discussion_comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM group_discussions gd
            JOIN group_members gm ON gm.group_id = gd.group_id
            WHERE gd.id = group_discussion_comments.discussion_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

-- Likes policies
CREATE POLICY "Users can manage their likes" ON group_discussion_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their comment likes" ON group_discussion_comment_likes
    FOR ALL USING (user_id = auth.uid());

-- Events policies
CREATE POLICY "Members can view events" ON group_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_events.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

CREATE POLICY "Admins can manage events" ON group_events
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_events.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );

-- Event attendees policies
CREATE POLICY "Users can manage their RSVP" ON group_event_attendees
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample trade groups
INSERT INTO contractor_groups (name, slug, description, trade_type, created_by, is_private, location_type, location_name) VALUES
    ('UK Electricians Network', 'uk-electricians-network', 'Professional network for qualified electricians across the UK. Share knowledge, find work, and connect with fellow sparks.', 'electricians', (SELECT id FROM users WHERE role = 'contractor' LIMIT 1), FALSE, 'country', 'United Kingdom'),
    ('London Plumbers Guild', 'london-plumbers-guild', 'Connect with London-based plumbers. Discuss regulations, share job opportunities, and grow your business.', 'plumbers', (SELECT id FROM users WHERE role = 'contractor' LIMIT 1), FALSE, 'city', 'London'),
    ('Master Carpenters UK', 'master-carpenters-uk', 'For professional carpenters and joiners. Share projects, techniques, and business advice.', 'carpenters', (SELECT id FROM users WHERE role = 'contractor' LIMIT 1), FALSE, 'country', 'United Kingdom'),
    ('HVAC Professionals', 'hvac-professionals', 'Heating, ventilation, and air conditioning specialists. Technical discussions and industry updates.', 'hvac', (SELECT id FROM users WHERE role = 'contractor' LIMIT 1), FALSE, 'global', NULL)
ON CONFLICT DO NOTHING;

-- Add group creators as admin members
INSERT INTO group_members (group_id, user_id, role, status)
SELECT cg.id, cg.created_by, 'admin', 'active'
FROM contractor_groups cg
WHERE NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = cg.id AND gm.user_id = cg.created_by
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contractor_groups IS 'Trade-based professional groups for contractors (LinkedIn-style communities)';
COMMENT ON TABLE group_members IS 'Group membership with roles and permissions';
COMMENT ON TABLE group_discussions IS 'Discussion posts within groups';
COMMENT ON TABLE group_discussion_comments IS 'Comments on group discussions';
COMMENT ON TABLE group_events IS 'Events organized by groups (meetups, workshops, etc.)';
COMMENT ON TABLE group_event_attendees IS 'Event RSVPs and attendance tracking';
