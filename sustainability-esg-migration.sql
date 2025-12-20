-- =====================================================
-- Mintenance Sustainability & ESG Scoring Migration
-- First eco-conscious marketplace with comprehensive ESG tracking
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE SUSTAINABILITY TABLES
-- =====================================================

-- Sustainability metrics for contractors and jobs
CREATE TABLE sustainability_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_id UUID NOT NULL, -- contractor_id or job_id
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('contractor', 'job', 'material')),
    carbon_footprint_kg DECIMAL(10, 3) DEFAULT 0.0,
    water_usage_liters DECIMAL(10, 2) DEFAULT 0.0,
    waste_generated_kg DECIMAL(10, 3) DEFAULT 0.0,
    energy_usage_kwh DECIMAL(10, 3) DEFAULT 0.0,
    renewable_energy_percentage DECIMAL(5, 2) DEFAULT 0.0 CHECK (renewable_energy_percentage BETWEEN 0 AND 100),
    local_sourcing_percentage DECIMAL(5, 2) DEFAULT 0.0 CHECK (local_sourcing_percentage BETWEEN 0 AND 100),
    recycled_materials_percentage DECIMAL(5, 2) DEFAULT 0.0 CHECK (recycled_materials_percentage BETWEEN 0 AND 100),
    transportation_emissions_kg DECIMAL(10, 3) DEFAULT 0.0,
    measurement_period VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annually
    data_source VARCHAR(50) DEFAULT 'estimated', -- estimated, measured, certified
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive ESG scores for contractors
CREATE TABLE contractor_esg_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_esg_score INTEGER DEFAULT 0 CHECK (overall_esg_score BETWEEN 0 AND 100),
    environmental_score INTEGER DEFAULT 0 CHECK (environmental_score BETWEEN 0 AND 100),
    social_score INTEGER DEFAULT 0 CHECK (social_score BETWEEN 0 AND 100),
    governance_score INTEGER DEFAULT 0 CHECK (governance_score BETWEEN 0 AND 100),
    certification_level VARCHAR(20) DEFAULT 'bronze' CHECK (certification_level IN ('bronze', 'silver', 'gold', 'platinum')),
    score_trend VARCHAR(20) DEFAULT 'stable', -- improving, stable, declining
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    next_review_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    calculation_version VARCHAR(10) DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id)
);

-- =====================================================
-- GREEN CERTIFICATIONS SYSTEM
-- =====================================================

-- Green certifications for contractors
CREATE TABLE green_certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certification_name VARCHAR(100) NOT NULL,
    certification_type VARCHAR(50) NOT NULL, -- energy_efficient, waste_reduction, sustainable_materials, etc.
    issuing_body VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    issue_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expired', 'revoked')),
    verification_date TIMESTAMPTZ,
    verification_document TEXT, -- URL to certificate document
    score_boost INTEGER DEFAULT 0, -- Points added to ESG score
    annual_fee DECIMAL(10, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certification requirements and benefits
CREATE TABLE certification_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- environmental, social, governance
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    min_score_required INTEGER DEFAULT 60,
    score_boost INTEGER DEFAULT 5,
    cost_estimate DECIMAL(10, 2) DEFAULT 0.0,
    duration_months INTEGER DEFAULT 12,
    renewal_required BOOLEAN DEFAULT TRUE,
    popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUSTAINABLE MATERIALS DATABASE
-- =====================================================

-- Database of sustainable materials and their properties
CREATE TABLE sustainable_materials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- paint, insulation, flooring, etc.
    subcategory VARCHAR(100),
    carbon_intensity DECIMAL(10, 4) DEFAULT 0.0, -- kg CO2 per unit
    water_intensity DECIMAL(10, 4) DEFAULT 0.0, -- liters per unit
    recyclability_score INTEGER DEFAULT 0 CHECK (recyclability_score BETWEEN 0 AND 100),
    biodegradability_score INTEGER DEFAULT 0 CHECK (biodegradability_score BETWEEN 0 AND 100),
    toxicity_level VARCHAR(20) DEFAULT 'low' CHECK (toxicity_level IN ('none', 'low', 'moderate', 'high')),
    durability_years INTEGER DEFAULT 10,
    local_availability_uk BOOLEAN DEFAULT FALSE,
    certification_labels TEXT[] DEFAULT '{}', -- FSC, Energy Star, etc.
    cost_premium_percentage DECIMAL(5, 2) DEFAULT 0.0, -- Additional cost vs conventional
    alternative_to TEXT[] DEFAULT '{}', -- Materials this can replace
    supplier_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material usage tracking per job
CREATE TABLE job_material_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    material_id UUID REFERENCES sustainable_materials(id) ON DELETE SET NULL,
    material_name VARCHAR(255) NOT NULL, -- In case custom material not in database
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- kg, liters, m2, etc.
    sustainable_alternative BOOLEAN DEFAULT FALSE,
    cost DECIMAL(10, 2) DEFAULT 0.0,
    carbon_impact DECIMAL(10, 3) DEFAULT 0.0, -- Calculated carbon footprint
    waste_generated DECIMAL(10, 3) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUSTAINABILITY RECOMMENDATIONS ENGINE
-- =====================================================

-- Sustainability improvement recommendations
CREATE TABLE sustainability_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('contractor', 'job', 'material')),
    target_id UUID NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL, -- material_swap, process_improvement, certification
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    implementation_steps TEXT[] DEFAULT '{}',
    expected_carbon_reduction DECIMAL(10, 3) DEFAULT 0.0,
    expected_cost_impact DECIMAL(10, 2) DEFAULT 0.0, -- Positive = cost increase, Negative = savings
    difficulty_level VARCHAR(20) DEFAULT 'moderate' CHECK (difficulty_level IN ('easy', 'moderate', 'complex')),
    roi_timeframe VARCHAR(50), -- "6 months", "2 years", etc.
    priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'implemented', 'dismissed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- Track implementation of sustainability recommendations
CREATE TABLE recommendation_implementations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recommendation_id UUID NOT NULL REFERENCES sustainability_recommendations(id) ON DELETE CASCADE,
    implementer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    implementation_date TIMESTAMPTZ DEFAULT NOW(),
    actual_carbon_reduction DECIMAL(10, 3),
    actual_cost_impact DECIMAL(10, 2),
    success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 5),
    feedback TEXT,
    evidence_photos TEXT[], -- URLs to before/after photos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ECO-FRIENDLY JOB TRACKING
-- =====================================================

-- Track jobs with sustainability focus
CREATE TABLE eco_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    eco_category VARCHAR(50) NOT NULL, -- energy_efficiency, waste_reduction, renewable_energy, etc.
    sustainability_goals TEXT[] DEFAULT '{}',
    green_materials_percentage DECIMAL(5, 2) DEFAULT 0.0,
    predicted_carbon_footprint DECIMAL(10, 3) DEFAULT 0.0,
    actual_carbon_footprint DECIMAL(10, 3),
    sustainability_score INTEGER CHECK (sustainability_score BETWEEN 0 AND 100),
    certification_eligible BOOLEAN DEFAULT FALSE,
    certification_awarded VARCHAR(100), -- Name of sustainability certification received
    green_premium DECIMAL(10, 2) DEFAULT 0.0, -- Additional cost for sustainable approach
    client_education_provided BOOLEAN DEFAULT FALSE,
    waste_diversion_rate DECIMAL(5, 2) DEFAULT 0.0, -- Percentage of waste diverted from landfill
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client education tracking for social impact scoring
CREATE TABLE sustainability_education (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    education_type VARCHAR(50) NOT NULL, -- materials, energy_saving, waste_reduction, etc.
    topics_covered TEXT[] DEFAULT '{}',
    duration_minutes INTEGER DEFAULT 0,
    materials_provided BOOLEAN DEFAULT FALSE,
    follow_up_scheduled BOOLEAN DEFAULT FALSE,
    client_satisfaction INTEGER CHECK (client_satisfaction BETWEEN 1 AND 5),
    impact_rating INTEGER CHECK (impact_rating BETWEEN 1 AND 5), -- How impactful was the education
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CARBON OFFSET & COMPENSATION
-- =====================================================

-- Carbon offset projects and purchases
CREATE TABLE carbon_offsets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offset_provider VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL, -- reforestation, renewable_energy, methane_capture, etc.
    project_location VARCHAR(100),
    carbon_offset_kg DECIMAL(10, 3) NOT NULL,
    cost_per_tonne DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    verification_standard VARCHAR(50), -- VCS, Gold Standard, etc.
    certificate_number VARCHAR(100),
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    retirement_date TIMESTAMPTZ, -- When offset was retired/used
    allocated_to_job UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMMUNITY SUSTAINABILITY INITIATIVES
-- =====================================================

-- Track community sustainability projects by contractors
CREATE TABLE community_sustainability_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(50) NOT NULL, -- community_garden, energy_audit, waste_cleanup, etc.
    description TEXT NOT NULL,
    location VARCHAR(255),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    volunteer_hours INTEGER DEFAULT 0,
    beneficiaries_count INTEGER DEFAULT 0,
    environmental_impact TEXT,
    social_impact TEXT,
    cost_invested DECIMAL(10, 2) DEFAULT 0.0,
    partners TEXT[] DEFAULT '{}', -- Organizations involved
    photos TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUSTAINABILITY REPORTING & ANALYTICS
-- =====================================================

-- Aggregated sustainability reports
CREATE TABLE sustainability_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_period_start TIMESTAMPTZ NOT NULL,
    report_period_end TIMESTAMPTZ NOT NULL,
    total_carbon_footprint DECIMAL(10, 3) DEFAULT 0.0,
    carbon_reduction_achieved DECIMAL(10, 3) DEFAULT 0.0,
    waste_diverted_percentage DECIMAL(5, 2) DEFAULT 0.0,
    renewable_energy_percentage DECIMAL(5, 2) DEFAULT 0.0,
    sustainable_materials_percentage DECIMAL(5, 2) DEFAULT 0.0,
    client_education_sessions INTEGER DEFAULT 0,
    community_projects_completed INTEGER DEFAULT 0,
    certifications_earned INTEGER DEFAULT 0,
    green_jobs_completed INTEGER DEFAULT 0,
    sustainability_investment DECIMAL(10, 2) DEFAULT 0.0,
    cost_savings_achieved DECIMAL(10, 2) DEFAULT 0.0,
    report_format VARCHAR(20) DEFAULT 'standard', -- standard, detailed, summary
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'clients_only')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Sustainability metrics lookups
CREATE INDEX idx_sustainability_metrics_entity ON sustainability_metrics(entity_id, entity_type);
CREATE INDEX idx_sustainability_metrics_type ON sustainability_metrics(entity_type);
CREATE INDEX idx_sustainability_metrics_created ON sustainability_metrics(created_at DESC);

-- ESG scores
CREATE INDEX idx_contractor_esg_scores_contractor ON contractor_esg_scores(contractor_id);
CREATE INDEX idx_contractor_esg_scores_overall ON contractor_esg_scores(overall_esg_score DESC);
CREATE INDEX idx_contractor_esg_scores_certification ON contractor_esg_scores(certification_level);
CREATE INDEX idx_contractor_esg_scores_trend ON contractor_esg_scores(score_trend);

-- Green certifications
CREATE INDEX idx_green_certifications_contractor ON green_certifications(contractor_id);
CREATE INDEX idx_green_certifications_type ON green_certifications(certification_type);
CREATE INDEX idx_green_certifications_status ON green_certifications(verification_status);
CREATE INDEX idx_green_certifications_expiry ON green_certifications(expiry_date);

-- Sustainable materials
CREATE INDEX idx_sustainable_materials_category ON sustainable_materials(category);
CREATE INDEX idx_sustainable_materials_carbon ON sustainable_materials(carbon_intensity);
CREATE INDEX idx_sustainable_materials_local ON sustainable_materials(local_availability_uk);
CREATE INDEX idx_sustainable_materials_alternative ON sustainable_materials USING GIN(alternative_to);

-- Job material usage
CREATE INDEX idx_job_material_usage_job ON job_material_usage(job_id);
CREATE INDEX idx_job_material_usage_material ON job_material_usage(material_id);
CREATE INDEX idx_job_material_usage_sustainable ON job_material_usage(sustainable_alternative);

-- Recommendations
CREATE INDEX idx_sustainability_recommendations_target ON sustainability_recommendations(target_id, target_type);
CREATE INDEX idx_sustainability_recommendations_status ON sustainability_recommendations(status);
CREATE INDEX idx_sustainability_recommendations_priority ON sustainability_recommendations(priority_score DESC);

-- Eco jobs
CREATE INDEX idx_eco_jobs_job ON eco_jobs(job_id);
CREATE INDEX idx_eco_jobs_category ON eco_jobs(eco_category);
CREATE INDEX idx_eco_jobs_score ON eco_jobs(sustainability_score DESC);
CREATE INDEX idx_eco_jobs_certification ON eco_jobs(certification_eligible);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE sustainability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_esg_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainable_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_offsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_sustainability_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Sustainability metrics: Users can view their own and public data
CREATE POLICY "Users can view their own sustainability metrics"
    ON sustainability_metrics FOR ALL
    TO authenticated
    USING (
        entity_id = auth.uid() OR
        entity_type = 'material' -- Materials are public
    );

-- ESG scores: Public read for verified contractors, own write
CREATE POLICY "ESG scores are publicly viewable"
    ON contractor_esg_scores FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own ESG scores"
    ON contractor_esg_scores FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Green certifications: Public read, own write
CREATE POLICY "Verified certifications are publicly viewable"
    ON green_certifications FOR SELECT
    TO authenticated
    USING (verification_status = 'verified');

CREATE POLICY "Users can manage their own certifications"
    ON green_certifications FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Certification types: Public read
CREATE POLICY "Certification types are publicly viewable"
    ON certification_types FOR SELECT
    TO authenticated
    USING (true);

-- Sustainable materials: Public read
CREATE POLICY "Sustainable materials are publicly viewable"
    ON sustainable_materials FOR SELECT
    TO authenticated
    USING (true);

-- Job material usage: Job participants can view
CREATE POLICY "Job participants can view material usage"
    ON job_material_usage FOR SELECT
    TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs 
            WHERE homeowner_id = auth.uid() OR contractor_id = auth.uid()
        )
    );

CREATE POLICY "Job participants can manage material usage"
    ON job_material_usage FOR ALL
    TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs 
            WHERE contractor_id = auth.uid()
        )
    );

-- Recommendations: Target users can view and manage
CREATE POLICY "Users can view their own sustainability recommendations"
    ON sustainability_recommendations FOR SELECT
    TO authenticated
    USING (
        target_id = auth.uid() OR
        target_id IN (SELECT id FROM jobs WHERE homeowner_id = auth.uid() OR contractor_id = auth.uid())
    );

-- Eco jobs: Job participants can view
CREATE POLICY "Job participants can view eco job data"
    ON eco_jobs FOR SELECT
    TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs 
            WHERE homeowner_id = auth.uid() OR contractor_id = auth.uid()
        )
    );

-- Community projects: Public read for completed projects
CREATE POLICY "Completed community projects are publicly viewable"
    ON community_sustainability_projects FOR SELECT
    TO authenticated
    USING (status = 'completed' OR contractor_id = auth.uid());

-- Sustainability reports: Respect visibility settings
CREATE POLICY "Sustainability reports visibility control"
    ON sustainability_reports FOR SELECT
    TO authenticated
    USING (
        contractor_id = auth.uid() OR
        visibility = 'public'
    );

-- =====================================================
-- STORED FUNCTIONS FOR ESG CALCULATIONS
-- =====================================================

-- Function to calculate contractor ESG score components
CREATE OR REPLACE FUNCTION calculate_environmental_score(contractor_id UUID)
RETURNS INTEGER AS $$
DECLARE
    avg_carbon DECIMAL;
    renewable_pct DECIMAL;
    waste_score DECIMAL;
    material_score DECIMAL;
    env_score INTEGER;
BEGIN
    -- Get latest sustainability metrics
    SELECT 
        COALESCE(AVG(carbon_footprint_kg), 50),
        COALESCE(AVG(renewable_energy_percentage), 25),
        COALESCE(AVG(100 - waste_generated_kg), 50),
        COALESCE(AVG(recycled_materials_percentage), 30)
    INTO avg_carbon, renewable_pct, waste_score, material_score
    FROM sustainability_metrics 
    WHERE entity_id = contractor_id AND entity_type = 'contractor'
    AND created_at >= NOW() - INTERVAL '12 months';

    -- Calculate weighted environmental score
    env_score := GREATEST(0, LEAST(100, 
        (GREATEST(0, 100 - (avg_carbon / 100 * 100)) * 0.4) +
        (renewable_pct * 0.3) +
        (waste_score * 0.2) +
        (material_score * 0.1)
    ));

    RETURN env_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update ESG score automatically
CREATE OR REPLACE FUNCTION update_contractor_esg_score(contractor_id UUID)
RETURNS VOID AS $$
DECLARE
    env_score INTEGER;
    social_score INTEGER;
    gov_score INTEGER;
    overall_score INTEGER;
    cert_level VARCHAR(20);
BEGIN
    -- Calculate component scores
    env_score := calculate_environmental_score(contractor_id);
    
    -- Social score (simplified calculation)
    SELECT COALESCE(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 10) +
        (AVG(CASE WHEN client_satisfaction IS NOT NULL THEN client_satisfaction * 20 END)),
        60
    ) INTO social_score
    FROM sustainability_education 
    WHERE contractor_id = update_contractor_esg_score.contractor_id
    AND created_at >= NOW() - INTERVAL '12 months';
    
    social_score := GREATEST(0, LEAST(100, social_score));
    
    -- Governance score (simplified calculation)
    SELECT COALESCE(
        (COUNT(*) * 15) + 50,
        50
    ) INTO gov_score
    FROM green_certifications 
    WHERE contractor_id = update_contractor_esg_score.contractor_id
    AND verification_status = 'verified';
    
    gov_score := GREATEST(0, LEAST(100, gov_score));
    
    -- Overall weighted score
    overall_score := ROUND(
        (env_score * 0.4) +
        (social_score * 0.35) +
        (gov_score * 0.25)
    );
    
    -- Determine certification level
    cert_level := CASE 
        WHEN overall_score >= 90 THEN 'platinum'
        WHEN overall_score >= 80 THEN 'gold'
        WHEN overall_score >= 70 THEN 'silver'
        ELSE 'bronze'
    END;
    
    -- Update or insert ESG score
    INSERT INTO contractor_esg_scores (
        contractor_id, overall_esg_score, environmental_score, 
        social_score, governance_score, certification_level,
        last_calculated, updated_at
    ) VALUES (
        contractor_id, overall_score, env_score,
        social_score, gov_score, cert_level,
        NOW(), NOW()
    )
    ON CONFLICT (contractor_id) 
    DO UPDATE SET
        overall_esg_score = overall_score,
        environmental_score = env_score,
        social_score = social_score,
        governance_score = gov_score,
        certification_level = cert_level,
        last_calculated = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate sustainability recommendations
CREATE OR REPLACE FUNCTION generate_sustainability_recommendations(
    target_type VARCHAR(20),
    target_id UUID
) RETURNS INTEGER AS $$
DECLARE
    recommendation_count INTEGER := 0;
    current_score INTEGER;
    carbon_footprint DECIMAL;
BEGIN
    -- Get current sustainability metrics
    IF target_type = 'contractor' THEN
        SELECT overall_esg_score INTO current_score
        FROM contractor_esg_scores
        WHERE contractor_id = target_id;
        
        SELECT AVG(carbon_footprint_kg) INTO carbon_footprint
        FROM sustainability_metrics
        WHERE entity_id = target_id AND entity_type = 'contractor';
    END IF;
    
    -- Generate recommendations based on current performance
    IF current_score < 70 THEN
        -- Low performance - basic recommendations
        INSERT INTO sustainability_recommendations (
            target_type, target_id, recommendation_type,
            title, description, expected_carbon_reduction,
            difficulty_level, priority_score
        ) VALUES 
        (
            target_type, target_id, 'certification',
            'Pursue Green Building Certification',
            'Getting certified in sustainable building practices will improve your ESG score and attract eco-conscious clients.',
            0, 'moderate', 80
        ),
        (
            target_type, target_id, 'process_improvement',
            'Implement Waste Sorting Program',
            'Sort construction waste on-site to increase recycling rates and reduce landfill contributions.',
            carbon_footprint * 0.2, 'easy', 70
        );
        
        recommendation_count := 2;
    END IF;
    
    RETURN recommendation_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update ESG scores when sustainability metrics change
CREATE OR REPLACE FUNCTION trigger_esg_score_update() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entity_type = 'contractor' THEN
        PERFORM update_contractor_esg_score(NEW.entity_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_esg_score_trigger
    AFTER INSERT OR UPDATE ON sustainability_metrics
    FOR EACH ROW EXECUTE FUNCTION trigger_esg_score_update();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Seed certification types
INSERT INTO certification_types (
    name, category, description, requirements, benefits,
    min_score_required, score_boost, cost_estimate, duration_months
) VALUES
-- Environmental Certifications
(
    'ISO 14001 Environmental Management', 'environmental',
    'International standard for environmental management systems',
    ARRAY['Environmental policy', 'Legal compliance', 'Continuous improvement plan'],
    ARRAY['Reduced environmental impact', 'Cost savings', 'Competitive advantage'],
    65, 15, 2500.00, 12
),
(
    'BREEAM Certified Professional', 'environmental',
    'Building Research Establishment Environmental Assessment Method certification',
    ARRAY['Training completion', 'Assessment pass', 'Annual CPD'],
    ARRAY['Green building expertise', 'Premium project access', 'Industry recognition'],
    70, 20, 1800.00, 24
),
-- Social Certifications
(
    'B Corp Certification', 'social',
    'Certification for companies meeting high standards of social and environmental performance',
    ARRAY['Impact assessment', 'Legal accountability', 'Public transparency'],
    ARRAY['Brand reputation', 'Talent attraction', 'Customer loyalty'],
    75, 25, 3500.00, 36
),
(
    'Fair Trade Certified', 'social',
    'Certification ensuring fair labor practices and community development',
    ARRAY['Fair wage standards', 'Worker safety', 'Community investment'],
    ARRAY['Ethical sourcing', 'Social impact', 'Market differentiation'],
    65, 15, 1200.00, 12
),
-- Governance Certifications
(
    'GRI Sustainability Reporting', 'governance',
    'Global Reporting Initiative standards for sustainability reporting',
    ARRAY['Stakeholder engagement', 'Materiality assessment', 'Regular reporting'],
    ARRAY['Transparency', 'Investor confidence', 'Risk management'],
    70, 18, 2000.00, 12
);

-- Seed sustainable materials database
INSERT INTO sustainable_materials (
    name, category, carbon_intensity, recyclability_score, 
    local_availability_uk, certification_labels, cost_premium_percentage, alternative_to
) VALUES
-- Paint & Finishes
(
    'Low-VOC Interior Paint', 'paint', 2.1, 30, true,
    ARRAY['Green Seal', 'GREENGUARD'], 15.0,
    ARRAY['Standard Latex Paint', 'Oil-based Paint']
),
(
    'Natural Clay Paint', 'paint', 0.8, 85, true,
    ARRAY['Cradle to Cradle', 'LEED'], 35.0,
    ARRAY['Acrylic Paint', 'Vinyl Paint']
),
-- Insulation
(
    'Recycled Denim Insulation', 'insulation', 1.2, 95, false,
    ARRAY['UL Environment', 'GREENGUARD Gold'], 20.0,
    ARRAY['Fiberglass Insulation', 'Foam Insulation']
),
(
    'Sheep Wool Insulation', 'insulation', 0.9, 100, true,
    ARRAY['Nature Plus', 'OEKO-TEX'], 45.0,
    ARRAY['Mineral Wool', 'Polystyrene Insulation']
),
-- Flooring
(
    'FSC-Certified Bamboo Flooring', 'flooring', 3.2, 80, false,
    ARRAY['FSC', 'FloorScore'], 25.0,
    ARRAY['Hardwood Flooring', 'Laminate Flooring']
),
(
    'Reclaimed Wood Flooring', 'flooring', 1.8, 90, true,
    ARRAY['FSC Recycled', 'Reclaim Design'], 30.0,
    ARRAY['New Hardwood', 'Engineered Wood']
),
-- Plumbing
(
    'Low-Flow Toilet', 'plumbing', 45.0, 75, true,
    ARRAY['WaterSense', 'Energy Star'], 10.0,
    ARRAY['Standard Toilet', 'High-Flow Toilet']
),
(
    'PEX Piping', 'plumbing', 8.5, 70, true,
    ARRAY['NSF', 'ASTM'], 12.0,
    ARRAY['Copper Piping', 'PVC Piping']
);

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON sustainability_metrics TO authenticated;
GRANT SELECT ON contractor_esg_scores TO authenticated;
GRANT ALL ON green_certifications TO authenticated;
GRANT SELECT ON certification_types TO authenticated;
GRANT SELECT ON sustainable_materials TO authenticated;
GRANT ALL ON job_material_usage TO authenticated;
GRANT SELECT ON sustainability_recommendations TO authenticated;
GRANT ALL ON recommendation_implementations TO authenticated;
GRANT SELECT ON eco_jobs TO authenticated;
GRANT ALL ON sustainability_education TO authenticated;
GRANT ALL ON carbon_offsets TO authenticated;
GRANT SELECT ON community_sustainability_projects TO authenticated;
GRANT SELECT ON sustainability_reports TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_environmental_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_contractor_esg_score TO authenticated;
GRANT EXECUTE ON FUNCTION generate_sustainability_recommendations TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE sustainability_metrics IS 'Comprehensive sustainability metrics for contractors and jobs';
COMMENT ON TABLE contractor_esg_scores IS 'ESG scores for contractors with environmental, social, and governance components';
COMMENT ON TABLE green_certifications IS 'Green certifications earned by contractors';
COMMENT ON TABLE sustainable_materials IS 'Database of sustainable building materials and alternatives';
COMMENT ON TABLE eco_jobs IS 'Jobs with specific sustainability focus and tracking';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Sustainability & ESG scoring migration completed successfully';
    RAISE NOTICE 'Created comprehensive sustainability tracking for eco-conscious marketplace';
    RAISE NOTICE 'Seeded % certification types and % sustainable materials', 
        (SELECT COUNT(*) FROM certification_types),
        (SELECT COUNT(*) FROM sustainable_materials);
END $$;