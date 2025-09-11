-- =============================================
-- Job Sheets Digital Forms System Schema
-- =============================================
-- Complete digital form builder for contractors
-- Features: Form templates, field types, workflows, signatures, offline support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. FORM TEMPLATES SYSTEM
-- =============================================

-- Form template categories
CREATE TYPE form_template_category AS ENUM (
    'inspection',
    'maintenance',
    'installation',
    'repair',
    'safety_check',
    'compliance',
    'quality_assurance',
    'site_survey',
    'completion_report',
    'custom'
);

-- Form field types
CREATE TYPE form_field_type AS ENUM (
    'text',
    'textarea',
    'number',
    'decimal',
    'date',
    'time',
    'datetime',
    'email',
    'phone',
    'url',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'boolean',
    'rating',
    'slider',
    'signature',
    'photo',
    'file',
    'location',
    'barcode',
    'section_header',
    'html_content'
);

-- Form validation types
CREATE TYPE form_validation_type AS ENUM (
    'required',
    'min_length',
    'max_length',
    'min_value',
    'max_value',
    'pattern',
    'email_format',
    'phone_format',
    'url_format',
    'date_range',
    'file_size',
    'file_type',
    'custom_validation'
);

-- Form template statuses
CREATE TYPE form_template_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'archived'
);

-- Job sheet statuses
CREATE TYPE job_sheet_status AS ENUM (
    'created',
    'in_progress',
    'pending_review',
    'completed',
    'approved',
    'rejected',
    'archived'
);

-- =============================================
-- FORM TEMPLATES TABLE
-- =============================================
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template details
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    category form_template_category NOT NULL DEFAULT 'custom',
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Template configuration
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    allows_photos BOOLEAN NOT NULL DEFAULT true,
    allows_signatures BOOLEAN NOT NULL DEFAULT true,
    requires_location BOOLEAN NOT NULL DEFAULT false,
    
    -- Workflow settings
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_workflow JSONB,
    notification_settings JSONB,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    custom_css TEXT,
    instructions TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- FORM FIELDS TABLE
-- =============================================
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    
    -- Field identification
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type form_field_type NOT NULL,
    
    -- Field configuration
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_readonly BOOLEAN NOT NULL DEFAULT false,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    
    -- Display settings
    sort_order INTEGER NOT NULL DEFAULT 0,
    section_name VARCHAR(100),
    help_text TEXT,
    placeholder_text VARCHAR(255),
    
    -- Field options (for select, radio, etc.)
    field_options JSONB,
    default_value TEXT,
    
    -- Validation rules
    validation_rules JSONB,
    error_messages JSONB,
    
    -- Conditional logic
    conditional_logic JSONB,
    
    -- Styling
    field_width VARCHAR(20) DEFAULT 'full', -- 'full', 'half', 'third', 'quarter'
    custom_classes VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- JOB SHEETS TABLE
-- =============================================
CREATE TABLE job_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    
    -- Sheet identification
    sheet_number VARCHAR(50) NOT NULL,
    sheet_title VARCHAR(255) NOT NULL,
    
    -- Status and workflow
    status job_sheet_status NOT NULL DEFAULT 'created',
    priority INTEGER NOT NULL DEFAULT 3, -- 1=urgent, 5=low
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    -- Dates
    scheduled_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Location data
    location_name VARCHAR(255),
    location_address TEXT,
    location_coordinates POINT,
    location_accuracy DECIMAL(10, 2),
    
    -- Client information
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_signature JSONB,
    
    -- Form data
    form_data JSONB NOT NULL DEFAULT '{}',
    
    -- Attachments and media
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    signatures JSONB DEFAULT '{}',
    
    -- Quality assurance
    quality_score DECIMAL(3, 2),
    quality_notes TEXT,
    
    -- Billing integration
    billable_hours DECIMAL(5, 2),
    materials_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    
    -- Compliance tracking
    compliance_items JSONB DEFAULT '[]',
    safety_checklist JSONB DEFAULT '[]',
    
    -- Revision tracking
    revision_number INTEGER NOT NULL DEFAULT 1,
    revision_notes TEXT,
    parent_sheet_id UUID REFERENCES job_sheets(id),
    
    -- Offline support
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_conflicts JSONB DEFAULT '[]',
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    internal_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- JOB SHEET SIGNATURES TABLE
-- =============================================
CREATE TABLE job_sheet_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_sheet_id UUID NOT NULL REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Signer information
    signer_name VARCHAR(255) NOT NULL,
    signer_role VARCHAR(100), -- 'contractor', 'client', 'supervisor', 'inspector'
    signer_email VARCHAR(255),
    
    -- Signature data
    signature_data TEXT NOT NULL, -- Base64 encoded signature
    signature_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Device information
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Legal compliance
    consent_given BOOLEAN NOT NULL DEFAULT true,
    identity_verified BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- FORM SUBMISSIONS HISTORY TABLE
-- =============================================
CREATE TABLE form_submissions_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_sheet_id UUID NOT NULL REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Submission details
    submitted_by UUID NOT NULL REFERENCES users(id),
    submission_data JSONB NOT NULL,
    
    -- Changes tracking
    changed_fields JSONB,
    change_reason TEXT,
    
    -- Device and location
    submitted_from_device JSONB,
    submission_location POINT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- FORM APPROVALS TABLE
-- =============================================
CREATE TABLE form_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_sheet_id UUID NOT NULL REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Approval details
    approved_by UUID NOT NULL REFERENCES users(id),
    approval_status VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'needs_revision'
    approval_level INTEGER NOT NULL DEFAULT 1,
    
    -- Feedback
    approval_notes TEXT,
    required_changes JSONB,
    
    -- Timing
    approval_deadline TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- FORM ANALYTICS TABLE
-- =============================================
CREATE TABLE form_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
    job_sheet_id UUID REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Performance metrics
    form_completion_time INTEGER, -- seconds
    field_completion_rates JSONB,
    error_count INTEGER DEFAULT 0,
    revision_count INTEGER DEFAULT 0,
    
    -- Quality metrics
    accuracy_score DECIMAL(5, 2),
    completeness_score DECIMAL(5, 2),
    timeliness_score DECIMAL(5, 2),
    
    -- Usage metrics
    device_type VARCHAR(50),
    offline_completion BOOLEAN DEFAULT false,
    sync_issues INTEGER DEFAULT 0,
    
    -- Date tracking
    start_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- DIGITAL CHECKLISTS TABLE
-- =============================================
CREATE TABLE digital_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    
    -- Checklist details
    checklist_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Configuration
    is_required BOOLEAN NOT NULL DEFAULT false,
    pass_fail_scoring BOOLEAN NOT NULL DEFAULT true,
    weighted_scoring BOOLEAN NOT NULL DEFAULT false,
    
    -- Items
    checklist_items JSONB NOT NULL DEFAULT '[]',
    scoring_rules JSONB,
    
    -- Usage
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Form templates indexes
CREATE INDEX idx_form_templates_contractor_id ON form_templates(contractor_id);
CREATE INDEX idx_form_templates_category ON form_templates(category);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);
CREATE INDEX idx_form_templates_usage ON form_templates(usage_count DESC);

-- Form fields indexes
CREATE INDEX idx_form_fields_template_id ON form_fields(template_id);
CREATE INDEX idx_form_fields_sort_order ON form_fields(template_id, sort_order);
CREATE INDEX idx_form_fields_type ON form_fields(field_type);

-- Job sheets indexes
CREATE INDEX idx_job_sheets_contractor_id ON job_sheets(contractor_id);
CREATE INDEX idx_job_sheets_job_id ON job_sheets(job_id);
CREATE INDEX idx_job_sheets_template_id ON job_sheets(template_id);
CREATE INDEX idx_job_sheets_status ON job_sheets(status);
CREATE INDEX idx_job_sheets_assigned ON job_sheets(assigned_to);
CREATE INDEX idx_job_sheets_dates ON job_sheets(scheduled_date, due_date);
CREATE INDEX idx_job_sheets_location ON job_sheets USING GIST(location_coordinates);
CREATE INDEX idx_job_sheets_created ON job_sheets(created_at DESC);
CREATE INDEX idx_job_sheets_number ON job_sheets(sheet_number);

-- Signatures indexes
CREATE INDEX idx_job_sheet_signatures_sheet_id ON job_sheet_signatures(job_sheet_id);
CREATE INDEX idx_job_sheet_signatures_date ON job_sheet_signatures(signature_date DESC);

-- Form submissions history indexes
CREATE INDEX idx_form_submissions_sheet_id ON form_submissions_history(job_sheet_id);
CREATE INDEX idx_form_submissions_user ON form_submissions_history(submitted_by);
CREATE INDEX idx_form_submissions_date ON form_submissions_history(created_at DESC);

-- Form approvals indexes
CREATE INDEX idx_form_approvals_sheet_id ON form_approvals(job_sheet_id);
CREATE INDEX idx_form_approvals_user ON form_approvals(approved_by);
CREATE INDEX idx_form_approvals_status ON form_approvals(approval_status);

-- Analytics indexes
CREATE INDEX idx_form_analytics_contractor ON form_analytics(contractor_id);
CREATE INDEX idx_form_analytics_template ON form_analytics(template_id);
CREATE INDEX idx_form_analytics_sheet ON form_analytics(job_sheet_id);
CREATE INDEX idx_form_analytics_date ON form_analytics(created_at DESC);

-- Checklists indexes
CREATE INDEX idx_digital_checklists_template ON digital_checklists(template_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sheet_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_checklists ENABLE ROW LEVEL SECURITY;

-- Form templates policies
CREATE POLICY "form_templates_select_policy" ON form_templates
    FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "form_templates_insert_policy" ON form_templates
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "form_templates_update_policy" ON form_templates
    FOR UPDATE USING (contractor_id = auth.uid());

CREATE POLICY "form_templates_delete_policy" ON form_templates
    FOR DELETE USING (contractor_id = auth.uid());

-- Form fields policies
CREATE POLICY "form_fields_select_policy" ON form_fields
    FOR SELECT USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "form_fields_insert_policy" ON form_fields
    FOR INSERT WITH CHECK (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "form_fields_update_policy" ON form_fields
    FOR UPDATE USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "form_fields_delete_policy" ON form_fields
    FOR DELETE USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

-- Job sheets policies
CREATE POLICY "job_sheets_select_policy" ON job_sheets
    FOR SELECT USING (
        contractor_id = auth.uid() OR 
        assigned_to = auth.uid() OR
        job_id IN (
            SELECT id FROM jobs WHERE homeowner_id = auth.uid()
        )
    );

CREATE POLICY "job_sheets_insert_policy" ON job_sheets
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "job_sheets_update_policy" ON job_sheets
    FOR UPDATE USING (
        contractor_id = auth.uid() OR 
        assigned_to = auth.uid()
    );

CREATE POLICY "job_sheets_delete_policy" ON job_sheets
    FOR DELETE USING (contractor_id = auth.uid());

-- Job sheet signatures policies
CREATE POLICY "job_sheet_signatures_select_policy" ON job_sheet_signatures
    FOR SELECT USING (
        job_sheet_id IN (
            SELECT id FROM job_sheets WHERE 
            contractor_id = auth.uid() OR 
            assigned_to = auth.uid() OR
            job_id IN (SELECT id FROM jobs WHERE homeowner_id = auth.uid())
        )
    );

CREATE POLICY "job_sheet_signatures_insert_policy" ON job_sheet_signatures
    FOR INSERT WITH CHECK (
        job_sheet_id IN (
            SELECT id FROM job_sheets WHERE 
            contractor_id = auth.uid() OR 
            assigned_to = auth.uid() OR
            job_id IN (SELECT id FROM jobs WHERE homeowner_id = auth.uid())
        )
    );

-- Form submissions history policies
CREATE POLICY "form_submissions_history_select_policy" ON form_submissions_history
    FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "form_submissions_history_insert_policy" ON form_submissions_history
    FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- Form approvals policies
CREATE POLICY "form_approvals_select_policy" ON form_approvals
    FOR SELECT USING (
        approved_by = auth.uid() OR
        job_sheet_id IN (
            SELECT id FROM job_sheets WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "form_approvals_insert_policy" ON form_approvals
    FOR INSERT WITH CHECK (approved_by = auth.uid());

-- Form analytics policies
CREATE POLICY "form_analytics_select_policy" ON form_analytics
    FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "form_analytics_insert_policy" ON form_analytics
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

-- Digital checklists policies
CREATE POLICY "digital_checklists_select_policy" ON digital_checklists
    FOR SELECT USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "digital_checklists_insert_policy" ON digital_checklists
    FOR INSERT WITH CHECK (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "digital_checklists_update_policy" ON digital_checklists
    FOR UPDATE USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

CREATE POLICY "digital_checklists_delete_policy" ON digital_checklists
    FOR DELETE USING (
        template_id IN (
            SELECT id FROM form_templates WHERE contractor_id = auth.uid()
        )
    );

-- =============================================
-- STORED FUNCTIONS
-- =============================================

-- Function to generate job sheet number
CREATE OR REPLACE FUNCTION generate_job_sheet_number(contractor_id_param UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
    result VARCHAR(50);
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(sheet_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM job_sheets 
    WHERE contractor_id = contractor_id_param 
    AND sheet_number LIKE 'JS-' || year_part || '-%';
    
    result := 'JS-' || year_part || '-' || LPAD(next_number::VARCHAR, 4, '0');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate form completion percentage
CREATE OR REPLACE FUNCTION calculate_form_completion_percentage(sheet_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    total_required_fields INTEGER;
    completed_fields INTEGER;
    completion_percentage DECIMAL(5, 2);
BEGIN
    -- Get total required fields for the template
    SELECT COUNT(*)
    INTO total_required_fields
    FROM form_fields ff
    JOIN job_sheets js ON js.template_id = ff.template_id
    WHERE js.id = sheet_id AND ff.is_required = true;
    
    -- Count completed required fields
    SELECT COUNT(*)
    INTO completed_fields
    FROM form_fields ff
    JOIN job_sheets js ON js.template_id = ff.template_id
    WHERE js.id = sheet_id 
    AND ff.is_required = true
    AND js.form_data ? ff.field_name
    AND js.form_data->>ff.field_name IS NOT NULL
    AND js.form_data->>ff.field_name != '';
    
    IF total_required_fields > 0 THEN
        completion_percentage := (completed_fields::DECIMAL / total_required_fields) * 100;
    ELSE
        completion_percentage := 100;
    END IF;
    
    RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE form_templates 
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for template usage tracking
CREATE TRIGGER update_template_usage_trigger
    AFTER INSERT ON job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage();

-- Function to log form submissions
CREATE OR REPLACE FUNCTION log_form_submission()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.form_data IS DISTINCT FROM NEW.form_data THEN
        INSERT INTO form_submissions_history (
            job_sheet_id,
            submitted_by,
            submission_data,
            changed_fields,
            change_reason
        ) VALUES (
            NEW.id,
            auth.uid(),
            NEW.form_data,
            jsonb_diff(OLD.form_data, NEW.form_data),
            'Form data updated'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for form submission logging
CREATE TRIGGER log_form_submission_trigger
    AFTER UPDATE ON job_sheets
    FOR EACH ROW
    EXECUTE FUNCTION log_form_submission();

-- Function to calculate quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(sheet_id UUID)
RETURNS DECIMAL(3, 2) AS $$
DECLARE
    completion_score DECIMAL(5, 2);
    timeliness_score DECIMAL(5, 2);
    accuracy_score DECIMAL(5, 2);
    final_score DECIMAL(3, 2);
    sheet_record RECORD;
BEGIN
    SELECT * INTO sheet_record FROM job_sheets WHERE id = sheet_id;
    
    -- Calculate completion score
    completion_score := calculate_form_completion_percentage(sheet_id);
    
    -- Calculate timeliness score (based on due date vs completion date)
    IF sheet_record.completed_at IS NOT NULL AND sheet_record.due_date IS NOT NULL THEN
        IF sheet_record.completed_at <= sheet_record.due_date THEN
            timeliness_score := 100;
        ELSE
            timeliness_score := GREATEST(0, 100 - EXTRACT(DAYS FROM (sheet_record.completed_at - sheet_record.due_date)) * 10);
        END IF;
    ELSE
        timeliness_score := 50; -- Neutral score if no dates
    END IF;
    
    -- Calculate accuracy score (based on revision count)
    accuracy_score := GREATEST(50, 100 - (sheet_record.revision_number - 1) * 15);
    
    -- Calculate weighted final score
    final_score := (completion_score * 0.5 + timeliness_score * 0.3 + accuracy_score * 0.2) / 100 * 5;
    
    RETURN LEAST(5.00, GREATEST(0.00, final_score));
END;
$$ LANGUAGE plpgsql;

-- Helper function for JSON diff (simplified version)
CREATE OR REPLACE FUNCTION jsonb_diff(old_data JSONB, new_data JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    key TEXT;
BEGIN
    FOR key IN SELECT jsonb_object_keys(new_data)
    LOOP
        IF old_data->key IS DISTINCT FROM new_data->key THEN
            result := result || jsonb_build_object(
                key, 
                jsonb_build_object(
                    'old', old_data->key,
                    'new', new_data->key
                )
            );
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Sample form template categories and field configurations
-- Note: This would be populated by the application based on industry standards

COMMENT ON TABLE form_templates IS 'Digital form templates for job sheets and inspections';
COMMENT ON TABLE form_fields IS 'Dynamic form fields with validation and conditional logic';
COMMENT ON TABLE job_sheets IS 'Individual job sheet instances with form data and workflow status';
COMMENT ON TABLE job_sheet_signatures IS 'Digital signatures collected during job completion';
COMMENT ON TABLE form_submissions_history IS 'Audit trail of all form data changes';
COMMENT ON TABLE form_approvals IS 'Multi-level approval workflow for completed job sheets';
COMMENT ON TABLE form_analytics IS 'Performance metrics and completion analytics';
COMMENT ON TABLE digital_checklists IS 'Reusable checklists integrated with job sheets';