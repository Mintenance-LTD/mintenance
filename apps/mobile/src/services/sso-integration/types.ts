/**
 * SSO Integration Types
 * 
 * Contains all TypeScript interfaces and types for SSO integration functionality.
 */

export interface SSOProvider {
  id: string;
  provider_name: string;
  provider_type:
    | 'google'
    | 'microsoft'
    | 'apple'
    | 'facebook'
    | 'github'
    | 'linkedin'
    | 'twitter'
    | 'okta'
    | 'auth0'
    | 'azure_ad'
    | 'saml'
    | 'ldap'
    | 'custom_oauth2'
    | 'custom_saml';
  protocol: 'oauth2' | 'openid_connect' | 'saml2' | 'ldap' | 'custom';
  status: 'draft' | 'testing' | 'active' | 'inactive' | 'error' | 'deprecated';
  is_enabled: boolean;
  is_default: boolean;
  client_id?: string;
  client_secret_encrypted?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  issuer?: string;
  saml_entity_id?: string;
  saml_sso_url?: string;
  saml_sls_url?: string;
  saml_certificate?: string;
  saml_private_key_encrypted?: string;
  ldap_host?: string;
  ldap_port?: number;
  ldap_base_dn?: string;
  ldap_bind_dn?: string;
  ldap_bind_password_encrypted?: string;
  ldap_user_search_filter?: string;
  ldap_group_search_filter?: string;
  requested_scopes?: string[];
  user_attributes?: any;
  group_attributes?: any;
  display_name: string;
  description?: string;
  logo_url?: string;
  button_color: string;
  button_text_color: string;
  enforce_email_verification: boolean;
  auto_create_users: boolean;
  auto_link_accounts: boolean;
  require_matching_email: boolean;
  custom_claims?: any;
  token_lifetime: number;
  refresh_token_enabled: boolean;
  created_by?: string;
  last_tested_at?: string;
  test_results?: any;
  created_at: string;
  updated_at: string;
}

export interface UserSSOAccount {
  id: string;
  user_id: string;
  provider_id: string;
  external_user_id: string;
  external_username?: string;
  external_email?: string;
  external_display_name?: string;
  linking_status: 'linked' | 'pending' | 'failed' | 'revoked';
  linked_at: string;
  unlinked_at?: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  id_token_encrypted?: string;
  token_expires_at?: string;
  profile_data: any;
  permissions: any[];
  groups: any[];
  last_login_at?: string;
  login_count: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface SSOSession {
  id: string;
  user_id: string;
  provider_id?: string;
  session_token: string;
  session_type: 'web' | 'mobile' | 'api' | 'sso';
  ip_address?: string;
  user_agent?: string;
  device_info?: any;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  expires_at: string;
  last_activity_at: string;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface SSOConfiguration {
  id: string;
  contractor_id: string;
  provider_id: string;
  is_enabled: boolean;
  is_default: boolean;
  auto_provision: boolean;
  sync_groups: boolean;
  sync_attributes: boolean;
  default_role?: string;
  default_permissions?: string[];
  group_mapping?: Record<string, string>;
  attribute_mapping?: Record<string, string>;
  custom_settings?: any;
  created_at: string;
  updated_at: string;
}

export interface SSOEvent {
  id: string;
  user_id?: string;
  provider_id?: string;
  event_type: 'login' | 'logout' | 'token_refresh' | 'account_link' | 'account_unlink' | 'error' | 'test';
  event_status: 'success' | 'failure' | 'warning';
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  metadata: any;
  created_at: string;
}

export interface SSOToken {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  issued_at: number;
  expires_at: number;
}

export interface SSOUserProfile {
  id: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  groups?: string[];
  roles?: string[];
  custom_attributes?: Record<string, any>;
}

export interface SSOProviderConfig {
  provider_type: SSOProvider['provider_type'];
  protocol: SSOProvider['protocol'];
  client_id: string;
  client_secret: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  issuer?: string;
  requested_scopes?: string[];
  custom_endpoints?: Record<string, string>;
  saml_config?: {
    entity_id: string;
    sso_url: string;
    sls_url?: string;
    certificate: string;
    private_key?: string;
  };
  ldap_config?: {
    host: string;
    port: number;
    base_dn: string;
    bind_dn: string;
    bind_password: string;
    user_search_filter: string;
    group_search_filter?: string;
  };
}

export interface SSOLoginRequest {
  provider_id: string;
  redirect_uri: string;
  state?: string;
  nonce?: string;
  scopes?: string[];
  custom_parameters?: Record<string, string>;
}

export interface SSOLoginResponse {
  success: boolean;
  user?: SSOUserProfile;
  tokens?: SSOToken;
  redirect_url?: string;
  error?: string;
  error_description?: string;
}

export interface SSOTestResult {
  provider_id: string;
  test_type: 'connection' | 'authentication' | 'user_lookup' | 'group_sync';
  success: boolean;
  error_message?: string;
  response_time_ms: number;
  details: any;
  tested_at: string;
}

export interface SSOAnalytics {
  contractor_id: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_logins: number;
    successful_logins: number;
    failed_logins: number;
    unique_users: number;
    active_providers: number;
    avg_login_time_ms: number;
  };
  provider_stats: {
    provider_id: string;
    provider_name: string;
    login_count: number;
    success_rate: number;
    avg_response_time_ms: number;
    error_count: number;
  }[];
  trends: {
    logins_by_day: number[];
    success_rate_by_day: number[];
    response_time_by_day: number[];
  };
  top_users: {
    user_id: string;
    login_count: number;
    last_login: string;
  }[];
  error_analysis: {
    error_type: string;
    count: number;
    percentage: number;
  }[];
  last_calculated: string;
}

export interface SSOFilterOptions {
  provider_id?: string[];
  status?: SSOProvider['status'][];
  protocol?: SSOProvider['protocol'][];
  is_enabled?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SSOSortOptions {
  field: 'provider_name' | 'status' | 'created_at' | 'last_tested_at';
  direction: 'asc' | 'desc';
}

export interface CreateSSOProviderRequest {
  provider_name: string;
  provider_type: SSOProvider['provider_type'];
  protocol: SSOProvider['protocol'];
  config: SSOProviderConfig;
  display_name: string;
  description?: string;
  logo_url?: string;
  button_color?: string;
  button_text_color?: string;
  enforce_email_verification?: boolean;
  auto_create_users?: boolean;
  auto_link_accounts?: boolean;
  require_matching_email?: boolean;
  token_lifetime?: number;
  refresh_token_enabled?: boolean;
}

export interface UpdateSSOProviderRequest {
  id: string;
  updates: Partial<Pick<SSOProvider, 'display_name' | 'description' | 'logo_url' | 'button_color' | 'button_text_color' | 'is_enabled' | 'enforce_email_verification' | 'auto_create_users' | 'auto_link_accounts' | 'require_matching_email' | 'token_lifetime' | 'refresh_token_enabled'>>;
}

export interface SSOSearchParams {
  query?: string;
  filters?: SSOFilterOptions;
  sort?: SSOSortOptions;
  page?: number;
  limit?: number;
}

export interface SSOImportData {
  providers: Omit<CreateSSOProviderRequest, 'contractor_id'>[];
  mapping: {
    provider_name: string;
    provider_type: string;
    protocol: string;
    display_name: string;
    description?: string;
  };
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    defaultStatus: SSOProvider['status'];
  };
}

export interface SSOExportOptions {
  format: 'json' | 'csv';
  include_config: boolean;
  include_test_results: boolean;
  filters?: SSOFilterOptions;
}

export interface SSOHealthCheck {
  provider_id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  last_check: string;
  error_message?: string;
  details: {
    connection: boolean;
    authentication: boolean;
    user_lookup: boolean;
    group_sync?: boolean;
  };
}

export interface SSOSecurityAudit {
  provider_id: string;
  audit_date: string;
  findings: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'encryption' | 'configuration' | 'compliance';
    description: string;
    recommendation: string;
    status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  }[];
  overall_score: number;
  compliance_status: 'compliant' | 'non_compliant' | 'requires_review';
}
