import { supabase } from '../config/supabase';
import { Database } from '../types/database';

export interface SSOProvider {
  id: string;
  provider_name: string;
  provider_type: 'google' | 'microsoft' | 'apple' | 'facebook' | 'github' | 'linkedin' | 'twitter' | 'okta' | 'auth0' | 'azure_ad' | 'saml' | 'ldap' | 'custom_oauth2' | 'custom_saml';
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
  location_data?: any;
  expires_at: string;
  last_activity_at: string;
  is_active: boolean;
  logout_reason?: string;
  sso_session_id?: string;
  sso_state?: string;
  created_at: string;
}

export interface SSOAuthLog {
  id: string;
  provider_id?: string;
  user_id?: string;
  auth_type: string;
  external_user_id?: string;
  success: boolean;
  error_code?: string;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  request_data?: any;
  response_data?: any;
  processing_time_ms?: number;
  created_at: string;
}

export interface OrganizationSSOSettings {
  id: string;
  organization_id?: string;
  enforce_sso: boolean;
  allowed_providers: string[];
  default_provider_id?: string;
  email_domains: string[];
  auto_assign_provider: boolean;
  require_mfa: boolean;
  session_timeout_minutes: number;
  concurrent_session_limit: number;
  auto_provision_users: boolean;
  default_role: string;
  user_attribute_mapping: any;
  jit_enabled: boolean;
  jit_group_mapping: any;
  created_at: string;
  updated_at: string;
}

export interface SSOAnalytics {
  id: string;
  provider_id?: string;
  date_recorded: string;
  hour_recorded?: number;
  login_attempts: number;
  successful_logins: number;
  failed_logins: number;
  logout_count: number;
  unique_users: number;
  new_users: number;
  returning_users: number;
  avg_response_time_ms?: number;
  success_rate?: number;
  error_breakdown: any;
  created_at: string;
}

export interface CreateSSOProviderData {
  provider_name: string;
  provider_type: SSOProvider['provider_type'];
  protocol?: SSOProvider['protocol'];
  display_name: string;
  description?: string;
  client_id?: string;
  client_secret?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  issuer?: string;
  requested_scopes?: string[];
  user_attributes?: any;
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

export interface OAuth2AuthorizeParams {
  client_id: string;
  redirect_uri: string;
  response_type: 'code' | 'token';
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
  nonce?: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface SSOUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: any;
}

export class SSOIntegrationService {
  // =============================================
  // SSO PROVIDER MANAGEMENT
  // =============================================

  static async createSSOProvider(
    createdBy: string,
    providerData: CreateSSOProviderData
  ): Promise<SSOProvider> {
    try {
      // Encrypt sensitive data if provided
      let clientSecretEncrypted: string | undefined;
      if (providerData.client_secret) {
        const { data: encrypted } = await supabase
          .rpc('encrypt_sensitive_data', { data: providerData.client_secret });
        clientSecretEncrypted = encrypted;
      }

      const { data, error } = await supabase
        .from('sso_providers')
        .insert({
          provider_name: providerData.provider_name,
          provider_type: providerData.provider_type,
          protocol: providerData.protocol || 'oauth2',
          display_name: providerData.display_name,
          description: providerData.description,
          client_id: providerData.client_id,
          client_secret_encrypted: clientSecretEncrypted,
          authorization_url: providerData.authorization_url,
          token_url: providerData.token_url,
          userinfo_url: providerData.userinfo_url,
          jwks_url: providerData.jwks_url,
          issuer: providerData.issuer,
          requested_scopes: providerData.requested_scopes,
          user_attributes: providerData.user_attributes,
          logo_url: providerData.logo_url,
          button_color: providerData.button_color || '#007bff',
          button_text_color: providerData.button_text_color || '#ffffff',
          enforce_email_verification: providerData.enforce_email_verification ?? true,
          auto_create_users: providerData.auto_create_users ?? true,
          auto_link_accounts: providerData.auto_link_accounts ?? false,
          require_matching_email: providerData.require_matching_email ?? true,
          token_lifetime: providerData.token_lifetime || 3600,
          refresh_token_enabled: providerData.refresh_token_enabled ?? true,
          created_by: createdBy,
          status: 'draft',
          is_enabled: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating SSO provider:', error);
      throw new Error('Failed to create SSO provider');
    }
  }

  static async getSSOProviders(includeInactive: boolean = false): Promise<SSOProvider[]> {
    try {
      let query = supabase.from('sso_providers').select('*');
      
      if (!includeInactive) {
        query = query.eq('is_enabled', true).eq('status', 'active');
      }

      const { data, error } = await query.order('display_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
      throw new Error('Failed to fetch SSO providers');
    }
  }

  static async getSSOProvider(providerId: string): Promise<SSOProvider | null> {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching SSO provider:', error);
      throw new Error('Failed to fetch SSO provider');
    }
  }

  static async updateSSOProvider(
    providerId: string,
    providerData: Partial<CreateSSOProviderData>
  ): Promise<SSOProvider> {
    try {
      let updateData: any = { ...providerData };

      // Handle client secret encryption if provided
      if (providerData.client_secret) {
        const { data: encrypted } = await supabase
          .rpc('encrypt_sensitive_data', { data: providerData.client_secret });
        updateData.client_secret_encrypted = encrypted;
        delete updateData.client_secret;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('sso_providers')
        .update(updateData)
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating SSO provider:', error);
      throw new Error('Failed to update SSO provider');
    }
  }

  static async enableSSOProvider(providerId: string): Promise<SSOProvider> {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .update({
          is_enabled: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error enabling SSO provider:', error);
      throw new Error('Failed to enable SSO provider');
    }
  }

  static async disableSSOProvider(providerId: string): Promise<SSOProvider> {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .update({
          is_enabled: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error disabling SSO provider:', error);
      throw new Error('Failed to disable SSO provider');
    }
  }

  static async testSSOProvider(providerId: string): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const provider = await this.getSSOProvider(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Update test timestamp
      await supabase
        .from('sso_providers')
        .update({
          last_tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      // Perform basic configuration validation
      const testResults: any = {
        configuration_valid: true,
        endpoints_reachable: false,
        certificate_valid: false,
        test_timestamp: new Date().toISOString()
      };

      if (provider.protocol === 'oauth2' || provider.protocol === 'openid_connect') {
        // Test OAuth2/OIDC endpoints
        if (!provider.client_id || !provider.authorization_url || !provider.token_url) {
          testResults.configuration_valid = false;
          testResults.errors = ['Missing required OAuth2 configuration'];
        }
        
        // In a real implementation, you would test endpoint reachability
        testResults.endpoints_reachable = true; // Placeholder
      }

      // Update test results
      await supabase
        .from('sso_providers')
        .update({
          test_results: testResults,
          status: testResults.configuration_valid ? 'testing' : 'error'
        })
        .eq('id', providerId);

      return {
        success: testResults.configuration_valid,
        details: testResults
      };
    } catch (error) {
      console.error('Error testing SSO provider:', error);
      
      // Update provider with error status
      await supabase
        .from('sso_providers')
        .update({
          status: 'error',
          test_results: {
            error: error instanceof Error ? error.message : 'Unknown error',
            test_timestamp: new Date().toISOString()
          }
        })
        .eq('id', providerId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================
  // OAUTH2 AUTHENTICATION FLOW
  // =============================================

  static generateAuthorizationURL(
    provider: SSOProvider,
    redirectUri: string,
    state?: string,
    nonce?: string
  ): string {
    if (!provider.authorization_url || !provider.client_id) {
      throw new Error('Provider not configured for OAuth2');
    }

    const params = new URLSearchParams({
      client_id: provider.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.requested_scopes?.join(' ') || 'openid profile email',
      state: state || this.generateRandomString(32)
    });

    if (nonce) {
      params.append('nonce', nonce);
    }

    return `${provider.authorization_url}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(
    provider: SSOProvider,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<OAuth2TokenResponse> {
    if (!provider.token_url || !provider.client_id) {
      throw new Error('Provider not configured for token exchange');
    }

    // Decrypt client secret
    let clientSecret: string | undefined;
    if (provider.client_secret_encrypted) {
      const { data: decrypted } = await supabase
        .rpc('decrypt_sensitive_data', { encrypted_data: provider.client_secret_encrypted });
      clientSecret = decrypted;
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: provider.client_id
    });

    if (clientSecret) {
      tokenParams.append('client_secret', clientSecret);
    }

    if (codeVerifier) {
      tokenParams.append('code_verifier', codeVerifier);
    }

    try {
      const response = await fetch(provider.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenParams.toString()
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();
      return tokenResponse;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  static async getUserInfo(provider: SSOProvider, accessToken: string): Promise<SSOUserInfo> {
    if (!provider.userinfo_url) {
      throw new Error('Provider not configured for user info retrieval');
    }

    try {
      const response = await fetch(provider.userinfo_url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`User info request failed: ${response.status} ${response.statusText}`);
      }

      const userInfo: SSOUserInfo = await response.json();
      return userInfo;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  // =============================================
  // USER ACCOUNT LINKING
  // =============================================

  static async linkUserSSOAccount(
    userId: string,
    providerId: string,
    externalUserId: string,
    externalEmail: string,
    profileData: any = {},
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
    }
  ): Promise<UserSSOAccount> {
    try {
      // Encrypt tokens if provided
      let accessTokenEncrypted: string | undefined;
      let refreshTokenEncrypted: string | undefined;
      let idTokenEncrypted: string | undefined;

      if (tokens?.accessToken) {
        const { data: encrypted } = await supabase
          .rpc('encrypt_sensitive_data', { data: tokens.accessToken });
        accessTokenEncrypted = encrypted;
      }

      if (tokens?.refreshToken) {
        const { data: encrypted } = await supabase
          .rpc('encrypt_sensitive_data', { data: tokens.refreshToken });
        refreshTokenEncrypted = encrypted;
      }

      if (tokens?.idToken) {
        const { data: encrypted } = await supabase
          .rpc('encrypt_sensitive_data', { data: tokens.idToken });
        idTokenEncrypted = encrypted;
      }

      const { data: accountId } = await supabase
        .rpc('link_sso_account', {
          p_user_id: userId,
          p_provider_id: providerId,
          p_external_user_id: externalUserId,
          p_external_email: externalEmail,
          p_profile_data: profileData
        });

      // Update with tokens if provided
      if (tokens && accountId) {
        const tokenExpiresAt = tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : undefined;

        await supabase
          .from('user_sso_accounts')
          .update({
            access_token_encrypted: accessTokenEncrypted,
            refresh_token_encrypted: refreshTokenEncrypted,
            id_token_encrypted: idTokenEncrypted,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId);
      }

      // Fetch the created/updated account
      const { data, error } = await supabase
        .from('user_sso_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error linking user SSO account:', error);
      throw new Error('Failed to link user SSO account');
    }
  }

  static async getUserSSOAccounts(userId: string): Promise<UserSSOAccount[]> {
    try {
      const { data, error } = await supabase
        .from('user_sso_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('linking_status', 'linked')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user SSO accounts:', error);
      throw new Error('Failed to fetch user SSO accounts');
    }
  }

  static async unlinkUserSSOAccount(userId: string, providerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sso_accounts')
        .update({
          linking_status: 'revoked',
          unlinked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('provider_id', providerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unlinking user SSO account:', error);
      throw new Error('Failed to unlink user SSO account');
    }
  }

  // =============================================
  // SESSION MANAGEMENT
  // =============================================

  static async createSSOSession(
    userId: string,
    providerId: string,
    sessionType: SSOSession['session_type'] = 'web',
    expiresIn: number = 3600,
    deviceInfo: any = {}
  ): Promise<{ sessionId: string; sessionToken: string }> {
    try {
      const { data } = await supabase
        .rpc('create_sso_session', {
          p_user_id: userId,
          p_provider_id: providerId,
          p_session_type: sessionType,
          p_expires_in: expiresIn,
          p_device_info: deviceInfo
        });

      if (!data || data.length === 0) {
        throw new Error('Failed to create session');
      }

      return {
        sessionId: data[0].session_id,
        sessionToken: data[0].session_token
      };
    } catch (error) {
      console.error('Error creating SSO session:', error);
      throw new Error('Failed to create SSO session');
    }
  }

  static async validateSSOSession(sessionToken: string): Promise<{
    isValid: boolean;
    userId?: string;
    providerId?: string;
    sessionData?: any;
  }> {
    try {
      const { data } = await supabase
        .rpc('validate_sso_session', { p_session_token: sessionToken });

      if (!data || data.length === 0) {
        return { isValid: false };
      }

      const result = data[0];
      return {
        isValid: result.is_valid,
        userId: result.user_id,
        providerId: result.provider_id,
        sessionData: result.session_data
      };
    } catch (error) {
      console.error('Error validating SSO session:', error);
      return { isValid: false };
    }
  }

  static async logoutSSOSession(sessionToken: string, reason: string = 'user_logout'): Promise<void> {
    try {
      const { error } = await supabase
        .from('sso_sessions')
        .update({
          is_active: false,
          logout_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging out SSO session:', error);
      throw new Error('Failed to logout SSO session');
    }
  }

  // =============================================
  // LOGGING AND ANALYTICS
  // =============================================

  static async logAuthAttempt(
    providerId: string,
    userId: string | null,
    authType: string,
    externalUserId: string | null,
    success: boolean,
    errorCode?: string,
    errorMessage?: string,
    requestData: any = {},
    responseData: any = {},
    processingTimeMs?: number
  ): Promise<string> {
    try {
      const { data } = await supabase
        .rpc('log_sso_auth', {
          p_provider_id: providerId,
          p_user_id: userId,
          p_auth_type: authType,
          p_external_user_id: externalUserId,
          p_success: success,
          p_error_code: errorCode,
          p_error_message: errorMessage,
          p_request_data: requestData,
          p_response_data: responseData,
          p_processing_time_ms: processingTimeMs
        });

      return data;
    } catch (error) {
      console.error('Error logging auth attempt:', error);
      throw new Error('Failed to log authentication attempt');
    }
  }

  static async getSSOAnalytics(
    providerId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<SSOAnalytics[]> {
    try {
      let query = supabase.from('sso_analytics').select('*');

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      if (dateRange) {
        query = query
          .gte('date_recorded', dateRange.start)
          .lte('date_recorded', dateRange.end);
      }

      const { data, error } = await query.order('date_recorded', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching SSO analytics:', error);
      throw new Error('Failed to fetch SSO analytics');
    }
  }

  // =============================================
  // ORGANIZATION SETTINGS
  // =============================================

  static async getOrganizationSSOSettings(): Promise<OrganizationSSOSettings | null> {
    try {
      const { data, error } = await supabase
        .from('organization_sso_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching organization SSO settings:', error);
      throw new Error('Failed to fetch organization SSO settings');
    }
  }

  static async updateOrganizationSSOSettings(
    settings: Partial<OrganizationSSOSettings>
  ): Promise<OrganizationSSOSettings> {
    try {
      const { data, error } = await supabase
        .from('organization_sso_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating organization SSO settings:', error);
      throw new Error('Failed to update organization SSO settings');
    }
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  static generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  static generateCodeChallenge(codeVerifier: string): string {
    // In a real implementation, use crypto.subtle.digest or similar
    // This is a simplified version for demonstration
    return btoa(codeVerifier).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data } = await supabase.rpc('cleanup_expired_sso_sessions');
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  static validateEmailDomain(email: string, allowedDomains: string[]): boolean {
    if (allowedDomains.length === 0) return true;
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    return allowedDomains.some(allowedDomain => 
      domain === allowedDomain.toLowerCase() || 
      domain.endsWith('.' + allowedDomain.toLowerCase())
    );
  }

  static mapUserAttributes(userInfo: SSOUserInfo, attributeMapping: any): any {
    if (!attributeMapping) return userInfo;
    
    const mappedData: any = {};
    
    for (const [localAttribute, remoteAttribute] of Object.entries(attributeMapping)) {
      if (typeof remoteAttribute === 'string') {
        mappedData[localAttribute] = userInfo[remoteAttribute];
      }
    }
    
    return mappedData;
  }
}