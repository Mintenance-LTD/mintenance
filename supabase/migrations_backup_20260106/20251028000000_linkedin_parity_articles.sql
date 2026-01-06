-- =====================================================
-- Article Publishing Migration (LinkedIn Parity Feature 2/3)
-- Long-form content publishing for thought leadership
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ARTICLES
-- =====================================================

-- Main articles table
CREATE TABLE IF NOT EXISTS contractor_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Author
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    slug VARCHAR(500) UNIQUE NOT NULL, -- URL-friendly title

    -- Content in multiple formats
    content_markdown TEXT NOT NULL, -- Source content in markdown
    content_html TEXT, -- Rendered HTML for display
    excerpt TEXT, -- Short summary (auto-generated or manual)

    -- Featured media
    featured_image TEXT,
    featured_image_caption TEXT,

    -- SEO Metadata
    meta_title VARCHAR(100),
    meta_description TEXT,
    meta_keywords TEXT[] DEFAULT '{}',

    -- Publishing
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'scheduled')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_publish_at TIMESTAMP WITH TIME ZONE,

    -- Categories and tags
    category VARCHAR(100), -- e.g., 'tips_and_tricks', 'industry_news', 'how_to', 'case_study', 'opinion'
    tags TEXT[] DEFAULT '{}',

    -- Reading stats
    read_time_minutes INTEGER, -- Estimated reading time
    word_count INTEGER,

    -- Engagement metrics
    views_count INTEGER DEFAULT 0,
    unique_views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,

    -- Featured/promoted
    is_featured BOOLEAN DEFAULT FALSE,
    featured_at TIMESTAMP WITH TIME ZONE,

    -- Moderation
    is_hidden BOOLEAN DEFAULT FALSE,

    -- Editor's choice
    editors_pick BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_at TIMESTAMP WITH TIME ZONE
);

-- Article categories for better organization
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon name for UI
    color VARCHAR(20), -- Hex color for category badge
    articles_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article likes
CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- Article comments
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    comment_text TEXT NOT NULL,
    comment_html TEXT,

    -- Threading
    parent_comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,

    -- Engagement
    likes_count INTEGER DEFAULT 0,

    -- Moderation
    is_hidden BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article comment likes
CREATE TABLE IF NOT EXISTS article_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Article bookmarks (save for later)
CREATE TABLE IF NOT EXISTS article_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- Article views tracking (for analytics)
CREATE TABLE IF NOT EXISTS article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous views

    -- View details
    view_duration_seconds INTEGER, -- How long they read
    scroll_percentage INTEGER, -- How far they scrolled (0-100)
    completed_read BOOLEAN DEFAULT FALSE, -- Did they read to the end

    -- Analytics
    referrer TEXT, -- Where they came from
    device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'

    -- Timestamps
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article shares tracking
CREATE TABLE IF NOT EXISTS article_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Share details
    platform VARCHAR(50), -- 'twitter', 'linkedin', 'facebook', 'whatsapp', 'email', 'copy_link'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ARTICLE SERIES (Collections)
-- =====================================================

-- Series of related articles
CREATE TABLE IF NOT EXISTS article_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Series info
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT,

    -- Stats
    articles_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles in series
CREATE TABLE IF NOT EXISTS article_series_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    series_id UUID NOT NULL REFERENCES article_series(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES contractor_articles(id) ON DELETE CASCADE,

    -- Position in series
    position INTEGER NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(series_id, article_id),
    UNIQUE(series_id, position)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_contractor_articles_author ON contractor_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_contractor_articles_slug ON contractor_articles(slug);
CREATE INDEX IF NOT EXISTS idx_contractor_articles_status ON contractor_articles(status);
CREATE INDEX IF NOT EXISTS idx_contractor_articles_published ON contractor_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_contractor_articles_category ON contractor_articles(category);
CREATE INDEX IF NOT EXISTS idx_contractor_articles_featured ON contractor_articles(is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractor_articles_tags ON contractor_articles USING GIN(tags);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_author ON article_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_comment_id);

-- Views indexes
CREATE INDEX IF NOT EXISTS idx_article_views_article ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_user ON article_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_article_views_date ON article_views(viewed_at DESC);

-- Series indexes
CREATE INDEX IF NOT EXISTS idx_article_series_author ON article_series(author_id);
CREATE INDEX IF NOT EXISTS idx_article_series_items_series ON article_series_items(series_id, position);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update article likes count
CREATE OR REPLACE FUNCTION update_article_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_articles
        SET likes_count = likes_count + 1
        WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_articles
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.article_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_likes_count_trigger
    AFTER INSERT OR DELETE ON article_likes
    FOR EACH ROW EXECUTE FUNCTION update_article_likes_count();

-- Update article comments count
CREATE OR REPLACE FUNCTION update_article_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_articles
        SET comments_count = comments_count + 1
        WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_articles
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.article_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_comments_count_trigger
    AFTER INSERT OR DELETE ON article_comments
    FOR EACH ROW EXECUTE FUNCTION update_article_comments_count();

-- Update article bookmarks count
CREATE OR REPLACE FUNCTION update_article_bookmarks_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contractor_articles
        SET bookmarks_count = bookmarks_count + 1
        WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractor_articles
        SET bookmarks_count = GREATEST(0, bookmarks_count - 1)
        WHERE id = OLD.article_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_bookmarks_count_trigger
    AFTER INSERT OR DELETE ON article_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_article_bookmarks_count();

-- Update comment likes count
CREATE OR REPLACE FUNCTION update_article_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE article_comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE article_comments
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.comment_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_comment_likes_count_trigger
    AFTER INSERT OR DELETE ON article_comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_article_comment_likes_count();

-- Calculate reading time and word count on insert/update
CREATE OR REPLACE FUNCTION calculate_article_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate word count
    NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content_markdown), '\s+'), 1);

    -- Calculate read time (assuming 200 words per minute)
    NEW.read_time_minutes = GREATEST(1, ROUND(NEW.word_count::numeric / 200.0));

    -- Auto-generate excerpt if not provided (first 200 characters)
    IF NEW.excerpt IS NULL OR NEW.excerpt = '' THEN
        NEW.excerpt = LEFT(regexp_replace(NEW.content_markdown, E'[\\n\\r]+', ' ', 'g'), 200) || '...';
    END IF;

    -- Set published_at timestamp when status changes to published
    IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
        NEW.published_at = NOW();
    END IF;

    -- Update last_edited_at
    IF OLD IS NOT NULL THEN
        NEW.last_edited_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_stats_trigger
    BEFORE INSERT OR UPDATE ON contractor_articles
    FOR EACH ROW EXECUTE FUNCTION calculate_article_stats();

-- Update series articles count
CREATE OR REPLACE FUNCTION update_series_articles_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE article_series
        SET articles_count = articles_count + 1
        WHERE id = NEW.series_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE article_series
        SET articles_count = GREATEST(0, articles_count - 1)
        WHERE id = OLD.series_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER series_articles_count_trigger
    AFTER INSERT OR DELETE ON article_series_items
    FOR EACH ROW EXECUTE FUNCTION update_series_articles_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at_trigger
    BEFORE UPDATE ON contractor_articles
    FOR EACH ROW EXECUTE FUNCTION update_articles_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE contractor_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_series_items ENABLE ROW LEVEL SECURITY;

-- Articles policies
CREATE POLICY "Anyone can view published articles" ON contractor_articles
    FOR SELECT USING (status = 'published' AND is_hidden = FALSE);

CREATE POLICY "Authors can view their own articles" ON contractor_articles
    FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Contractors can create articles" ON contractor_articles
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'contractor')
    );

CREATE POLICY "Authors can update their own articles" ON contractor_articles
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their own articles" ON contractor_articles
    FOR DELETE USING (author_id = auth.uid());

-- Categories policies
CREATE POLICY "Anyone can view categories" ON article_categories
    FOR SELECT USING (TRUE);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON article_likes
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage their own likes" ON article_likes
    FOR ALL USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Anyone can view article comments" ON article_comments
    FOR SELECT USING (
        is_hidden = FALSE AND
        EXISTS (
            SELECT 1 FROM contractor_articles
            WHERE contractor_articles.id = article_comments.article_id
            AND contractor_articles.status = 'published'
        )
    );

CREATE POLICY "Users can create comments" ON article_comments
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their comments" ON article_comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their comments" ON article_comments
    FOR DELETE USING (author_id = auth.uid());

-- Comment likes policies
CREATE POLICY "Users can manage their comment likes" ON article_comment_likes
    FOR ALL USING (user_id = auth.uid());

-- Bookmarks policies
CREATE POLICY "Users can manage their bookmarks" ON article_bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Views policies
CREATE POLICY "Anyone can record views" ON article_views
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view their own reading history" ON article_views
    FOR SELECT USING (user_id = auth.uid());

-- Shares policies
CREATE POLICY "Anyone can record shares" ON article_shares
    FOR INSERT WITH CHECK (TRUE);

-- Series policies
CREATE POLICY "Anyone can view series" ON article_series
    FOR SELECT USING (TRUE);

CREATE POLICY "Authors can manage their series" ON article_series
    FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Anyone can view series items" ON article_series_items
    FOR SELECT USING (TRUE);

CREATE POLICY "Authors can manage their series items" ON article_series_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM article_series
            WHERE article_series.id = article_series_items.series_id
            AND article_series.author_id = auth.uid()
        )
    );

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert article categories
INSERT INTO article_categories (name, slug, description, icon, color) VALUES
    ('Tips & Tricks', 'tips-and-tricks', 'Practical advice and best practices', 'lightbulb', '#FFC107'),
    ('How-To Guides', 'how-to-guides', 'Step-by-step tutorials and guides', 'book', '#2196F3'),
    ('Industry News', 'industry-news', 'Latest news and updates from the trades', 'newspaper', '#F44336'),
    ('Case Studies', 'case-studies', 'Real project stories and lessons learned', 'briefcase', '#4CAF50'),
    ('Business Advice', 'business-advice', 'Running and growing your contracting business', 'trending-up', '#9C27B0'),
    ('Tool Reviews', 'tool-reviews', 'Reviews and comparisons of tools and equipment', 'hammer', '#FF9800'),
    ('Safety & Regulations', 'safety-regulations', 'Safety guidelines and regulatory compliance', 'shield', '#E91E63'),
    ('Opinion', 'opinion', 'Thought leadership and industry commentary', 'message-circle', '#607D8B')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contractor_articles IS 'Long-form articles for contractor thought leadership (LinkedIn-style publishing)';
COMMENT ON TABLE article_categories IS 'Categories for organizing articles';
COMMENT ON TABLE article_comments IS 'Comments on articles';
COMMENT ON TABLE article_views IS 'Article view tracking for analytics';
COMMENT ON TABLE article_series IS 'Series/collections of related articles';
COMMENT ON COLUMN contractor_articles.content_markdown IS 'Source content in markdown format';
COMMENT ON COLUMN contractor_articles.content_html IS 'Rendered HTML for display';
COMMENT ON COLUMN contractor_articles.read_time_minutes IS 'Estimated reading time based on word count';
