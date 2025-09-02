-- =====================================================
-- Contractor Business Suite Migration
-- Comprehensive business management platform for contractors
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BUSINESS ANALYTICS & PERFORMANCE TRACKING
-- =====================================================

-- Business metrics aggregated by time period
CREATE TABLE business_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    total_revenue DECIMAL(12, 2) DEFAULT 0.0,
    total_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    cancelled_jobs INTEGER DEFAULT 0,
    average_job_value DECIMAL(10, 2) DEFAULT 0.0,
    completion_rate DECIMAL(5, 2) DEFAULT 0.0,
    client_satisfaction DECIMAL(3, 2) DEFAULT 0.0,
    repeat_client_rate DECIMAL(5, 2) DEFAULT 0.0,
    response_time_avg INTEGER DEFAULT 0, -- minutes
    quote_conversion_rate DECIMAL(5, 2) DEFAULT 0.0,
    profit_margin DECIMAL(5, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id, period_start, period_end, period_type)
);

-- Performance trends tracking
CREATE TABLE performance_trends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(12, 4) NOT NULL,
    previous_value DECIMAL(12, 4),
    change_percentage DECIMAL(8, 4),
    trend_direction VARCHAR(20) DEFAULT 'stable' CHECK (trend_direction IN ('improving', 'stable', 'declining')),
    measurement_date TIMESTAMPTZ DEFAULT NOW(),
    period_type VARCHAR(20) DEFAULT 'monthly'
);

-- =====================================================
-- FINANCIAL MANAGEMENT SYSTEM
-- =====================================================

-- Invoice management
CREATE TABLE contractor_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    tax_rate DECIMAL(5, 4) DEFAULT 0.2000, -- 20% VAT
    tax_amount DECIMAL(10, 2) DEFAULT 0.0,
    discount_amount DECIMAL(10, 2) DEFAULT 0.0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    currency VARCHAR(3) DEFAULT 'GBP',
    notes TEXT,
    payment_terms VARCHAR(100) DEFAULT '30 days',
    late_fee DECIMAL(10, 2) DEFAULT 0.0,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id, invoice_number)
);

-- Invoice line items
CREATE TABLE invoice_line_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES contractor_invoices(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(20) DEFAULT 'each',
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    tax_applicable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense tracking
CREATE TABLE contractor_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    expense_number VARCHAR(50), -- Auto-generated reference number
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date TIMESTAMPTZ NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    receipt_url TEXT,
    receipt_filename VARCHAR(255),
    tax_deductible BOOLEAN DEFAULT TRUE,
    business_purpose TEXT,
    mileage INTEGER, -- For travel expenses
    vehicle_registration VARCHAR(20),
    supplier VARCHAR(255),
    vat_amount DECIMAL(10, 2) DEFAULT 0.0,
    reference_number VARCHAR(100),
    reimbursable BOOLEAN DEFAULT FALSE,
    reimbursed BOOLEAN DEFAULT FALSE,
    reimbursed_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment records
CREATE TABLE contractor_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES contractor_invoices(id) ON DELETE SET NULL,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_reference VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_id VARCHAR(255),
    gateway_reference VARCHAR(255),
    fees DECIMAL(10, 2) DEFAULT 0.0,
    net_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    failure_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SCHEDULING & RESOURCE MANAGEMENT
-- =====================================================

-- Contractor schedules and availability
CREATE TABLE contractor_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_date TIMESTAMPTZ NOT NULL,
    time_slots JSONB NOT NULL DEFAULT '[]', -- Array of time slot objects
    daily_capacity DECIMAL(4, 2) DEFAULT 8.0, -- hours
    travel_time_buffer INTEGER DEFAULT 30, -- minutes between jobs
    location_preferences TEXT[] DEFAULT '{}',
    max_jobs_per_day INTEGER DEFAULT 5,
    break_duration INTEGER DEFAULT 60, -- minutes
    lunch_time_start TIME,
    lunch_time_end TIME,
    overtime_rate DECIMAL(10, 2),
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable', 'holiday')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id, schedule_date)
);

-- Resource and inventory management
CREATE TABLE contractor_inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    current_stock DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    unit VARCHAR(20) DEFAULT 'each',
    min_stock_level DECIMAL(10, 3) DEFAULT 0.000,
    max_stock_level DECIMAL(10, 3) DEFAULT 0.000,
    reorder_point DECIMAL(10, 3) DEFAULT 0.000,
    unit_cost DECIMAL(10, 2) DEFAULT 0.00,
    average_cost DECIMAL(10, 2) DEFAULT 0.00,
    last_cost DECIMAL(10, 2) DEFAULT 0.00,
    supplier VARCHAR(255),
    supplier_contact TEXT,
    supplier_product_code VARCHAR(100),
    last_restocked TIMESTAMPTZ,
    last_order_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    location VARCHAR(255) DEFAULT 'warehouse',
    bin_location VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'low_stock', 'out_of_stock', 'expired', 'discontinued')),
    auto_reorder BOOLEAN DEFAULT FALSE,
    reorder_quantity DECIMAL(10, 3),
    lead_time_days INTEGER DEFAULT 7,
    notes TEXT,
    barcode VARCHAR(100),
    serial_numbers TEXT[] DEFAULT '{}',
    warranty_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment management and maintenance
CREATE TABLE contractor_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    asset_tag VARCHAR(50),
    purchase_date TIMESTAMPTZ,
    purchase_price DECIMAL(12, 2) DEFAULT 0.00,
    current_value DECIMAL(12, 2) DEFAULT 0.00,
    depreciation_rate DECIMAL(5, 4) DEFAULT 0.2000, -- 20% per year
    warranty_start TIMESTAMPTZ,
    warranty_end TIMESTAMPTZ,
    warranty_provider VARCHAR(255),
    maintenance_schedule JSONB DEFAULT '[]', -- Array of maintenance records
    next_service_date TIMESTAMPTZ,
    service_interval_days INTEGER DEFAULT 365,
    operating_hours DECIMAL(10, 2) DEFAULT 0.00,
    location VARCHAR(255) DEFAULT 'workshop',
    condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'in_use', 'maintenance', 'retired', 'sold')),
    insurance_policy VARCHAR(100),
    insurance_expiry TIMESTAMPTZ,
    insurance_value DECIMAL(12, 2),
    last_inspection TIMESTAMPTZ,
    inspection_due TIMESTAMPTZ,
    usage_log JSONB DEFAULT '[]',
    notes TEXT,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENT RELATIONSHIP MANAGEMENT
-- =====================================================

-- Enhanced client management
CREATE TABLE contractor_clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_type VARCHAR(20) DEFAULT 'residential' CHECK (client_type IN ('residential', 'commercial', 'industrial', 'government')),
    relationship_status VARCHAR(20) DEFAULT 'active' CHECK (relationship_status IN ('prospect', 'active', 'inactive', 'former')),
    first_contact_date TIMESTAMPTZ DEFAULT NOW(),
    last_contact_date TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    total_jobs INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    average_job_value DECIMAL(10, 2) DEFAULT 0.00,
    last_job_date TIMESTAMPTZ,
    payment_terms VARCHAR(50) DEFAULT '30 days',
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    preferred_contact_time VARCHAR(50),
    communication_frequency VARCHAR(20) DEFAULT 'normal',
    credit_limit DECIMAL(10, 2) DEFAULT 0.00,
    payment_history_score INTEGER DEFAULT 100, -- 0-100
    satisfaction_score INTEGER, -- 1-5
    referral_source VARCHAR(100),
    acquisition_cost DECIMAL(10, 2) DEFAULT 0.00,
    lifetime_value DECIMAL(12, 2) DEFAULT 0.00,
    churn_risk_score INTEGER DEFAULT 0, -- 0-100
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    special_requirements TEXT,
    billing_preferences JSONB DEFAULT '{}',
    contact_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contractor_id, client_id)
);

-- Client interaction history
CREATE TABLE client_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(30) NOT NULL, -- call, email, meeting, text, etc.
    interaction_direction VARCHAR(10) DEFAULT 'outbound' CHECK (interaction_direction IN ('inbound', 'outbound')),
    subject VARCHAR(255),
    summary TEXT NOT NULL,
    outcome VARCHAR(100),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMPTZ,
    duration_minutes INTEGER,
    interaction_rating INTEGER, -- 1-5
    attachments TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MARKETING & BUSINESS GROWTH
-- =====================================================

-- Marketing campaigns
CREATE TABLE marketing_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    budget DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    spent DECIMAL(10, 2) DEFAULT 0.00,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    target_audience JSONB DEFAULT '{}',
    campaign_channels TEXT[] DEFAULT '{}',
    creative_assets TEXT[] DEFAULT '{}',
    tracking_codes TEXT[] DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    conversion_goals JSONB DEFAULT '{}',
    roi_target DECIMAL(8, 2),
    actual_roi DECIMAL(8, 2),
    leads_generated INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    revenue_attributed DECIMAL(10, 2) DEFAULT 0.00,
    cost_per_lead DECIMAL(10, 2) DEFAULT 0.00,
    cost_per_conversion DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business goals and objectives
CREATE TABLE business_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_category VARCHAR(50) NOT NULL, -- revenue, jobs, rating, growth, efficiency, etc.
    goal_type VARCHAR(20) DEFAULT 'target' CHECK (goal_type IN ('target', 'milestone', 'kpi')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(12, 2) NOT NULL,
    current_value DECIMAL(12, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'number',
    target_date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled', 'on_hold')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    milestones JSONB DEFAULT '[]',
    success_criteria TEXT,
    measurement_frequency VARCHAR(20) DEFAULT 'weekly',
    last_measured TIMESTAMPTZ,
    next_measurement TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id),
    completion_reward TEXT,
    failure_consequences TEXT,
    related_goals UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal progress tracking
CREATE TABLE goal_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES business_goals(id) ON DELETE CASCADE,
    measured_value DECIMAL(12, 2) NOT NULL,
    progress_percentage DECIMAL(5, 2) NOT NULL,
    measurement_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    milestone_achieved VARCHAR(255),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BUSINESS REPORTING & ANALYTICS
-- =====================================================

-- Business reports
CREATE TABLE business_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- financial, performance, client, marketing
    report_period_start TIMESTAMPTZ NOT NULL,
    report_period_end TIMESTAMPTZ NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    report_summary TEXT,
    key_insights TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    charts_data JSONB DEFAULT '{}',
    generated_by VARCHAR(20) DEFAULT 'system',
    format VARCHAR(20) DEFAULT 'digital' CHECK (format IN ('digital', 'pdf', 'excel', 'csv')),
    file_url TEXT,
    file_size INTEGER,
    shared_with UUID[] DEFAULT '{}',
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    scheduled_report BOOLEAN DEFAULT FALSE,
    schedule_frequency VARCHAR(20),
    next_generation TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business intelligence snapshots
CREATE TABLE business_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date TIMESTAMPTZ NOT NULL,
    business_health_score INTEGER DEFAULT 0, -- 0-100
    financial_health JSONB DEFAULT '{}',
    operational_health JSONB DEFAULT '{}',
    client_health JSONB DEFAULT '{}',
    market_position JSONB DEFAULT '{}',
    growth_indicators JSONB DEFAULT '{}',
    risk_factors TEXT[] DEFAULT '{}',
    opportunities TEXT[] DEFAULT '{}',
    benchmark_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Business metrics indexes
CREATE INDEX idx_business_metrics_contractor ON business_metrics(contractor_id);
CREATE INDEX idx_business_metrics_period ON business_metrics(period_start, period_end);
CREATE INDEX idx_business_metrics_type ON business_metrics(period_type);
CREATE INDEX idx_performance_trends_contractor ON performance_trends(contractor_id);
CREATE INDEX idx_performance_trends_metric ON performance_trends(metric_name);
CREATE INDEX idx_performance_trends_date ON performance_trends(measurement_date DESC);

-- Financial management indexes
CREATE INDEX idx_invoices_contractor ON contractor_invoices(contractor_id);
CREATE INDEX idx_invoices_status ON contractor_invoices(status);
CREATE INDEX idx_invoices_due_date ON contractor_invoices(due_date);
CREATE INDEX idx_invoices_client ON contractor_invoices(client_id);
CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_expenses_contractor ON contractor_expenses(contractor_id);
CREATE INDEX idx_expenses_category ON contractor_expenses(category);
CREATE INDEX idx_expenses_date ON contractor_expenses(expense_date);
CREATE INDEX idx_expenses_tax_deductible ON contractor_expenses(tax_deductible);
CREATE INDEX idx_payments_contractor ON contractor_payments(contractor_id);
CREATE INDEX idx_payments_status ON contractor_payments(status);

-- Scheduling and resources indexes
CREATE INDEX idx_schedules_contractor_date ON contractor_schedules(contractor_id, schedule_date);
CREATE INDEX idx_schedules_date ON contractor_schedules(schedule_date);
CREATE INDEX idx_inventory_contractor ON contractor_inventory(contractor_id);
CREATE INDEX idx_inventory_category ON contractor_inventory(category);
CREATE INDEX idx_inventory_status ON contractor_inventory(status);
CREATE INDEX idx_inventory_stock_level ON contractor_inventory(current_stock, min_stock_level);
CREATE INDEX idx_equipment_contractor ON contractor_equipment(contractor_id);
CREATE INDEX idx_equipment_type ON contractor_equipment(equipment_type);
CREATE INDEX idx_equipment_next_service ON contractor_equipment(next_service_date);

-- CRM indexes
CREATE INDEX idx_contractor_clients_contractor ON contractor_clients(contractor_id);
CREATE INDEX idx_contractor_clients_client ON contractor_clients(client_id);
CREATE INDEX idx_contractor_clients_status ON contractor_clients(relationship_status);
CREATE INDEX idx_contractor_clients_value ON contractor_clients(lifetime_value DESC);
CREATE INDEX idx_client_interactions_contractor ON client_interactions(contractor_id);
CREATE INDEX idx_client_interactions_client ON client_interactions(client_id);
CREATE INDEX idx_client_interactions_date ON client_interactions(interaction_date DESC);

-- Marketing and goals indexes
CREATE INDEX idx_marketing_campaigns_contractor ON marketing_campaigns(contractor_id);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);
CREATE INDEX idx_business_goals_contractor ON business_goals(contractor_id);
CREATE INDEX idx_business_goals_status ON business_goals(status);
CREATE INDEX idx_business_goals_target_date ON business_goals(target_date);
CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id);

-- Reporting indexes
CREATE INDEX idx_business_reports_contractor ON business_reports(contractor_id);
CREATE INDEX idx_business_reports_type ON business_reports(report_type);
CREATE INDEX idx_business_snapshots_contractor_date ON business_snapshots(contractor_id, snapshot_date DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_snapshots ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Contractors can only access their own business data
CREATE POLICY "Contractors can access own business metrics"
    ON business_metrics FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can access own performance trends"
    ON performance_trends FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own invoices"
    ON contractor_invoices FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Clients can view invoices sent to them
CREATE POLICY "Clients can view their invoices"
    ON contractor_invoices FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY "Invoice line items follow invoice access"
    ON invoice_line_items FOR SELECT
    TO authenticated
    USING (
        invoice_id IN (
            SELECT id FROM contractor_invoices 
            WHERE contractor_id = auth.uid() OR client_id = auth.uid()
        )
    );

CREATE POLICY "Contractors can manage own expenses"
    ON contractor_expenses FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own payments"
    ON contractor_payments FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Clients can view payments they made
CREATE POLICY "Clients can view their payments"
    ON contractor_payments FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY "Contractors can manage own schedules"
    ON contractor_schedules FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own inventory"
    ON contractor_inventory FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own equipment"
    ON contractor_equipment FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own clients"
    ON contractor_clients FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Clients can view their relationship data
CREATE POLICY "Clients can view own relationship data"
    ON contractor_clients FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

CREATE POLICY "Contractors can manage client interactions"
    ON client_interactions FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own marketing campaigns"
    ON marketing_campaigns FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage own business goals"
    ON business_goals FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Goal progress follows goal access"
    ON goal_progress FOR ALL
    TO authenticated
    USING (
        goal_id IN (
            SELECT id FROM business_goals WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "Contractors can manage own reports"
    ON business_reports FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can access own snapshots"
    ON business_snapshots FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- =====================================================
-- STORED FUNCTIONS
-- =====================================================

-- Function to calculate business health score
CREATE OR REPLACE FUNCTION calculate_business_health_score(contractor_id UUID)
RETURNS INTEGER AS $$
DECLARE
    health_score INTEGER := 0;
    revenue_score INTEGER := 0;
    efficiency_score INTEGER := 0;
    client_score INTEGER := 0;
    financial_score INTEGER := 0;
BEGIN
    -- Revenue performance (25%)
    SELECT LEAST(100, GREATEST(0, 
        COALESCE((total_revenue / 5000) * 100, 0)
    )) INTO revenue_score
    FROM business_metrics 
    WHERE business_metrics.contractor_id = calculate_business_health_score.contractor_id
    AND period_start >= NOW() - INTERVAL '3 months'
    ORDER BY period_start DESC
    LIMIT 1;

    -- Operational efficiency (25%)
    SELECT LEAST(100, GREATEST(0,
        COALESCE(completion_rate, 0)
    )) INTO efficiency_score
    FROM business_metrics 
    WHERE business_metrics.contractor_id = calculate_business_health_score.contractor_id
    AND period_start >= NOW() - INTERVAL '3 months'
    ORDER BY period_start DESC
    LIMIT 1;

    -- Client satisfaction (25%)
    SELECT LEAST(100, GREATEST(0,
        COALESCE((client_satisfaction / 5.0) * 100, 0)
    )) INTO client_score
    FROM business_metrics 
    WHERE business_metrics.contractor_id = calculate_business_health_score.contractor_id
    AND period_start >= NOW() - INTERVAL '3 months'
    ORDER BY period_start DESC
    LIMIT 1;

    -- Financial health (25%)
    SELECT CASE 
        WHEN COUNT(*) = 0 THEN 100
        WHEN COUNT(CASE WHEN status = 'overdue' THEN 1 END) = 0 THEN 100
        ELSE GREATEST(0, 100 - (COUNT(CASE WHEN status = 'overdue' THEN 1 END) * 20))
    END INTO financial_score
    FROM contractor_invoices
    WHERE contractor_invoices.contractor_id = calculate_business_health_score.contractor_id;

    -- Calculate weighted average
    health_score := (
        (COALESCE(revenue_score, 0) * 0.25) +
        (COALESCE(efficiency_score, 0) * 0.25) +
        (COALESCE(client_score, 0) * 0.25) +
        (COALESCE(financial_score, 100) * 0.25)
    );

    RETURN LEAST(100, GREATEST(0, health_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
    p_goal_id UUID,
    p_measured_value DECIMAL,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    goal_record RECORD;
    new_progress DECIMAL;
BEGIN
    -- Get goal details
    SELECT * INTO goal_record
    FROM business_goals 
    WHERE id = p_goal_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found';
    END IF;

    -- Calculate progress percentage
    new_progress := CASE 
        WHEN goal_record.target_value > 0 THEN
            LEAST(100, (p_measured_value / goal_record.target_value) * 100)
        ELSE 0
    END;

    -- Update goal
    UPDATE business_goals
    SET 
        current_value = p_measured_value,
        progress_percentage = new_progress,
        status = CASE 
            WHEN new_progress >= 100 THEN 'completed'
            WHEN goal_record.target_date < NOW() AND new_progress < 100 THEN 'overdue'
            ELSE status
        END,
        last_measured = NOW(),
        updated_at = NOW()
    WHERE id = p_goal_id;

    -- Record progress entry
    INSERT INTO goal_progress (
        goal_id,
        measured_value,
        progress_percentage,
        notes,
        created_by
    ) VALUES (
        p_goal_id,
        p_measured_value,
        new_progress,
        p_notes,
        auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_contractor_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    current_year INTEGER;
    last_number INTEGER;
    new_number VARCHAR;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Get the last invoice number for this contractor in current year
    SELECT COALESCE(
        MAX(
            CAST(
                SPLIT_PART(invoice_number, '-', 3) AS INTEGER
            )
        ), 0
    ) INTO last_number
    FROM contractor_invoices
    WHERE contractor_id = p_contractor_id
    AND invoice_number LIKE 'INV-' || current_year || '-%';
    
    -- Generate new invoice number
    new_number := 'INV-' || current_year || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals() RETURNS TRIGGER AS $$
DECLARE
    new_subtotal DECIMAL(10,2);
    new_tax_amount DECIMAL(10,2);
    new_total DECIMAL(10,2);
    tax_rate DECIMAL(5,4);
BEGIN
    -- Get current tax rate
    SELECT contractor_invoices.tax_rate INTO tax_rate
    FROM contractor_invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate new subtotal
    SELECT COALESCE(SUM(total_price), 0) INTO new_subtotal
    FROM invoice_line_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate tax and total
    new_tax_amount := new_subtotal * COALESCE(tax_rate, 0);
    new_total := new_subtotal + new_tax_amount;
    
    -- Update invoice
    UPDATE contractor_invoices
    SET 
        subtotal = new_subtotal,
        tax_amount = new_tax_amount,
        total_amount = new_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON business_metrics TO authenticated;
GRANT ALL ON performance_trends TO authenticated;
GRANT ALL ON contractor_invoices TO authenticated;
GRANT ALL ON invoice_line_items TO authenticated;
GRANT ALL ON contractor_expenses TO authenticated;
GRANT ALL ON contractor_payments TO authenticated;
GRANT ALL ON contractor_schedules TO authenticated;
GRANT ALL ON contractor_inventory TO authenticated;
GRANT ALL ON contractor_equipment TO authenticated;
GRANT ALL ON contractor_clients TO authenticated;
GRANT ALL ON client_interactions TO authenticated;
GRANT ALL ON marketing_campaigns TO authenticated;
GRANT ALL ON business_goals TO authenticated;
GRANT ALL ON goal_progress TO authenticated;
GRANT ALL ON business_reports TO authenticated;
GRANT ALL ON business_snapshots TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_business_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_goal_progress TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;

-- Add table comments
COMMENT ON TABLE business_metrics IS 'Aggregated business performance metrics for contractors';
COMMENT ON TABLE contractor_invoices IS 'Invoice management system for contractor billing';
COMMENT ON TABLE contractor_expenses IS 'Expense tracking and categorization for tax and business purposes';
COMMENT ON TABLE contractor_schedules IS 'Contractor availability and scheduling management';
COMMENT ON TABLE contractor_inventory IS 'Inventory and resource management for contractors';
COMMENT ON TABLE contractor_clients IS 'Enhanced client relationship management';
COMMENT ON TABLE business_goals IS 'Business goal setting and progress tracking';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Contractor Business Suite migration completed successfully';
    RAISE NOTICE 'Created comprehensive business management platform';
    RAISE NOTICE 'Features: Analytics, Financial Management, CRM, Scheduling, Marketing, Goals';
END $$;