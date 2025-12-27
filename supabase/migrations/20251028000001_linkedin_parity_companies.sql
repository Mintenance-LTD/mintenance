-- =====================================================
-- Company Pages Migration (LinkedIn Parity Feature 3/3)
-- Business pages for established contractors and companies
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COMPANY PAGES
-- =====================================================

-- Main companies table
CREATE TABLE IF NOT EXISTS contractor_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner/creator
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Company identity
    company_name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL, -- URL-friendly name
    tagline VARCHAR(300), -- Short company motto/description
    description TEXT NOT NULL,

    -- Company type
    company_type VARCHAR(100) CHECK (company_type IN (
        'sole_trader', 'partnership', 'limited_company',
        'llp', 'franchise', 'other'
    )),

    -- Branding
    logo_url TEXT,
    cover_image TEXT,
    brand_colors JSONB DEFAULT '{"primary": "#1976D2", "secondary": "#FFC107"}',

    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    website TEXT,

    -- Business address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',

    -- Location for map
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Business hours (JSON array of opening hours)
    business_hours JSONB DEFAULT '[]',
    -- Example: [{"day": "Monday", "open": "08:00", "close": "17:00", "closed": false}]

    -- Services and specialties
    services_offered TEXT[] DEFAULT '{}',
    specialties TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',

    -- Business details
    year_established INTEGER,
    employee_count VARCHAR(50) CHECK (employee_count IN (
        '1', '2-5', '6-10', '11-20', '21-50', '51-100', '100+'
    )),
    company_registration_number VARCHAR(100),
    vat_number VARCHAR(100),

    -- Social media links
    social_media JSONB DEFAULT '{}',
    -- Example: {"facebook": "url", "linkedin": "url", "instagram": "url", "twitter": "url"}

    -- Company statistics
    team_member_count INTEGER DEFAULT 1, -- Includes owner
    follower_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0,
    total_jobs_completed INTEGER DEFAULT 0,

    -- Verification status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_badge VARCHAR(50), -- 'verified', 'premium', 'featured'

    -- Page settings
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_hiring BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMPANY TEAM MEMBERS
-- =====================================================

-- Team members/employees
CREATE TABLE IF NOT EXISTS company_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in company
    position VARCHAR(200) NOT NULL, -- e.g., "Lead Electrician", "Project Manager"
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- Employment details
    employment_type VARCHAR(50) CHECK (employment_type IN (
        'full_time', 'part_time', 'contract', 'apprentice'
    )),
    department VARCHAR(100),

    -- Dates
    start_date DATE,
    end_date DATE, -- NULL if currently employed

    -- Bio
    bio TEXT,

    -- Display settings
    show_on_page BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    -- Permissions
    can_post BOOLEAN DEFAULT FALSE,
    can_manage_team BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited', 'left')),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(company_id, user_id)
);

-- =====================================================
-- COMPANY FOLLOWERS
-- =====================================================

-- Users following companies
CREATE TABLE IF NOT EXISTS company_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notifications
    notifications_enabled BOOLEAN DEFAULT TRUE,

    -- Timestamps
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(company_id, user_id)
);

-- =====================================================
-- COMPANY UPDATES (POSTS)
-- =====================================================

-- Company news/updates feed
CREATE TABLE IF NOT EXISTS company_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Team member who posted

    -- Post type
    post_type VARCHAR(50) NOT NULL DEFAULT 'update' CHECK (post_type IN (
        'update', 'job_posting', 'project_showcase',
        'announcement', 'milestone', 'team_update', 'news'
    )),

    -- Content
    title VARCHAR(300),
    content TEXT NOT NULL,
    content_html TEXT,

    -- Media
    images JSONB DEFAULT '[]',
    video_url TEXT,

    -- For job postings
    job_title VARCHAR(200),
    job_description TEXT,
    job_location VARCHAR(200),
    job_type VARCHAR(50), -- 'full_time', 'part_time', 'contract'
    apply_url TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,

    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,

    -- Status
    is_pinned BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company update likes
CREATE TABLE IF NOT EXISTS company_update_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL REFERENCES company_updates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(update_id, user_id)
);

-- Company update comments
CREATE TABLE IF NOT EXISTS company_update_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    update_id UUID NOT NULL REFERENCES company_updates(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,

    -- Threading
    parent_comment_id UUID REFERENCES company_update_comments(id) ON DELETE CASCADE,

    -- Engagement
    likes_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMPANY PORTFOLIO
-- =====================================================

-- Link contractor posts to company portfolio
CREATE TABLE IF NOT EXISTS company_portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
    post_id UUID REFERENCES contractor_posts(id) ON DELETE CASCADE, -- Link to existing posts
    article_id UUID REFERENCES contractor_articles(id) ON DELETE CASCADE, -- Or articles

    -- Portfolio details (if not linking to existing content)
    title VARCHAR(300),
    description TEXT,
    images JSONB DEFAULT '[]',
    project_date DATE,
    project_cost DECIMAL(10, 2),

    -- Display
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Either link to post/article OR provide custom details
    CONSTRAINT portfolio_content_check CHECK (
        (post_id IS NOT NULL) OR
        (article_id IS NOT NULL) OR
        (title IS NOT NULL AND description IS NOT NULL)
    )
);

-- =====================================================
-- COMPANY REVIEWS
-- =====================================================

-- Company-level reviews (separate from individual contractor reviews)
CREATE TABLE IF NOT EXISTS company_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL REFERENCES contractor_companies(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT NOT NULL,

    -- Detailed ratings
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

    -- Response
    company_response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,

    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(company_id, job_id, reviewer_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_contractor_companies_owner ON contractor_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_contractor_companies_slug ON contractor_companies(slug);
CREATE INDEX IF NOT EXISTS idx_contractor_companies_active ON contractor_companies(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_contractor_companies_location ON contractor_companies(city, postcode);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_company_team_members_company ON company_team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_team_members_user ON company_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_team_members_role ON company_team_members(role);
CREATE INDEX IF NOT EXISTS idx_company_team_members_status ON company_team_members(status);

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_company_followers_company ON company_followers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_followers_user ON company_followers(user_id);

-- Updates indexes
CREATE INDEX IF NOT EXISTS idx_company_updates_company ON company_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_updates_author ON company_updates(author_id);
CREATE INDEX IF NOT EXISTS idx_company_updates_type ON company_updates(post_type);
CREATE INDEX IF NOT EXISTS idx_company_updates_created ON company_updates(created_at DESC);

-- Portfolio indexes
CREATE INDEX IF NOT EXISTS idx_company_portfolio_company ON company_portfolio_items(company_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_company_reviews_company ON company_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_company_reviews_reviewer ON company_reviews(reviewer_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update company follower count
CREATE OR REPLACE FUNCTION update_company_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_companies
        SET follower_count = follower_count + 1
        WHERE id = NEW.company_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_companies
        SET follower_count = GREATEST(0, follower_count - 1)
        WHERE id = OLD.company_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_follower_count_trigger
    AFTER INSERT OR DELETE ON company_followers
    FOR EACH ROW EXECUTE FUNCTION update_company_follower_count();

-- Update company team member count
CREATE OR REPLACE FUNCTION update_company_team_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE contractor_companies
        SET team_member_count = team_member_count + 1
        WHERE id = NEW.company_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
        UPDATE contractor_companies
        SET team_member_count = team_member_count + 1
        WHERE id = NEW.company_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
        UPDATE contractor_companies
        SET team_member_count = GREATEST(0, team_member_count - 1)
        WHERE id = NEW.company_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE contractor_companies
        SET team_member_count = GREATEST(0, team_member_count - 1)
        WHERE id = OLD.company_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_team_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON company_team_members
    FOR EACH ROW EXECUTE FUNCTION update_company_team_count();

-- Update company post count
CREATE OR REPLACE FUNCTION update_company_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_companies
        SET post_count = post_count + 1
        WHERE id = NEW.company_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_companies
        SET post_count = GREATEST(0, post_count - 1)
        WHERE id = OLD.company_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_post_count_trigger
    AFTER INSERT OR DELETE ON company_updates
    FOR EACH ROW EXECUTE FUNCTION update_company_post_count();

-- Update company update likes count
CREATE OR REPLACE FUNCTION update_company_update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE company_updates
        SET likes_count = likes_count + 1
        WHERE id = NEW.update_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE company_updates
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.update_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_update_likes_count_trigger
    AFTER INSERT OR DELETE ON company_update_likes
    FOR EACH ROW EXECUTE FUNCTION update_company_update_likes_count();

-- Update company update comments count
CREATE OR REPLACE FUNCTION update_company_update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE company_updates
        SET comments_count = comments_count + 1
        WHERE id = NEW.update_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE company_updates
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.update_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_update_comments_count_trigger
    AFTER INSERT OR DELETE ON company_update_comments
    FOR EACH ROW EXECUTE FUNCTION update_company_update_comments_count();

-- Calculate company average rating from reviews
CREATE OR REPLACE FUNCTION update_company_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE contractor_companies
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM company_reviews
        WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
        AND is_visible = TRUE
    )
    WHERE id = COALESCE(NEW.company_id, OLD.company_id);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_average_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON company_reviews
    FOR EACH ROW EXECUTE FUNCTION update_company_average_rating();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON contractor_companies
    FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE contractor_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_update_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_update_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Anyone can view active companies" ON contractor_companies
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Contractors can create companies" ON contractor_companies
    FOR INSERT WITH CHECK (
        owner_id = auth.uid() AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'contractor')
    );

CREATE POLICY "Owners and admins can update companies" ON contractor_companies
    FOR UPDATE USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_team_members
            WHERE company_team_members.company_id = contractor_companies.id
            AND company_team_members.user_id = auth.uid()
            AND company_team_members.role IN ('admin')
            AND company_team_members.status = 'active'
        )
    );

-- Team members policies
CREATE POLICY "Anyone can view active team members" ON company_team_members
    FOR SELECT USING (status = 'active' AND show_on_page = TRUE);

CREATE POLICY "Company admins can manage team" ON company_team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contractor_companies
            WHERE contractor_companies.id = company_team_members.company_id
            AND contractor_companies.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM company_team_members ctm
            WHERE ctm.company_id = company_team_members.company_id
            AND ctm.user_id = auth.uid()
            AND ctm.role IN ('admin')
            AND ctm.can_manage_team = TRUE
        )
    );

-- Followers policies
CREATE POLICY "Users can view followers" ON company_followers
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow companies" ON company_followers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow companies" ON company_followers
    FOR DELETE USING (user_id = auth.uid());

-- Updates policies
CREATE POLICY "Anyone can view company updates" ON company_updates
    FOR SELECT USING (is_hidden = FALSE);

CREATE POLICY "Team members can create updates" ON company_updates
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM company_team_members
            WHERE company_team_members.company_id = company_updates.company_id
            AND company_team_members.user_id = auth.uid()
            AND company_team_members.status = 'active'
            AND company_team_members.can_post = TRUE
        )
    );

CREATE POLICY "Authors and admins can update posts" ON company_updates
    FOR UPDATE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_team_members
            WHERE company_team_members.company_id = company_updates.company_id
            AND company_team_members.user_id = auth.uid()
            AND company_team_members.role IN ('owner', 'admin')
        )
    );

-- Likes and comments policies
CREATE POLICY "Users can manage their likes" ON company_update_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view comments" ON company_update_comments
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can create comments" ON company_update_comments
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their comments" ON company_update_comments
    FOR UPDATE USING (author_id = auth.uid());

-- Portfolio policies
CREATE POLICY "Anyone can view portfolio" ON company_portfolio_items
    FOR SELECT USING (TRUE);

CREATE POLICY "Company admins can manage portfolio" ON company_portfolio_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contractor_companies
            WHERE contractor_companies.id = company_portfolio_items.company_id
            AND contractor_companies.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM company_team_members
            WHERE company_team_members.company_id = company_portfolio_items.company_id
            AND company_team_members.user_id = auth.uid()
            AND company_team_members.role IN ('admin')
        )
    );

-- Reviews policies
CREATE POLICY "Anyone can view visible reviews" ON company_reviews
    FOR SELECT USING (is_visible = TRUE);

CREATE POLICY "Users can create reviews" ON company_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Company owners can respond to reviews" ON company_reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM contractor_companies
            WHERE contractor_companies.id = company_reviews.company_id
            AND contractor_companies.owner_id = auth.uid()
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contractor_companies IS 'Company pages for established contractors (LinkedIn-style business pages)';
COMMENT ON TABLE company_team_members IS 'Team members and employees of companies';
COMMENT ON TABLE company_followers IS 'Users following companies for updates';
COMMENT ON TABLE company_updates IS 'Company news feed and announcements';
COMMENT ON TABLE company_portfolio_items IS 'Company portfolio and project showcase';
COMMENT ON TABLE company_reviews IS 'Company-level reviews separate from individual contractor reviews';
