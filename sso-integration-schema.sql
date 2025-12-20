-- =============================================
-- Single Sign-On (SSO) Integration Schema
-- =============================================
-- Comprehensive SSO framework supporting multiple providers
-- Features: OAuth 2.0, SAML, OpenID Connect, LDAP integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS AND TYPES
-- =============================================

-- SSO provider types
CREATE TYPE sso_provider_type AS ENUM (
    'google',
    'microsoft',
    'apple',
    'facebook',
    'github',
    'linkedin',
    'twitter',
    'okta',
    'auth0',
    'azure_ad',
    'saml',
    'ldap',
    'custom_oauth2',
    'custom_saml'
);

-- Authentication protocols
CREATE TYPE auth_protocol AS ENUM (
    'oauth2',
    'openid_connect',
    'saml2',
    'ldap',
    'custom'
);

-- SSO configuration status
CREATE TYPE sso_config_status AS ENUM (
    'draft',
    'testing',
    'active',
    'inactive',
    'error',
    'deprecated'
);

-- User account linking status
CREATE TYPE account_linking_status AS ENUM (
    'linked',
    'pending',
    'failed',
    'revoked'
);

-- Session types
CREATE TYPE session_type AS ENUM (
    'web',
    'mobile',
    'api',
    'sso'
);

-- =============================================
-- SSO PROVIDERS CONFIGURATION
-- =============================================
CREATE TABLE sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Provider identification
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    provider_type sso_provider_type NOT NULL,
    protocol auth_protocol NOT NULL DEFAULT 'oauth2',
    
    -- Configuration status
    status sso_config_status NOT NULL DEFAULT 'draft',
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- OAuth 2.0 / OpenID Connect configuration
    client_id VARCHAR(255),
    client_secret_encrypted TEXT, -- Encrypted with pgcrypto
    authorization_url TEXT,
    token_url TEXT,
    userinfo_url TEXT,
    jwks_url TEXT,
    issuer VARCHAR(255),
    
    -- SAML configuration
    saml_entity_id VARCHAR(255),
    saml_sso_url TEXT,
    saml_sls_url TEXT,
    saml_certificate TEXT,
    saml_private_key_encrypted TEXT,
    
    -- LDAP configuration
    ldap_host VARCHAR(255),
    ldap_port INTEGER,
    ldap_base_dn TEXT,
    ldap_bind_dn TEXT,
    ldap_bind_password_encrypted TEXT,
    ldap_user_search_filter TEXT,
    ldap_group_search_filter TEXT,
    
    -- Scopes and permissions
    requested_scopes TEXT[], -- OAuth scopes
    user_attributes JSONB, -- Attribute mapping
    group_attributes JSONB, -- Group/role mapping
    
    -- UI configuration
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    button_color VARCHAR(7) DEFAULT '#007bff',
    button_text_color VARCHAR(7) DEFAULT '#ffffff',
    
    -- Security settings
    enforce_email_verification BOOLEAN NOT NULL DEFAULT true,
    auto_create_users BOOLEAN NOT NULL DEFAULT true,
    auto_link_accounts BOOLEAN NOT NULL DEFAULT false,
    require_matching_email BOOLEAN NOT NULL DEFAULT true,
    
    -- Advanced settings
    custom_claims JSONB DEFAULT '{}',
    token_lifetime INTEGER DEFAULT 3600, -- seconds
    refresh_token_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_results JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- USER SSO ACCOUNTS
-- =============================================
CREATE TABLE user_sso_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    
    -- External account details
    external_user_id VARCHAR(255) NOT NULL,
    external_username VARCHAR(255),
    external_email VARCHAR(255),
    external_display_name VARCHAR(255),
    
    -- Account linking
    linking_status account_linking_status NOT NULL DEFAULT 'linked',
    linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unlinked_at TIMESTAMP WITH TIME ZONE,
    
    -- Token management
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    id_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile data
    profile_data JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '[]',
    groups JSONB DEFAULT '[]',
    
    -- Security
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider_id, external_user_id)
);

-- =============================================
-- SSO SESSIONS
-- =============================================
CREATE TABLE sso_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
    
    -- Session identification
    session_token VARCHAR(255) NOT NULL UNIQUE,
    session_type session_type NOT NULL DEFAULT 'web',
    
    -- Session data
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_data JSONB,
    
    -- Timing
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Session state
    is_active BOOLEAN NOT NULL DEFAULT true,
    logout_reason VARCHAR(100),
    
    -- SSO specific data
    sso_session_id VARCHAR(255),
    sso_state VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- SSO AUTHENTICATION LOGS
-- =============================================
CREATE TABLE sso_auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication attempt details
    provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Request details
    auth_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'token_refresh', 'callback'
    external_user_id VARCHAR(255),
    
    -- Result
    success BOOLEAN NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Request data
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    response_data JSONB,
    
    -- Performance
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- SSO CONFIGURATION AUDIT
-- =============================================
CREATE TABLE sso_config_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    
    -- Change details
    changed_by UUID NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'enable', 'disable', 'test'
    
    -- Change data
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    
    -- Context
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- ORGANIZATION SSO SETTINGS
-- =============================================
CREATE TABLE organization_sso_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID, -- For future multi-tenancy support
    
    -- SSO enforcement
    enforce_sso BOOLEAN NOT NULL DEFAULT false,
    allowed_providers UUID[] DEFAULT '{}',
    default_provider_id UUID REFERENCES sso_providers(id),
    
    -- Domain-based auto-assignment
    email_domains TEXT[] DEFAULT '{}',
    auto_assign_provider BOOLEAN NOT NULL DEFAULT false,
    
    -- Security policies
    require_mfa BOOLEAN NOT NULL DEFAULT false,
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
    concurrent_session_limit INTEGER DEFAULT 5,
    
    -- User provisioning
    auto_provision_users BOOLEAN NOT NULL DEFAULT true,
    default_role VARCHAR(50) DEFAULT 'contractor',
    user_attribute_mapping JSONB DEFAULT '{}',
    
    -- Just-in-Time (JIT) provisioning
    jit_enabled BOOLEAN NOT NULL DEFAULT false,
    jit_group_mapping JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- SSO ANALYTICS
-- =============================================
CREATE TABLE sso_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
    
    -- Time dimension
    date_recorded DATE NOT NULL,
    hour_recorded INTEGER, -- 0-23
    
    -- Metrics
    login_attempts INTEGER DEFAULT 0,
    successful_logins INTEGER DEFAULT 0,
    failed_logins INTEGER DEFAULT 0,
    logout_count INTEGER DEFAULT 0,
    
    -- User metrics
    unique_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10, 2),
    success_rate DECIMAL(5, 2),
    
    -- Error tracking
    error_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider_id, date_recorded, hour_recorded)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- SSO providers indexes
CREATE INDEX idx_sso_providers_type ON sso_providers(provider_type);
CREATE INDEX idx_sso_providers_status ON sso_providers(status);
CREATE INDEX idx_sso_providers_enabled ON sso_providers(is_enabled);

-- User SSO accounts indexes
CREATE INDEX idx_user_sso_accounts_user_id ON user_sso_accounts(user_id);
CREATE INDEX idx_user_sso_accounts_provider_id ON user_sso_accounts(provider_id);
CREATE INDEX idx_user_sso_accounts_external_id ON user_sso_accounts(external_user_id);
CREATE INDEX idx_user_sso_accounts_external_email ON user_sso_accounts(external_email);
CREATE INDEX idx_user_sso_accounts_status ON user_sso_accounts(linking_status);

-- SSO sessions indexes
CREATE INDEX idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_token ON sso_sessions(session_token);
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at);
CREATE INDEX idx_sso_sessions_active ON sso_sessions(is_active);
CREATE INDEX idx_sso_sessions_provider ON sso_sessions(provider_id);

-- SSO auth logs indexes
CREATE INDEX idx_sso_auth_logs_provider ON sso_auth_logs(provider_id);
CREATE INDEX idx_sso_auth_logs_user ON sso_auth_logs(user_id);
CREATE INDEX idx_sso_auth_logs_type ON sso_auth_logs(auth_type);
CREATE INDEX idx_sso_auth_logs_success ON sso_auth_logs(success);
CREATE INDEX idx_sso_auth_logs_created ON sso_auth_logs(created_at DESC);
CREATE INDEX idx_sso_auth_logs_ip ON sso_auth_logs(ip_address);

-- SSO config audit indexes
CREATE INDEX idx_sso_config_audit_provider ON sso_config_audit(provider_id);
CREATE INDEX idx_sso_config_audit_user ON sso_config_audit(changed_by);
CREATE INDEX idx_sso_config_audit_type ON sso_config_audit(change_type);
CREATE INDEX idx_sso_config_audit_created ON sso_config_audit(created_at DESC);

-- SSO analytics indexes
CREATE INDEX idx_sso_analytics_provider ON sso_analytics(provider_id);
CREATE INDEX idx_sso_analytics_date ON sso_analytics(date_recorded DESC);
CREATE INDEX idx_sso_analytics_hour ON sso_analytics(date_recorded, hour_recorded);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sso_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_sso_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_analytics ENABLE ROW LEVEL SECURITY;

-- SSO providers policies (admin only for most operations)
CREATE POLICY "sso_providers_admin_full_access" ON sso_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "sso_providers_public_read" ON sso_providers
    FOR SELECT USING (is_enabled = true AND status = 'active');

-- User SSO accounts policies
CREATE POLICY "user_sso_accounts_own_access" ON user_sso_accounts
    FOR ALL USING (user_id = auth.uid());

-- SSO sessions policies
CREATE POLICY "sso_sessions_own_access" ON sso_sessions
    FOR ALL USING (user_id = auth.uid());

-- SSO auth logs policies (admin only)
CREATE POLICY "sso_auth_logs_admin_access" ON sso_auth_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SSO config audit policies (admin only)
CREATE POLICY "sso_config_audit_admin_access" ON sso_config_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Organization SSO settings policies (admin only)
CREATE POLICY "organization_sso_settings_admin_access" ON organization_sso_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SSO analytics policies (admin only)
CREATE POLICY "sso_analytics_admin_access" ON sso_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- STORED FUNCTIONS
-- =============================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key_id TEXT DEFAULT 'sso_encryption_key')
RETURNS TEXT AS $$
BEGIN
    -- Using pgcrypto to encrypt sensitive data
    -- In production, use a proper key management system
    RETURN encode(pgp_sym_encrypt(data, key_id), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key_id TEXT DEFAULT 'sso_encryption_key')
RETURNS TEXT AS $$
BEGIN
    -- Using pgcrypto to decrypt sensitive data
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), key_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link user accounts
CREATE OR REPLACE FUNCTION link_sso_account(
    p_user_id UUID,
    p_provider_id UUID,
    p_external_user_id VARCHAR(255),
    p_external_email VARCHAR(255),
    p_profile_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    account_id UUID;
    existing_account_id UUID;
BEGIN
    -- Check if account already exists
    SELECT id INTO existing_account_id
    FROM user_sso_accounts
    WHERE provider_id = p_provider_id 
    AND external_user_id = p_external_user_id;
    
    IF existing_account_id IS NOT NULL THEN
        -- Update existing account
        UPDATE user_sso_accounts
        SET user_id = p_user_id,
            external_email = p_external_email,
            profile_data = p_profile_data,
            linking_status = 'linked',
            linked_at = NOW(),
            unlinked_at = NULL,
            updated_at = NOW()
        WHERE id = existing_account_id
        RETURNING id INTO account_id;
    ELSE
        -- Create new account link
        INSERT INTO user_sso_accounts (
            user_id,
            provider_id,
            external_user_id,
            external_email,
            profile_data,
            linking_status
        ) VALUES (
            p_user_id,
            p_provider_id,
            p_external_user_id,
            p_external_email,
            p_profile_data,
            'linked'
        ) RETURNING id INTO account_id;
    END IF;
    
    RETURN account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create SSO session
CREATE OR REPLACE FUNCTION create_sso_session(
    p_user_id UUID,
    p_provider_id UUID,
    p_session_type session_type DEFAULT 'web',
    p_expires_in INTEGER DEFAULT 3600,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'
)
RETURNS TABLE(session_id UUID, session_token VARCHAR(255)) AS $$
DECLARE
    new_session_id UUID;
    new_session_token VARCHAR(255);
BEGIN
    -- Generate session token
    new_session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create session
    INSERT INTO sso_sessions (
        user_id,
        provider_id,
        session_token,
        session_type,
        expires_at,
        ip_address,
        user_agent,
        device_info
    ) VALUES (
        p_user_id,
        p_provider_id,
        new_session_token,
        p_session_type,
        NOW() + (p_expires_in || ' seconds')::INTERVAL,
        p_ip_address,
        p_user_agent,
        p_device_info
    ) RETURNING id INTO new_session_id;
    
    RETURN QUERY SELECT new_session_id, new_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate SSO session
CREATE OR REPLACE FUNCTION validate_sso_session(p_session_token VARCHAR(255))
RETURNS TABLE(
    is_valid BOOLEAN,
    user_id UUID,
    provider_id UUID,
    session_data JSONB
) AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get session
    SELECT s.*, u.email, u.first_name, u.last_name, u.role
    INTO session_record
    FROM sso_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
    AND s.is_active = true
    AND s.expires_at > NOW();
    
    IF session_record.id IS NOT NULL THEN
        -- Update last activity
        UPDATE sso_sessions
        SET last_activity_at = NOW()
        WHERE id = session_record.id;
        
        -- Return valid session
        RETURN QUERY SELECT 
            true,
            session_record.user_id,
            session_record.provider_id,
            jsonb_build_object(
                'email', session_record.email,
                'first_name', session_record.first_name,
                'last_name', session_record.last_name,
                'role', session_record.role,
                'session_type', session_record.session_type
            );
    ELSE
        -- Return invalid session
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, '{}'::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log authentication attempts
CREATE OR REPLACE FUNCTION log_sso_auth(
    p_provider_id UUID,
    p_user_id UUID,
    p_auth_type VARCHAR(50),
    p_external_user_id VARCHAR(255),
    p_success BOOLEAN,
    p_error_code VARCHAR(100) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_data JSONB DEFAULT '{}',
    p_response_data JSONB DEFAULT '{}',
    p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO sso_auth_logs (
        provider_id,
        user_id,
        auth_type,
        external_user_id,
        success,
        error_code,
        error_message,
        ip_address,
        user_agent,
        request_data,
        response_data,
        processing_time_ms
    ) VALUES (
        p_provider_id,
        p_user_id,
        p_auth_type,
        p_external_user_id,
        p_success,
        p_error_code,
        p_error_message,
        p_ip_address,
        p_user_agent,
        p_request_data,
        p_response_data,
        p_processing_time_ms
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update SSO analytics
CREATE OR REPLACE FUNCTION update_sso_analytics()
RETURNS TRIGGER AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
    IF TG_OP = 'INSERT' AND NEW.success = true THEN
        -- Update analytics for successful login
        INSERT INTO sso_analytics (
            provider_id,
            date_recorded,
            hour_recorded,
            login_attempts,
            successful_logins,
            unique_users
        ) VALUES (
            NEW.provider_id,
            current_date,
            current_hour,
            1,
            1,
            1
        )
        ON CONFLICT (provider_id, date_recorded, hour_recorded)
        DO UPDATE SET
            login_attempts = sso_analytics.login_attempts + 1,
            successful_logins = sso_analytics.successful_logins + 1,
            unique_users = (
                SELECT COUNT(DISTINCT user_id)
                FROM sso_auth_logs
                WHERE provider_id = NEW.provider_id
                AND DATE(created_at) = current_date
                AND EXTRACT(HOUR FROM created_at) = current_hour
                AND success = true
            );
    ELSIF TG_OP = 'INSERT' AND NEW.success = false THEN
        -- Update analytics for failed login
        INSERT INTO sso_analytics (
            provider_id,
            date_recorded,
            hour_recorded,
            login_attempts,
            failed_logins
        ) VALUES (
            NEW.provider_id,
            current_date,
            current_hour,
            1,
            1
        )
        ON CONFLICT (provider_id, date_recorded, hour_recorded)
        DO UPDATE SET
            login_attempts = sso_analytics.login_attempts + 1,
            failed_logins = sso_analytics.failed_logins + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SSO analytics
CREATE TRIGGER update_sso_analytics_trigger
    AFTER INSERT ON sso_auth_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_sso_analytics();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired sessions as inactive
    UPDATE sso_sessions
    SET is_active = false,
        logout_reason = 'expired'
    WHERE expires_at < NOW()
    AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete sessions older than 30 days
    DELETE FROM sso_sessions
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit configuration changes
CREATE OR REPLACE FUNCTION audit_sso_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO sso_config_audit (
            provider_id,
            changed_by,
            change_type,
            old_values,
            new_values,
            change_summary
        ) VALUES (
            NEW.id,
            auth.uid(),
            'update',
            to_jsonb(OLD),
            to_jsonb(NEW),
            'SSO provider configuration updated'
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO sso_config_audit (
            provider_id,
            changed_by,
            change_type,
            new_values,
            change_summary
        ) VALUES (
            NEW.id,
            auth.uid(),
            'create',
            to_jsonb(NEW),
            'SSO provider configuration created'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for configuration auditing
CREATE TRIGGER audit_sso_config_changes_trigger
    AFTER INSERT OR UPDATE ON sso_providers
    FOR EACH ROW
    EXECUTE FUNCTION audit_sso_config_changes();

-- =============================================
-- SAMPLE DATA AND CONFIGURATION
-- =============================================

-- Insert default organization SSO settings
INSERT INTO organization_sso_settings (
    enforce_sso,
    auto_provision_users,
    default_role,
    session_timeout_minutes,
    concurrent_session_limit
) VALUES (
    false,
    true,
    'contractor',
    480,
    5
) ON CONFLICT DO NOTHING;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE sso_providers IS 'Configuration for Single Sign-On providers (Google, Microsoft, SAML, etc.)';
COMMENT ON TABLE user_sso_accounts IS 'Links between local user accounts and external SSO provider accounts';
COMMENT ON TABLE sso_sessions IS 'Active SSO sessions with token management and device tracking';
COMMENT ON TABLE sso_auth_logs IS 'Comprehensive audit log of all SSO authentication attempts';
COMMENT ON TABLE sso_config_audit IS 'Audit trail of SSO configuration changes';
COMMENT ON TABLE organization_sso_settings IS 'Organization-wide SSO policies and settings';
COMMENT ON TABLE sso_analytics IS 'Performance and usage analytics for SSO providers';

-- Security notes
COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts sensitive data like tokens and secrets using pgcrypto';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts sensitive data - use with caution and proper access control';
COMMENT ON FUNCTION link_sso_account IS 'Creates or updates the link between a user and their SSO account';
COMMENT ON FUNCTION create_sso_session IS 'Creates a new authenticated SSO session with proper token management';
COMMENT ON FUNCTION validate_sso_session IS 'Validates an SSO session token and returns user information';
COMMENT ON FUNCTION log_sso_auth IS 'Logs authentication attempts for security auditing and analytics';