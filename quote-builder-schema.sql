-- =====================================================
-- Advanced Quote Builder System Migration
-- Professional quote generation with templates and automation
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- QUOTE TEMPLATES AND MANAGEMENT
-- =====================================================

-- Quote templates for different job types
CREATE TABLE quote_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(100) NOT NULL,
    job_type VARCHAR(100),
    
    -- Template content
    description TEXT,
    terms_conditions TEXT,
    warranty_info TEXT,
    payment_terms VARCHAR(255) DEFAULT '50% upfront, 50% on completion',
    validity_days INTEGER DEFAULT 30,
    
    -- Pricing structure
    labor_rate DECIMAL(8, 2),
    minimum_charge DECIMAL(8, 2),
    call_out_fee DECIMAL(8, 2) DEFAULT 0.00,
    
    -- Template settings
    auto_calculate_materials BOOLEAN DEFAULT FALSE,
    include_travel_time BOOLEAN DEFAULT TRUE,
    include_cleanup BOOLEAN DEFAULT TRUE,
    markup_percentage DECIMAL(5, 2) DEFAULT 0.00,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Branding
    company_logo_url TEXT,
    company_colors JSONB DEFAULT '{}',
    header_text TEXT,
    footer_text TEXT,
    
    -- Usage tracking
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    times_used INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_contractor_template_name UNIQUE(contractor_id, template_name)
);

-- Predefined line item templates
CREATE TABLE quote_line_item_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'each',
    min_quantity DECIMAL(8, 3) DEFAULT 1.000,
    max_quantity DECIMAL(8, 3),
    
    -- Time estimates
    estimated_hours DECIMAL(6, 2),
    setup_time_hours DECIMAL(6, 2) DEFAULT 0.00,
    
    -- Material requirements
    materials_included BOOLEAN DEFAULT FALSE,
    material_cost DECIMAL(10, 2) DEFAULT 0.00,
    material_markup DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Pricing rules
    bulk_discount_threshold INTEGER,
    bulk_discount_percentage DECIMAL(5, 2),
    seasonal_pricing JSONB DEFAULT '{}',
    
    -- Usage tracking
    is_active BOOLEAN DEFAULT TRUE,
    times_used INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    average_rating DECIMAL(3, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated quotes
CREATE TABLE contractor_quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES quote_templates(id) ON DELETE SET NULL,
    
    -- Client information
    client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_address TEXT,
    
    -- Job information
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    quote_number VARCHAR(100) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT,
    job_location TEXT,
    
    -- Quote content
    quote_notes TEXT,
    terms_conditions TEXT,
    warranty_info TEXT,
    payment_terms VARCHAR(255),
    validity_date TIMESTAMPTZ NOT NULL,
    
    -- Pricing summary
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    labor_total DECIMAL(12, 2) DEFAULT 0.00,
    materials_total DECIMAL(12, 2) DEFAULT 0.00,
    travel_charge DECIMAL(10, 2) DEFAULT 0.00,
    markup_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.2000,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Quote status and tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled')),
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    
    -- Follow-up tracking
    follow_up_count INTEGER DEFAULT 0,
    last_follow_up TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    
    -- Conversion tracking
    converted_to_job BOOLEAN DEFAULT FALSE,
    conversion_date TIMESTAMPTZ,
    actual_job_value DECIMAL(12, 2),
    
    -- Document management
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    document_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_quote_number UNIQUE(quote_number)
);

-- Quote line items
CREATE TABLE quote_line_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    template_item_id UUID REFERENCES quote_line_item_templates(id) ON DELETE SET NULL,
    
    -- Item details
    item_order INTEGER NOT NULL DEFAULT 1,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Quantities and pricing
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(50) DEFAULT 'each',
    unit_price DECIMAL(10, 2) NOT NULL,
    labor_hours DECIMAL(6, 2),
    labor_rate DECIMAL(8, 2),
    material_cost DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Calculations
    line_total DECIMAL(12, 2) NOT NULL,
    tax_applicable BOOLEAN DEFAULT TRUE,
    
    -- Additional options
    is_optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote revisions/versions
CREATE TABLE quote_revisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    
    -- Snapshot of quote data at revision time
    quote_data JSONB NOT NULL,
    line_items_data JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    
    -- Revision metadata
    revision_reason VARCHAR(255),
    revised_by UUID REFERENCES auth.users(id),
    client_requested BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_quote_revision UNIQUE(quote_id, revision_number)
);

-- Quote interactions and analytics
CREATE TABLE quote_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- sent, viewed, downloaded, shared, etc.
    
    -- Interaction details
    user_agent TEXT,
    ip_address INET,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    -- Timing
    interaction_duration INTEGER, -- seconds spent viewing
    page_views INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote performance analytics
CREATE TABLE quote_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES quote_templates(id) ON DELETE SET NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Volume metrics
    quotes_created INTEGER DEFAULT 0,
    quotes_sent INTEGER DEFAULT 0,
    quotes_viewed INTEGER DEFAULT 0,
    quotes_accepted INTEGER DEFAULT 0,
    quotes_declined INTEGER DEFAULT 0,
    quotes_expired INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_quoted_value DECIMAL(15, 2) DEFAULT 0.00,
    total_accepted_value DECIMAL(15, 2) DEFAULT 0.00,
    average_quote_value DECIMAL(12, 2) DEFAULT 0.00,
    highest_quote_value DECIMAL(12, 2) DEFAULT 0.00,
    lowest_quote_value DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Performance metrics
    acceptance_rate DECIMAL(5, 2) DEFAULT 0.00,
    decline_rate DECIMAL(5, 2) DEFAULT 0.00,
    view_rate DECIMAL(5, 2) DEFAULT 0.00,
    conversion_time_avg DECIMAL(8, 2), -- hours from send to acceptance
    
    -- Response metrics
    response_time_avg DECIMAL(8, 2), -- hours from inquiry to quote
    follow_up_effectiveness DECIMAL(5, 2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Quote templates indexes
CREATE INDEX idx_quote_templates_contractor ON quote_templates(contractor_id);
CREATE INDEX idx_quote_templates_category ON quote_templates(template_category);
CREATE INDEX idx_quote_templates_active ON quote_templates(is_active) WHERE is_active = TRUE;

-- Line item templates indexes
CREATE INDEX idx_line_item_templates_contractor ON quote_line_item_templates(contractor_id);
CREATE INDEX idx_line_item_templates_category ON quote_line_item_templates(item_category);
CREATE INDEX idx_line_item_templates_active ON quote_line_item_templates(is_active) WHERE is_active = TRUE;

-- Quotes indexes
CREATE INDEX idx_contractor_quotes_contractor ON contractor_quotes(contractor_id);
CREATE INDEX idx_contractor_quotes_client ON contractor_quotes(client_id);
CREATE INDEX idx_contractor_quotes_status ON contractor_quotes(status);
CREATE INDEX idx_contractor_quotes_created ON contractor_quotes(created_at DESC);
CREATE INDEX idx_contractor_quotes_validity ON contractor_quotes(validity_date);
CREATE INDEX idx_contractor_quotes_number ON contractor_quotes(quote_number);

-- Line items indexes
CREATE INDEX idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX idx_quote_line_items_template ON quote_line_items(template_item_id);

-- Analytics indexes
CREATE INDEX idx_quote_analytics_contractor ON quote_analytics(contractor_id);
CREATE INDEX idx_quote_analytics_template ON quote_analytics(template_id);
CREATE INDEX idx_quote_analytics_period ON quote_analytics(period_start, period_end);

-- =====================================================
-- STORED FUNCTIONS
-- =====================================================

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(p_contractor_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    current_year INTEGER;
    last_number INTEGER;
    new_number VARCHAR;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Get the last quote number for this contractor in current year
    SELECT COALESCE(
        MAX(
            CAST(
                SPLIT_PART(quote_number, '-', 3) AS INTEGER
            )
        ), 0
    ) INTO last_number
    FROM contractor_quotes
    WHERE contractor_id = p_contractor_id
    AND quote_number LIKE 'QTE-' || current_year || '-%';
    
    -- Generate new quote number
    new_number := 'QTE-' || current_year || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals(p_quote_id UUID)
RETURNS VOID AS $$
DECLARE
    subtotal DECIMAL(12, 2) := 0;
    labor_total DECIMAL(12, 2) := 0;
    materials_total DECIMAL(12, 2) := 0;
    markup_amount DECIMAL(12, 2) := 0;
    discount_amount DECIMAL(12, 2) := 0;
    tax_amount DECIMAL(12, 2) := 0;
    total_amount DECIMAL(12, 2) := 0;
    quote_record RECORD;
BEGIN
    -- Get quote details
    SELECT * INTO quote_record FROM contractor_quotes WHERE id = p_quote_id;
    
    -- Calculate subtotal from line items
    SELECT 
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(CASE WHEN labor_hours > 0 THEN labor_hours * labor_rate ELSE 0 END), 0),
        COALESCE(SUM(material_cost), 0)
    INTO subtotal, labor_total, materials_total
    FROM quote_line_items 
    WHERE quote_id = p_quote_id;
    
    -- Add travel charge to subtotal
    subtotal := subtotal + COALESCE(quote_record.travel_charge, 0);
    
    -- Calculate markup if percentage is set
    IF quote_record.markup_percentage > 0 THEN
        markup_amount := subtotal * (quote_record.markup_percentage / 100);
    END IF;
    
    -- Calculate discount if percentage is set
    IF quote_record.discount_percentage > 0 THEN
        discount_amount := subtotal * (quote_record.discount_percentage / 100);
    END IF;
    
    -- Calculate tax
    tax_amount := (subtotal + markup_amount - discount_amount) * quote_record.tax_rate;
    
    -- Calculate final total
    total_amount := subtotal + markup_amount - discount_amount + tax_amount;
    
    -- Update quote with calculated totals
    UPDATE contractor_quotes
    SET 
        subtotal = subtotal,
        labor_total = labor_total,
        materials_total = materials_total,
        markup_amount = markup_amount,
        discount_amount = discount_amount,
        tax_amount = tax_amount,
        total_amount = total_amount,
        updated_at = NOW()
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Contractors manage own quote templates"
    ON quote_templates FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors manage own line item templates"
    ON quote_line_item_templates FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors manage own quotes"
    ON contractor_quotes FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Clients can view their quotes
CREATE POLICY "Clients can view their quotes"
    ON contractor_quotes FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY "Quote line items follow quote access"
    ON quote_line_items FOR ALL
    TO authenticated
    USING (
        quote_id IN (
            SELECT id FROM contractor_quotes 
            WHERE contractor_id = auth.uid() OR client_id = auth.uid()
        )
    );

CREATE POLICY "Quote revisions follow quote access"
    ON quote_revisions FOR ALL
    TO authenticated
    USING (
        quote_id IN (
            SELECT id FROM contractor_quotes 
            WHERE contractor_id = auth.uid() OR client_id = auth.uid()
        )
    );

CREATE POLICY "Quote interactions follow quote access"
    ON quote_interactions FOR ALL
    TO authenticated
    USING (
        quote_id IN (
            SELECT id FROM contractor_quotes 
            WHERE contractor_id = auth.uid() OR client_id = auth.uid()
        )
    );

CREATE POLICY "Contractors access own quote analytics"
    ON quote_analytics FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update quote totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_line_items_totals
    AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_quote_totals();

-- Update timestamps
CREATE TRIGGER trigger_quote_templates_updated_at
    BEFORE UPDATE ON quote_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_line_item_templates_updated_at
    BEFORE UPDATE ON quote_line_item_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_contractor_quotes_updated_at
    BEFORE UPDATE ON contractor_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON quote_templates TO authenticated;
GRANT ALL ON quote_line_item_templates TO authenticated;
GRANT ALL ON contractor_quotes TO authenticated;
GRANT ALL ON quote_line_items TO authenticated;
GRANT ALL ON quote_revisions TO authenticated;
GRANT ALL ON quote_interactions TO authenticated;
GRANT ALL ON quote_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION generate_quote_number TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_quote_totals TO authenticated;

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE quote_templates IS 'Reusable quote templates for different job types and pricing structures';
COMMENT ON TABLE quote_line_item_templates IS 'Predefined line items with pricing for quick quote building';
COMMENT ON TABLE contractor_quotes IS 'Generated quotes with full pricing details and status tracking';
COMMENT ON TABLE quote_line_items IS 'Individual line items within quotes with quantities and pricing';
COMMENT ON TABLE quote_revisions IS 'Version history of quote changes for audit trail';
COMMENT ON TABLE quote_interactions IS 'Tracking of quote views, downloads, and client interactions';
COMMENT ON TABLE quote_analytics IS 'Performance analytics and conversion metrics for quotes';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Advanced Quote Builder System migration completed successfully';
    RAISE NOTICE 'Created professional quote generation with templates and analytics';
    RAISE NOTICE 'Features: Template management, Line item library, Automated calculations, Performance tracking';
END $$;