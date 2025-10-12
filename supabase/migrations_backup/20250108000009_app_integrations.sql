-- =============================================
-- App Integrations Framework Schema
-- =============================================
-- Comprehensive third-party app integration system
-- Features: REST APIs, Webhooks, OAuth, Rate limiting, Data sync

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS AND TYPES
-- =============================================

-- Integration types
DO $$ BEGIN
    CREATE TYPE integration_type AS ENUM (
        'accounting',
        'crm',
        'project_management',
        'communication',
        'payment',
        'marketing',
        'storage',
        'analytics',
        'hr',
        'inventory',
        'scheduling',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Integration categories for organization
DO $$ BEGIN
    CREATE TYPE integration_category AS ENUM (
        'business',
        'productivity',
        'finance',
        'marketing',
        'developer',
        'utility'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Authentication types
DO $$ BEGIN
    CREATE TYPE auth_type AS ENUM (
        'api_key',
        'oauth2',
        'basic_auth',
        'bearer_token',
        'custom_header',
        'webhook_signature'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Integration status
DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM (
        'active',
        'inactive',
        'error',
        'pending_auth',
        'rate_limited',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sync directions
DO $$ BEGIN
    CREATE TYPE sync_direction AS ENUM (
        'incoming',
        'outgoing',
        'bidirectional'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Webhook event types
DO $$ BEGIN
    CREATE TYPE webhook_event_type AS ENUM (
        'job_created',
        'job_updated',
        'job_completed',
        'bid_submitted',
        'payment_received',
        'user_registered',
        'invoice_generated',
        'message_sent',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Data sync status
DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
        'pending',
        'in_progress',
        'completed',
        'failed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rate limiting period types
DO $$ BEGIN
    CREATE TYPE rate_limit_period AS ENUM (
        'second',
        'minute',
        'hour',
        'day'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- INTEGRATION PROVIDERS
-- =============================================
CREATE TABLE IF NOT EXISTS integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider identification
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    documentation_url TEXT,
    
    -- Categorization
    integration_type integration_type NOT NULL,
    category integration_category NOT NULL DEFAULT 'business',
    tags TEXT[] DEFAULT '{}',
    
    -- API configuration
    base_url TEXT NOT NULL,
    api_version VARCHAR(20),
    auth_type auth_type NOT NULL DEFAULT 'api_key',
    
    -- OAuth specific
    oauth_authorize_url TEXT,
    oauth_token_url TEXT,
    oauth_scopes TEXT[],
    
    -- Rate limiting
    rate_limit_requests INTEGER DEFAULT 1000,
    rate_limit_period rate_limit_period DEFAULT 'hour',
    rate_limit_burst INTEGER DEFAULT 10,
    
    -- Features and capabilities
    supports_webhooks BOOLEAN DEFAULT false,
    supports_real_time BOOLEAN DEFAULT false,
    supports_bulk_operations BOOLEAN DEFAULT false,
    supports_custom_fields BOOLEAN DEFAULT false,
    
    -- Data mappings and transformations
    field_mappings JSONB DEFAULT '{}',
    data_transformations JSONB DEFAULT '{}',
    
    -- Webhook configuration
    webhook_events webhook_event_type[] DEFAULT '{}',
    webhook_signature_header VARCHAR(100),
    webhook_signature_algorithm VARCHAR(50) DEFAULT 'sha256',
    
    -- Status and availability
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    maintenance_mode BOOLEAN DEFAULT false,
    
    -- Pricing and limits
    free_tier_limit INTEGER,
    pricing_url TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- USER INTEGRATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
    
    -- Integration identification
    integration_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Authentication credentials (encrypted)
    api_key_encrypted TEXT,
    oauth_access_token_encrypted TEXT,
    oauth_refresh_token_encrypted TEXT,
    oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
    custom_auth_data_encrypted TEXT,
    
    -- Configuration
    configuration JSONB DEFAULT '{}',
    custom_field_mappings JSONB DEFAULT '{}',
    sync_settings JSONB DEFAULT '{}',
    
    -- Status and health
    status integration_status NOT NULL DEFAULT 'pending_auth',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Usage tracking
    api_calls_today INTEGER DEFAULT 0,
    api_calls_this_month INTEGER DEFAULT 0,
    last_api_call_at TIMESTAMP WITH TIME ZONE,
    
    -- Sync configuration
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_minutes INTEGER DEFAULT 60,
    sync_direction sync_direction DEFAULT 'bidirectional',
    
    -- Webhook configuration
    webhook_url TEXT,
    webhook_secret_encrypted TEXT,
    webhook_events webhook_event_type[] DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, provider_id, integration_name)
);

-- =============================================
-- DATA SYNC JOBS
-- =============================================
CREATE TABLE IF NOT EXISTS data_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
    
    -- Job identification
    job_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'webhook_trigger', 'manual'
    sync_direction sync_direction NOT NULL,
    
    -- Job configuration
    entity_type VARCHAR(50) NOT NULL, -- 'jobs', 'clients', 'invoices', etc.
    filters JSONB DEFAULT '{}',
    batch_size INTEGER DEFAULT 100,
    
    -- Execution details
    status sync_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Progress tracking
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    
    -- Results
    sync_results JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '[]',
    
    -- Performance metrics
    processing_time_ms INTEGER,
    api_calls_made INTEGER DEFAULT 0,
    data_transferred_kb DECIMAL(10, 2) DEFAULT 0,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    triggered_by UUID REFERENCES users(id),
    trigger_reason VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- WEBHOOK DELIVERIES
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
    
    -- Webhook details
    event_type webhook_event_type NOT NULL,
    event_id UUID NOT NULL, -- ID of the triggering event (job, payment, etc.)
    
    -- Delivery attempt
    webhook_url TEXT NOT NULL,
    http_method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    
    -- Response details
    response_status_code INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Delivery status
    delivered BOOLEAN DEFAULT false,
    delivery_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    last_error TEXT,
    error_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- API RATE LIMITS
-- =============================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
    
    -- Rate limit configuration
    endpoint VARCHAR(255) NOT NULL DEFAULT '*', -- specific endpoint or '*' for all
    requests_limit INTEGER NOT NULL,
    period_type rate_limit_period NOT NULL,
    period_duration INTEGER NOT NULL, -- in seconds
    
    -- Current usage
    current_usage INTEGER DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Burst handling
    burst_limit INTEGER,
    burst_usage INTEGER DEFAULT 0,
    burst_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_exceeded BOOLEAN DEFAULT false,
    exceeded_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_integration_id, endpoint)
);

-- =============================================
-- INTEGRATION LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    sync_job_id UUID REFERENCES data_sync_jobs(id) ON DELETE SET NULL,
    
    -- Log details
    log_level VARCHAR(10) NOT NULL, -- 'DEBUG', 'INFO', 'WARN', 'ERROR'
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    
    -- Context
    operation VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    
    -- Request/Response data
    request_data JSONB,
    response_data JSONB,
    
    -- Performance
    processing_time_ms INTEGER,
    memory_usage_mb DECIMAL(8, 2),
    
    -- Metadata
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- DATA MAPPINGS
-- =============================================
CREATE TABLE IF NOT EXISTS data_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
    
    -- Mapping configuration
    entity_type VARCHAR(50) NOT NULL, -- 'job', 'client', 'invoice', etc.
    mapping_name VARCHAR(100) NOT NULL,
    
    -- Field mappings
    local_to_remote JSONB NOT NULL DEFAULT '{}',
    remote_to_local JSONB NOT NULL DEFAULT '{}',
    
    -- Transformation rules
    transformations JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    
    -- Default values
    default_values JSONB DEFAULT '{}',
    
    -- Configuration
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_bidirectional BOOLEAN DEFAULT true,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_integration_id, entity_type, mapping_name)
);

-- =============================================
-- INTEGRATION ANALYTICS
-- =============================================
CREATE TABLE IF NOT EXISTS integration_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time dimension
    date_recorded DATE NOT NULL,
    hour_recorded INTEGER, -- 0-23
    
    -- Integration dimension
    provider_id UUID REFERENCES integration_providers(id) ON DELETE SET NULL,
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metrics
    api_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    
    -- Data transfer
    data_synced_kb DECIMAL(12, 2) DEFAULT 0,
    records_synced INTEGER DEFAULT 0,
    
    -- Performance
    avg_response_time_ms DECIMAL(10, 2),
    min_response_time_ms INTEGER,
    max_response_time_ms INTEGER,
    
    -- Error tracking
    error_rate DECIMAL(5, 2),
    rate_limit_hits INTEGER DEFAULT 0,
    
    -- Webhook metrics
    webhooks_sent INTEGER DEFAULT 0,
    webhooks_delivered INTEGER DEFAULT 0,
    webhook_failures INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider_id, user_integration_id, date_recorded, hour_recorded)
);

-- =============================================
-- INTEGRATION MARKETPLACE
-- =============================================
CREATE TABLE IF NOT EXISTS integration_marketplace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
    
    -- Marketplace listing
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    publish_date TIMESTAMP WITH TIME ZONE,
    
    -- Marketing content
    short_description VARCHAR(255),
    long_description TEXT,
    benefits TEXT[],
    use_cases TEXT[],
    screenshots TEXT[],
    
    -- Ratings and reviews
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Installation metrics
    install_count INTEGER DEFAULT 0,
    active_install_count INTEGER DEFAULT 0,
    
    -- Support information
    support_email VARCHAR(255),
    support_url TEXT,
    
    -- Developer information
    developer_name VARCHAR(100),
    developer_website TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Integration providers indexes
CREATE INDEX IF NOT EXISTS idx_integration_providers_type ON integration_providers(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_providers_category ON integration_providers(category);
CREATE INDEX IF NOT EXISTS idx_integration_providers_active ON integration_providers(is_active);

-- User integrations indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider_id ON user_integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);
CREATE INDEX IF NOT EXISTS idx_user_integrations_last_sync ON user_integrations(last_sync_at DESC);

-- Data sync jobs indexes
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_integration_id ON data_sync_jobs(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_status ON data_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_scheduled ON data_sync_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_created ON data_sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_entity_type ON data_sync_jobs(entity_type);

-- Webhook deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_integration_id ON webhook_deliveries(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered ON webhook_deliveries(delivered);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_type, event_id);

-- API rate limits indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_integration_id ON api_rate_limits(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset ON api_rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_exceeded ON api_rate_limits(is_exceeded);

-- Integration logs indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON integration_logs(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_sync_job ON integration_logs(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_event_type ON integration_logs(event_type);

-- Data mappings indexes
CREATE INDEX IF NOT EXISTS idx_data_mappings_integration_id ON data_mappings(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_data_mappings_entity_type ON data_mappings(entity_type);
CREATE INDEX IF NOT EXISTS idx_data_mappings_active ON data_mappings(is_active);

-- Integration analytics indexes
CREATE INDEX IF NOT EXISTS idx_integration_analytics_provider ON integration_analytics(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_user_integration ON integration_analytics(user_integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_date ON integration_analytics(date_recorded DESC);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_user ON integration_analytics(user_id);

-- Integration marketplace indexes
CREATE INDEX IF NOT EXISTS idx_integration_marketplace_provider ON integration_marketplace(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_marketplace_featured ON integration_marketplace(is_featured);
CREATE INDEX IF NOT EXISTS idx_integration_marketplace_published ON integration_marketplace(is_published);
CREATE INDEX IF NOT EXISTS idx_integration_marketplace_rating ON integration_marketplace(rating_average DESC);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_marketplace ENABLE ROW LEVEL SECURITY;

-- Integration providers policies (public read for active providers)
DROP POLICY IF EXISTS "integration_providers_public_read" ON integration_providers;
CREATE POLICY "integration_providers_public_read" ON integration_providers
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "integration_providers_admin_full_access" ON integration_providers;
CREATE POLICY "integration_providers_admin_full_access" ON integration_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User integrations policies
DROP POLICY IF EXISTS "user_integrations_own_access" ON user_integrations;
CREATE POLICY "user_integrations_own_access" ON user_integrations
    FOR ALL USING (user_id = auth.uid());

-- Data sync jobs policies
DROP POLICY IF EXISTS "data_sync_jobs_own_access" ON data_sync_jobs;
CREATE POLICY "data_sync_jobs_own_access" ON data_sync_jobs
    FOR ALL USING (
        user_integration_id IN (
            SELECT id FROM user_integrations WHERE user_id = auth.uid()
        )
    );

-- Webhook deliveries policies
DROP POLICY IF EXISTS "webhook_deliveries_own_access" ON webhook_deliveries;
CREATE POLICY "webhook_deliveries_own_access" ON webhook_deliveries
    FOR ALL USING (
        user_integration_id IN (
            SELECT id FROM user_integrations WHERE user_id = auth.uid()
        )
    );

-- API rate limits policies
DROP POLICY IF EXISTS "api_rate_limits_own_access" ON api_rate_limits;
CREATE POLICY "api_rate_limits_own_access" ON api_rate_limits
    FOR ALL USING (
        user_integration_id IN (
            SELECT id FROM user_integrations WHERE user_id = auth.uid()
        )
    );

-- Integration logs policies
DROP POLICY IF EXISTS "integration_logs_own_access" ON integration_logs;
CREATE POLICY "integration_logs_own_access" ON integration_logs
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "integration_logs_system_insert" ON integration_logs;
CREATE POLICY "integration_logs_system_insert" ON integration_logs
    FOR INSERT WITH CHECK (true); -- System can log for any user

-- Data mappings policies
DROP POLICY IF EXISTS "data_mappings_own_access" ON data_mappings;
CREATE POLICY "data_mappings_own_access" ON data_mappings
    FOR ALL USING (
        user_integration_id IN (
            SELECT id FROM user_integrations WHERE user_id = auth.uid()
        )
    );

-- Integration analytics policies (admin only)
DROP POLICY IF EXISTS "integration_analytics_admin_access" ON integration_analytics;
CREATE POLICY "integration_analytics_admin_access" ON integration_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Integration marketplace policies (public read for published)
DROP POLICY IF EXISTS "integration_marketplace_public_read" ON integration_marketplace;
CREATE POLICY "integration_marketplace_public_read" ON integration_marketplace
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "integration_marketplace_admin_full_access" ON integration_marketplace;
CREATE POLICY "integration_marketplace_admin_full_access" ON integration_marketplace
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- STORED FUNCTIONS
-- =============================================

-- Function to encrypt sensitive integration data
CREATE OR REPLACE FUNCTION encrypt_integration_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(data, 'integration_encryption_key'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive integration data
CREATE OR REPLACE FUNCTION decrypt_integration_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), 'integration_encryption_key');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_integration_id UUID,
    p_endpoint VARCHAR(255) DEFAULT '*'
)
RETURNS BOOLEAN AS $$
DECLARE
    rate_limit_record RECORD;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    SELECT * INTO rate_limit_record
    FROM api_rate_limits
    WHERE user_integration_id = p_user_integration_id
    AND endpoint = p_endpoint;
    
    IF rate_limit_record.id IS NULL THEN
        -- No rate limit configured, allow request
        RETURN true;
    END IF;
    
    -- Check if reset time has passed
    IF current_time >= rate_limit_record.reset_at THEN
        -- Reset counters
        UPDATE api_rate_limits
        SET current_usage = 0,
            burst_usage = 0,
            is_exceeded = false,
            exceeded_at = NULL,
            reset_at = current_time + (rate_limit_record.period_duration || ' seconds')::INTERVAL,
            updated_at = current_time
        WHERE id = rate_limit_record.id;
        
        rate_limit_record.current_usage := 0;
        rate_limit_record.is_exceeded := false;
    END IF;
    
    -- Check if within limits
    IF rate_limit_record.current_usage >= rate_limit_record.requests_limit THEN
        -- Update exceeded status
        UPDATE api_rate_limits
        SET is_exceeded = true,
            exceeded_at = COALESCE(exceeded_at, current_time)
        WHERE id = rate_limit_record.id;
        
        RETURN false;
    END IF;
    
    -- Increment usage
    UPDATE api_rate_limits
    SET current_usage = current_usage + 1,
        updated_at = current_time
    WHERE id = rate_limit_record.id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to log integration events
CREATE OR REPLACE FUNCTION log_integration_event(
    p_user_integration_id UUID,
    p_log_level VARCHAR(10),
    p_event_type VARCHAR(50),
    p_message TEXT,
    p_operation VARCHAR(100) DEFAULT NULL,
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id VARCHAR(100) DEFAULT NULL,
    p_request_data JSONB DEFAULT NULL,
    p_response_data JSONB DEFAULT NULL,
    p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_id_val UUID;
BEGIN
    -- Get user_id from user_integration
    SELECT ui.user_id INTO user_id_val
    FROM user_integrations ui
    WHERE ui.id = p_user_integration_id;
    
    INSERT INTO integration_logs (
        user_integration_id,
        log_level,
        event_type,
        message,
        operation,
        entity_type,
        entity_id,
        request_data,
        response_data,
        processing_time_ms,
        user_id
    ) VALUES (
        p_user_integration_id,
        p_log_level,
        p_event_type,
        p_message,
        p_operation,
        p_entity_type,
        p_entity_id,
        p_request_data,
        p_response_data,
        p_processing_time_ms,
        user_id_val
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create data sync job
CREATE OR REPLACE FUNCTION create_sync_job(
    p_user_integration_id UUID,
    p_job_type VARCHAR(50),
    p_sync_direction sync_direction,
    p_entity_type VARCHAR(50),
    p_filters JSONB DEFAULT '{}',
    p_batch_size INTEGER DEFAULT 100,
    p_triggered_by UUID DEFAULT NULL,
    p_trigger_reason VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    job_id UUID;
BEGIN
    INSERT INTO data_sync_jobs (
        user_integration_id,
        job_type,
        sync_direction,
        entity_type,
        filters,
        batch_size,
        triggered_by,
        trigger_reason
    ) VALUES (
        p_user_integration_id,
        p_job_type,
        p_sync_direction,
        p_entity_type,
        p_filters,
        p_batch_size,
        p_triggered_by,
        p_trigger_reason
    ) RETURNING id INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sync job progress
CREATE OR REPLACE FUNCTION update_sync_job_progress(
    p_job_id UUID,
    p_status sync_status,
    p_total_records INTEGER DEFAULT NULL,
    p_processed_records INTEGER DEFAULT NULL,
    p_successful_records INTEGER DEFAULT NULL,
    p_failed_records INTEGER DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE data_sync_jobs
    SET status = p_status,
        total_records = COALESCE(p_total_records, total_records),
        processed_records = COALESCE(p_processed_records, processed_records),
        successful_records = COALESCE(p_successful_records, successful_records),
        failed_records = COALESCE(p_failed_records, failed_records),
        error_details = COALESCE(p_error_details, error_details),
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        started_at = CASE WHEN p_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deliver webhook
CREATE OR REPLACE FUNCTION deliver_webhook(
    p_user_integration_id UUID,
    p_event_type webhook_event_type,
    p_event_id UUID,
    p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
    webhook_id UUID;
    integration_record RECORD;
BEGIN
    -- Get webhook configuration
    SELECT webhook_url, webhook_secret_encrypted, webhook_events
    INTO integration_record
    FROM user_integrations
    WHERE id = p_user_integration_id
    AND status = 'active'
    AND webhook_url IS NOT NULL
    AND p_event_type = ANY(webhook_events);
    
    IF integration_record.webhook_url IS NULL THEN
        RETURN NULL; -- No webhook configured for this event
    END IF;
    
    -- Create webhook delivery record
    INSERT INTO webhook_deliveries (
        user_integration_id,
        event_type,
        event_id,
        webhook_url,
        payload
    ) VALUES (
        p_user_integration_id,
        p_event_type,
        p_event_id,
        integration_record.webhook_url,
        p_payload
    ) RETURNING id INTO webhook_id;
    
    RETURN webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update integration analytics
CREATE OR REPLACE FUNCTION update_integration_analytics()
RETURNS TRIGGER AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_hour INTEGER := EXTRACT(HOUR FROM NOW());
    provider_id_val UUID;
    user_id_val UUID;
BEGIN
    IF TG_TABLE_NAME = 'integration_logs' THEN
        -- Get provider and user info
        SELECT ui.provider_id, ui.user_id
        INTO provider_id_val, user_id_val
        FROM user_integrations ui
        WHERE ui.id = NEW.user_integration_id;
        
        -- Update analytics based on log entry
        INSERT INTO integration_analytics (
            provider_id,
            user_integration_id,
            user_id,
            date_recorded,
            hour_recorded,
            api_calls,
            successful_calls,
            failed_calls
        ) VALUES (
            provider_id_val,
            NEW.user_integration_id,
            user_id_val,
            current_date,
            current_hour,
            1,
            CASE WHEN NEW.log_level = 'INFO' THEN 1 ELSE 0 END,
            CASE WHEN NEW.log_level = 'ERROR' THEN 1 ELSE 0 END
        )
        ON CONFLICT (provider_id, user_integration_id, date_recorded, hour_recorded)
        DO UPDATE SET
            api_calls = integration_analytics.api_calls + 1,
            successful_calls = integration_analytics.successful_calls + 
                CASE WHEN NEW.log_level = 'INFO' THEN 1 ELSE 0 END,
            failed_calls = integration_analytics.failed_calls + 
                CASE WHEN NEW.log_level = 'ERROR' THEN 1 ELSE 0 END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics updates
DROP TRIGGER IF EXISTS update_integration_analytics_trigger ON integration_logs;
CREATE TRIGGER update_integration_analytics_trigger
    AFTER INSERT ON integration_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_analytics();

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_integration_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old logs (older than 90 days)
    DELETE FROM integration_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old webhook deliveries (older than 30 days)
    DELETE FROM webhook_deliveries
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete completed sync jobs (older than 7 days)
    DELETE FROM data_sync_jobs
    WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE DATA AND CONFIGURATION
-- =============================================

-- Insert popular integration providers
INSERT INTO integration_providers (
    provider_name,
    display_name,
    description,
    integration_type,
    category,
    base_url,
    auth_type,
    supports_webhooks,
    is_active
) VALUES 
(
    'quickbooks_online',
    'QuickBooks Online',
    'Sync your financial data with QuickBooks Online accounting software',
    'accounting',
    'finance',
    'https://sandbox-quickbooks.api.intuit.com',
    'oauth2',
    true,
    true
),
(
    'slack',
    'Slack',
    'Get notifications and updates in your Slack workspace',
    'communication',
    'productivity',
    'https://slack.com/api',
    'oauth2',
    true,
    true
),
(
    'google_calendar',
    'Google Calendar',
    'Sync job schedules with Google Calendar',
    'scheduling',
    'productivity',
    'https://www.googleapis.com/calendar/v3',
    'oauth2',
    false,
    true
),
(
    'stripe',
    'Stripe',
    'Process payments and manage billing with Stripe',
    'payment',
    'finance',
    'https://api.stripe.com/v1',
    'bearer_token',
    true,
    true
),
(
    'mailchimp',
    'Mailchimp',
    'Sync customer data with Mailchimp for email marketing',
    'marketing',
    'marketing',
    'https://us1.api.mailchimp.com/3.0',
    'api_key',
    true,
    true
) ON CONFLICT (provider_name) DO NOTHING;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE integration_providers IS 'Third-party service providers available for integration';
COMMENT ON TABLE user_integrations IS 'User-specific integrations with third-party services';
COMMENT ON TABLE data_sync_jobs IS 'Background jobs for synchronizing data with external services';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and their status';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting configuration and current usage tracking';
COMMENT ON TABLE integration_logs IS 'Comprehensive logging of all integration activities';
COMMENT ON TABLE data_mappings IS 'Custom field mappings between local and external data structures';
COMMENT ON TABLE integration_analytics IS 'Performance and usage analytics for integrations';
COMMENT ON TABLE integration_marketplace IS 'Marketplace listings for integration providers';
