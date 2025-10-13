-- Migration: Add Contractor-Specific Tables
-- Created: 2025-01-13
-- Description: Creates all missing tables for contractor features

-- ============================================================================
-- 1. BIDS TABLE - For contractor job bids
-- ============================================================================
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Bid details
    bid_amount DECIMAL(10, 2) NOT NULL,
    estimated_duration INTEGER, -- in days
    proposed_start_date TIMESTAMP WITH TIME ZONE,

    -- Bid content
    proposal_text TEXT NOT NULL,
    materials_cost DECIMAL(10, 2),
    labor_cost DECIMAL(10, 2),

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(job_id, contractor_id)
);

CREATE INDEX idx_bids_job_id ON bids(job_id);
CREATE INDEX idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX idx_bids_status ON bids(status);

-- ============================================================================
-- 2. CONTRACTOR_QUOTES TABLE - For quote management
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Client information
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_address TEXT,

    -- Quote details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quote_number VARCHAR(100) UNIQUE,

    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Line items (stored as JSONB)
    line_items JSONB DEFAULT '[]'::jsonb,

    -- Terms and conditions
    terms TEXT,
    notes TEXT,

    -- Dates
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

    -- Template reference
    template_id UUID,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contractor_quotes_contractor_id ON contractor_quotes(contractor_id);
CREATE INDEX idx_contractor_quotes_status ON contractor_quotes(status);
CREATE INDEX idx_contractor_quotes_quote_number ON contractor_quotes(quote_number);

-- ============================================================================
-- 3. CONTRACTOR_INVOICES TABLE - For invoice management
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES contractor_quotes(id) ON DELETE SET NULL,

    -- Client information
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_address TEXT,

    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,

    -- Line items (stored as JSONB)
    line_items JSONB DEFAULT '[]'::jsonb,

    -- Payment terms
    payment_terms TEXT,
    notes TEXT,

    -- Dates
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contractor_invoices_contractor_id ON contractor_invoices(contractor_id);
CREATE INDEX idx_contractor_invoices_status ON contractor_invoices(status);
CREATE INDEX idx_contractor_invoices_invoice_number ON contractor_invoices(invoice_number);
CREATE INDEX idx_contractor_invoices_job_id ON contractor_invoices(job_id);

-- ============================================================================
-- 4. CONTRACTOR_POSTS TABLE - For gallery, portfolio, and social posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Post content
    title VARCHAR(255),
    description TEXT,
    post_type VARCHAR(50) DEFAULT 'portfolio' CHECK (post_type IN ('portfolio', 'social', 'gallery', 'testimonial')),

    -- Media
    media_urls TEXT[], -- Array of image/video URLs
    thumbnail_url TEXT,

    -- Project details (for portfolio posts)
    project_category VARCHAR(100),
    project_cost DECIMAL(10, 2),
    project_duration INTEGER, -- in days
    completion_date DATE,

    -- Location
    location_city VARCHAR(100),
    location_state VARCHAR(50),

    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,

    -- Visibility
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- SEO
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contractor_posts_contractor_id ON contractor_posts(contractor_id);
CREATE INDEX idx_contractor_posts_type ON contractor_posts(post_type);
CREATE INDEX idx_contractor_posts_public ON contractor_posts(is_public);
CREATE INDEX idx_contractor_posts_featured ON contractor_posts(is_featured);

-- ============================================================================
-- 5. CONTRACTOR_SKILLS TABLE - For skill management
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Skill details
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(100), -- e.g., 'Plumbing', 'Electrical', 'Carpentry'
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Certifications
    certifications JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(contractor_id, skill_name)
);

CREATE INDEX idx_contractor_skills_contractor_id ON contractor_skills(contractor_id);
CREATE INDEX idx_contractor_skills_category ON contractor_skills(skill_category);

-- ============================================================================
-- 6. REVIEWS TABLE - For contractor reviews and ratings
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parties involved
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT NOT NULL,

    -- Detailed ratings
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),

    -- Response
    contractor_response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,

    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,

    -- Media
    photos TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(job_id, reviewer_id)
);

CREATE INDEX idx_reviews_contractor_id ON reviews(contractor_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_job_id ON reviews(job_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_visible ON reviews(is_visible);

-- ============================================================================
-- 7. PAYMENTS TABLE - For payment tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related entities
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES contractor_invoices(id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'cash', 'check')),

    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),

    -- Description
    description TEXT,

    -- Fees
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2),

    -- Dates
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- ============================================================================
-- 8. SERVICE_AREAS TABLE - For contractor service coverage
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Location details
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',

    -- Coverage
    service_radius INTEGER, -- in miles

    -- Geocoding
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority areas shown first

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(contractor_id, city, state)
);

CREATE INDEX idx_service_areas_contractor_id ON service_areas(contractor_id);
CREATE INDEX idx_service_areas_location ON service_areas(city, state);
CREATE INDEX idx_service_areas_active ON service_areas(is_active);
CREATE INDEX idx_service_areas_geo ON service_areas(latitude, longitude);

-- ============================================================================
-- 9. CONNECTIONS TABLE - For professional networking
-- ============================================================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Connection parties
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Connection type
    connection_type VARCHAR(50) DEFAULT 'professional' CHECK (connection_type IN ('professional', 'referral', 'collaboration', 'friend')),

    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),

    -- Request details
    request_message TEXT,
    response_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(user_id, connected_user_id),
    CHECK (user_id != connected_user_id)
);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX idx_connections_status ON connections(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- BIDS Policies
CREATE POLICY "Contractors can view their own bids" ON bids
    FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can insert their own bids" ON bids
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Contractors can update their own bids" ON bids
    FOR UPDATE USING (contractor_id = auth.uid());

CREATE POLICY "Job owners can view bids on their jobs" ON bids
    FOR SELECT USING (
        job_id IN (SELECT id FROM jobs WHERE homeowner_id = auth.uid())
    );

-- QUOTES Policies
CREATE POLICY "Contractors can manage their own quotes" ON contractor_quotes
    FOR ALL USING (contractor_id = auth.uid());

-- INVOICES Policies
CREATE POLICY "Contractors can manage their own invoices" ON contractor_invoices
    FOR ALL USING (contractor_id = auth.uid());

-- POSTS Policies
CREATE POLICY "Anyone can view public posts" ON contractor_posts
    FOR SELECT USING (is_public = true);

CREATE POLICY "Contractors can manage their own posts" ON contractor_posts
    FOR ALL USING (contractor_id = auth.uid());

-- SKILLS Policies
CREATE POLICY "Anyone can view contractor skills" ON contractor_skills
    FOR SELECT USING (true);

CREATE POLICY "Contractors can manage their own skills" ON contractor_skills
    FOR ALL USING (contractor_id = auth.uid());

-- REVIEWS Policies
CREATE POLICY "Anyone can view visible reviews" ON reviews
    FOR SELECT USING (is_visible = true);

CREATE POLICY "Users can create reviews for completed jobs" ON reviews
    FOR INSERT WITH CHECK (
        reviewer_id = auth.uid() AND
        job_id IN (SELECT id FROM jobs WHERE homeowner_id = auth.uid() AND status = 'completed')
    );

CREATE POLICY "Contractors can respond to their reviews" ON reviews
    FOR UPDATE USING (contractor_id = auth.uid())
    WITH CHECK (contractor_id = auth.uid());

-- PAYMENTS Policies
CREATE POLICY "Users can view their payments as payer or payee" ON payments
    FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create payments as payer" ON payments
    FOR INSERT WITH CHECK (payer_id = auth.uid());

-- SERVICE_AREAS Policies
CREATE POLICY "Anyone can view active service areas" ON service_areas
    FOR SELECT USING (is_active = true);

CREATE POLICY "Contractors can manage their own service areas" ON service_areas
    FOR ALL USING (contractor_id = auth.uid());

-- CONNECTIONS Policies
CREATE POLICY "Users can view their own connections" ON connections
    FOR SELECT USING (user_id = auth.uid() OR connected_user_id = auth.uid());

CREATE POLICY "Users can create connection requests" ON connections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update connections they're part of" ON connections
    FOR UPDATE USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_quotes_updated_at BEFORE UPDATE ON contractor_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_invoices_updated_at BEFORE UPDATE ON contractor_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_posts_updated_at BEFORE UPDATE ON contractor_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_skills_updated_at BEFORE UPDATE ON contractor_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_areas_updated_at BEFORE UPDATE ON service_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    counter INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');

    SELECT COUNT(*) + 1 INTO counter
    FROM contractor_quotes
    WHERE quote_number LIKE year_prefix || '-%';

    new_number := year_prefix || '-' || LPAD(counter::TEXT, 5, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    counter INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');

    SELECT COUNT(*) + 1 INTO counter
    FROM contractor_invoices
    WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';

    new_number := 'INV-' || year_prefix || '-' || LPAD(counter::TEXT, 5, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (if needed for service role)
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE bids IS 'Stores contractor bids on jobs';
COMMENT ON TABLE contractor_quotes IS 'Stores quotes created by contractors';
COMMENT ON TABLE contractor_invoices IS 'Stores invoices issued by contractors';
COMMENT ON TABLE contractor_posts IS 'Stores contractor portfolio, gallery, and social posts';
COMMENT ON TABLE contractor_skills IS 'Stores contractor skills and certifications';
COMMENT ON TABLE reviews IS 'Stores reviews and ratings for contractors';
COMMENT ON TABLE payments IS 'Stores payment transactions';
COMMENT ON TABLE service_areas IS 'Stores contractor service coverage areas';
COMMENT ON TABLE connections IS 'Stores professional connections between users';
