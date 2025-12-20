-- =====================================================
-- Email Templates System Migration
-- Professional email automation and branding
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- EMAIL TEMPLATES MANAGEMENT
-- =====================================================

-- Email template categories and templates
CREATE TABLE email_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(50) NOT NULL CHECK (template_category IN (
        'invoice', 'quote', 'reminder', 'confirmation', 'follow_up', 
        'welcome', 'completion', 'marketing', 'appointment', 'custom'
    )),
    template_type VARCHAR(20) DEFAULT 'professional' CHECK (template_type IN ('professional', 'friendly', 'formal', 'custom')),
    
    -- Email content
    subject_line TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT NOT NULL,
    preview_text VARCHAR(150), -- For email preview
    
    -- Template metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    language_code VARCHAR(5) DEFAULT 'en-GB',
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    
    -- Personalization
    variables JSONB DEFAULT '[]', -- Available template variables
    required_variables JSONB DEFAULT '[]', -- Required variables
    
    -- Branding
    brand_colors JSONB DEFAULT '{}', -- Primary, secondary colors
    logo_url TEXT,
    company_signature TEXT,
    footer_content TEXT,
    
    -- Automation rules
    auto_send_trigger VARCHAR(50), -- When to auto-send
    auto_send_delay_hours INTEGER DEFAULT 0,
    auto_send_conditions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_contractor_template_name UNIQUE(contractor_id, template_name)
);

-- Email template versions (for A/B testing and history)
CREATE TABLE email_template_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(100),
    subject_line TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_template_version UNIQUE(template_id, version_number)
);

-- Email sending history
CREATE TABLE email_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    
    -- Email content (as sent)
    subject_line TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT NOT NULL,
    
    -- Context
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    invoice_id UUID, -- Could reference invoice table if available
    context_type VARCHAR(50), -- job, invoice, general, etc.
    context_data JSONB DEFAULT '{}',
    
    -- Sending status
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    external_id VARCHAR(255), -- Email service provider ID
    send_attempts INTEGER DEFAULT 1,
    error_message TEXT,
    
    -- Tracking
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    -- Analytics
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template variable definitions
CREATE TABLE template_variables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variable_name VARCHAR(100) NOT NULL,
    variable_category VARCHAR(50) NOT NULL CHECK (variable_category IN (
        'client', 'contractor', 'job', 'invoice', 'payment', 'company', 'system'
    )),
    description TEXT,
    example_value TEXT,
    data_type VARCHAR(20) DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'currency', 'boolean')),
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_variable_name UNIQUE(variable_name)
);

-- Email automation rules
CREATE TABLE email_automation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    
    -- Trigger conditions
    trigger_event VARCHAR(100) NOT NULL, -- job_completed, invoice_sent, payment_received, etc.
    trigger_conditions JSONB DEFAULT '{}',
    delay_hours INTEGER DEFAULT 0,
    delay_days INTEGER DEFAULT 0,
    
    -- Execution rules
    is_active BOOLEAN DEFAULT TRUE,
    max_executions INTEGER, -- Limit per recipient
    execution_window_days INTEGER, -- Time window for execution
    
    -- Filters
    client_filters JSONB DEFAULT '{}',
    job_filters JSONB DEFAULT '{}',
    
    -- Tracking
    times_executed INTEGER DEFAULT 0,
    last_executed TIMESTAMPTZ,
    success_rate DECIMAL(5, 2) DEFAULT 0.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email performance analytics
CREATE TABLE email_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Volume metrics
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    
    -- Engagement metrics
    unique_opens INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    complaints INTEGER DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5, 2) DEFAULT 0.0,
    open_rate DECIMAL(5, 2) DEFAULT 0.0,
    click_rate DECIMAL(5, 2) DEFAULT 0.0,
    bounce_rate DECIMAL(5, 2) DEFAULT 0.0,
    unsubscribe_rate DECIMAL(5, 2) DEFAULT 0.0,
    
    -- Business impact
    leads_generated INTEGER DEFAULT 0,
    jobs_booked INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12, 2) DEFAULT 0.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Email templates indexes
CREATE INDEX idx_email_templates_contractor ON email_templates(contractor_id);
CREATE INDEX idx_email_templates_category ON email_templates(template_category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_email_templates_default ON email_templates(is_default) WHERE is_default = TRUE;

-- Email history indexes
CREATE INDEX idx_email_history_contractor ON email_history(contractor_id);
CREATE INDEX idx_email_history_template ON email_history(template_id);
CREATE INDEX idx_email_history_recipient ON email_history(recipient_email);
CREATE INDEX idx_email_history_status ON email_history(status);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_email_history_context ON email_history(context_type, job_id);

-- Automation rules indexes
CREATE INDEX idx_automation_rules_contractor ON email_automation_rules(contractor_id);
CREATE INDEX idx_automation_rules_template ON email_automation_rules(template_id);
CREATE INDEX idx_automation_rules_trigger ON email_automation_rules(trigger_event);
CREATE INDEX idx_automation_rules_active ON email_automation_rules(is_active) WHERE is_active = TRUE;

-- Analytics indexes
CREATE INDEX idx_email_analytics_contractor ON email_analytics(contractor_id);
CREATE INDEX idx_email_analytics_template ON email_analytics(template_id);
CREATE INDEX idx_email_analytics_period ON email_analytics(period_start, period_end);

-- =====================================================
-- TEMPLATE VARIABLE SEEDS
-- =====================================================

INSERT INTO template_variables (variable_name, variable_category, description, example_value, data_type) VALUES
-- Client variables
('client_first_name', 'client', 'Client first name', 'John', 'text'),
('client_last_name', 'client', 'Client last name', 'Smith', 'text'),
('client_full_name', 'client', 'Client full name', 'John Smith', 'text'),
('client_email', 'client', 'Client email address', 'john@example.com', 'text'),
('client_phone', 'client', 'Client phone number', '+44 20 7123 4567', 'text'),
('client_address', 'client', 'Client address', '123 Main St, London', 'text'),

-- Contractor variables
('contractor_first_name', 'contractor', 'Contractor first name', 'Mike', 'text'),
('contractor_last_name', 'contractor', 'Contractor last name', 'Johnson', 'text'),
('contractor_full_name', 'contractor', 'Contractor full name', 'Mike Johnson', 'text'),
('contractor_company', 'contractor', 'Contractor company name', 'Johnson Plumbing Ltd', 'text'),
('contractor_phone', 'contractor', 'Contractor phone number', '+44 20 7987 6543', 'text'),
('contractor_email', 'contractor', 'Contractor email address', 'mike@johnsonplumbing.com', 'text'),

-- Job variables
('job_title', 'job', 'Job title', 'Kitchen Faucet Repair', 'text'),
('job_description', 'job', 'Job description', 'Fix leaky kitchen faucet', 'text'),
('job_location', 'job', 'Job location', '123 Main St, London', 'text'),
('job_budget', 'job', 'Job budget', '£150.00', 'currency'),
('job_date', 'job', 'Scheduled job date', '2024-03-15', 'date'),
('job_time', 'job', 'Scheduled job time', '10:00 AM', 'text'),
('job_status', 'job', 'Job status', 'completed', 'text'),

-- Invoice variables
('invoice_number', 'invoice', 'Invoice number', 'INV-2024-0001', 'text'),
('invoice_amount', 'invoice', 'Invoice total amount', '£150.00', 'currency'),
('invoice_due_date', 'invoice', 'Invoice due date', '2024-04-15', 'date'),
('invoice_link', 'invoice', 'Link to view invoice', 'https://app.mintenance.com/invoice/123', 'text'),

-- Payment variables
('payment_amount', 'payment', 'Payment amount', '£150.00', 'currency'),
('payment_date', 'payment', 'Payment date', '2024-03-20', 'date'),
('payment_method', 'payment', 'Payment method', 'Credit Card', 'text'),

-- System variables
('current_date', 'system', 'Current date', '2024-03-15', 'date'),
('current_year', 'system', 'Current year', '2024', 'number'),
('app_name', 'system', 'Application name', 'Mintenance', 'text'),
('support_email', 'system', 'Support email address', 'support@mintenance.com', 'text');

-- =====================================================
-- DEFAULT EMAIL TEMPLATES
-- =====================================================

-- Insert default templates for common scenarios
INSERT INTO email_templates (
    contractor_id, template_name, template_category, subject_line, text_content, html_content,
    description, is_default, variables, required_variables
) VALUES
-- This would be populated per contractor, but here's an example structure
-- The actual implementation would create these when a contractor first accesses templates

-- Default Invoice Reminder Template
(
    '00000000-0000-0000-0000-000000000000', -- Placeholder, would be actual contractor ID
    'Invoice Payment Reminder',
    'reminder',
    'Payment Reminder: Invoice {{invoice_number}} - {{invoice_amount}}',
    
    'Dear {{client_first_name}},

This is a friendly reminder that your invoice {{invoice_number}} for {{invoice_amount}} is due on {{invoice_due_date}}.

Job Details:
- {{job_title}}
- Location: {{job_location}}
- Completed: {{job_date}}

You can view and pay your invoice online: {{invoice_link}}

If you have any questions, please don''t hesitate to contact me.

Best regards,
{{contractor_full_name}}
{{contractor_company}}
{{contractor_phone}}',

    '<html><body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #007AFF;">Payment Reminder</h2>
        <p>Dear {{client_first_name}},</p>
        <p>This is a friendly reminder that your invoice <strong>{{invoice_number}}</strong> for <strong>{{invoice_amount}}</strong> is due on <strong>{{invoice_due_date}}</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Job Details:</h3>
            <ul>
                <li><strong>{{job_title}}</strong></li>
                <li>Location: {{job_location}}</li>
                <li>Completed: {{job_date}}</li>
            </ul>
        </div>
        
        <p><a href="{{invoice_link}}" style="background: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Pay Invoice</a></p>
        
        <p>If you have any questions, please don''t hesitate to contact me.</p>
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>Best regards,<br>
            <strong>{{contractor_full_name}}</strong><br>
            {{contractor_company}}<br>
            {{contractor_phone}}</p>
        </div>
    </body></html>',
    
    'Default template for invoice payment reminders',
    true,
    '["client_first_name", "invoice_number", "invoice_amount", "invoice_due_date", "job_title", "job_location", "job_date", "invoice_link", "contractor_full_name", "contractor_company", "contractor_phone"]',
    '["client_first_name", "invoice_number", "invoice_amount", "invoice_due_date", "invoice_link"]'
);

-- =====================================================
-- STORED FUNCTIONS
-- =====================================================

-- Function to replace template variables
CREATE OR REPLACE FUNCTION replace_template_variables(
    template_content TEXT,
    variables JSONB
) RETURNS TEXT AS $$
DECLARE
    result TEXT := template_content;
    key TEXT;
    value TEXT;
BEGIN
    -- Replace each variable in the template
    FOR key, value IN SELECT * FROM jsonb_each_text(variables) LOOP
        result := replace(result, '{{' || key || '}}', COALESCE(value, ''));
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate required template variables
CREATE OR REPLACE FUNCTION validate_template_variables(
    template_id UUID,
    provided_variables JSONB
) RETURNS TABLE(missing_variables TEXT[]) AS $$
DECLARE
    required_vars JSONB;
    missing_vars TEXT[] := '{}';
    var_name TEXT;
BEGIN
    -- Get required variables for template
    SELECT required_variables INTO required_vars
    FROM email_templates 
    WHERE id = template_id;
    
    -- Check each required variable
    FOR var_name IN SELECT jsonb_array_elements_text(required_vars) LOOP
        IF NOT provided_variables ? var_name THEN
            missing_vars := array_append(missing_vars, var_name);
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT missing_vars;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Contractors manage own email templates"
    ON email_templates FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Template versions follow template access"
    ON email_template_versions FOR ALL
    TO authenticated
    USING (
        template_id IN (
            SELECT id FROM email_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "Contractors access own email history"
    ON email_history FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors manage own automation rules"
    ON email_automation_rules FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

CREATE POLICY "Contractors access own email analytics"
    ON email_analytics FOR ALL
    TO authenticated
    USING (contractor_id = auth.uid());

-- Template variables are publicly readable
CREATE POLICY "Template variables are public"
    ON template_variables FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER trigger_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_automation_rules_updated_at
    BEFORE UPDATE ON email_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_template_versions TO authenticated;
GRANT ALL ON email_history TO authenticated;
GRANT ALL ON template_variables TO authenticated;
GRANT ALL ON email_automation_rules TO authenticated;
GRANT ALL ON email_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION replace_template_variables TO authenticated;
GRANT EXECUTE ON FUNCTION validate_template_variables TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Email Templates System migration completed successfully';
    RAISE NOTICE 'Created professional email automation with template variables and analytics';
    RAISE NOTICE 'Features: Template management, Variable replacement, Automation rules, Performance tracking';
END $$;