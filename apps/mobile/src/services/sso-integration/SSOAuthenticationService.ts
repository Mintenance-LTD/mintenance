/**
 * SSOAuthenticationService
 * 
 * Handles SSO authentication flows, token management, and user account linking.
 */

import { supabase } from '../../config/supabase';
import {
  SSOProvider,
  SSOLoginRequest,
  SSOLoginResponse,
  SSOTestResult,
  SSOHealthCheck,
  SSOSecurityAudit,
  UserSSOAccount,
  SSOUserProfile,
  SSOToken,
} from './types';

export class SSOAuthenticationService {
  /**
   * Initiate authentication flow
   */
  async initiateAuthentication(
    provider: SSOProvider,
    request: SSOLoginRequest
  ): Promise<SSOLoginResponse> {
    try {
      const authUrl = this.buildAuthUrl(provider, request);
      
      return {
        success: true,
        redirect_url: authUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to initiate authentication',
        error_description: error.message,
      };
    }
  }

  /**
   * Complete authentication flow
   */
  async completeAuthentication(
    provider: SSOProvider,
    authCode: string,
    state?: string
  ): Promise<SSOLoginResponse> {
    try {
      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, authCode);
      
      // Get user profile from provider
      const userProfile = await this.getUserProfile(provider, tokens.access_token);
      
      // Find or create user account
      const user = await this.findOrCreateUser(provider, userProfile);
      
      // Link account if needed
      if (user) {
        await this.linkUserAccount(user.id, provider.id, userProfile.id, userProfile);
      }

      return {
        success: true,
        user: userProfile,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
        error_description: error.message,
      };
    }
  }

  /**
   * Link user account to SSO provider
   */
  async linkUserAccount(
    userId: string,
    providerId: string,
    externalUserId: string,
    profileData: any
  ): Promise<UserSSOAccount> {
    const { data, error } = await supabase
      .from('user_sso_accounts')
      .insert({
        user_id: userId,
        provider_id: providerId,
        external_user_id: externalUserId,
        external_email: profileData.email,
        external_display_name: profileData.name,
        linking_status: 'linked',
        linked_at: new Date().toISOString(),
        profile_data: profileData,
        permissions: profileData.permissions || [],
        groups: profileData.groups || [],
        login_count: 1,
        last_login_at: new Date().toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Unlink user account from SSO provider
   */
  async unlinkUserAccount(userId: string, providerId: string): Promise<void> {
    const { error } = await supabase
      .from('user_sso_accounts')
      .update({
        linking_status: 'revoked',
        unlinked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider_id', providerId);

    if (error) throw error;
  }

  /**
   * Get user's linked SSO accounts
   */
  async getUserSSOAccounts(userId: string): Promise<UserSSOAccount[]> {
    const { data, error } = await supabase
      .from('user_sso_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('linking_status', 'linked')
      .order('linked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Refresh SSO token
   */
  async refreshToken(
    userId: string,
    providerId: string
  ): Promise<{ access_token: string; expires_in: number }> {
    try {
      // Get user's SSO account
      const { data: ssoAccount, error } = await supabase
        .from('user_sso_accounts')
        .select('refresh_token_encrypted')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .eq('linking_status', 'linked')
        .single();

      if (error || !ssoAccount) {
        throw new Error('No linked account found');
      }

      // Get provider configuration
      const { data: provider, error: providerError } = await supabase
        .from('sso_providers')
        .select('token_url, client_id, client_secret_encrypted')
        .eq('id', providerId)
        .single();

      if (providerError || !provider) {
        throw new Error('Provider not found');
      }

      // Refresh token (simplified implementation)
      const refreshedTokens = await this.refreshAccessToken(provider, ssoAccount.refresh_token_encrypted);

      // Update stored tokens
      await supabase
        .from('user_sso_accounts')
        .update({
          access_token_encrypted: refreshedTokens.access_token,
          token_expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider_id', providerId);

      return refreshedTokens;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Test SSO provider configuration
   */
  async testProvider(
    provider: SSOProvider,
    testType: 'connection' | 'authentication' | 'user_lookup' | 'group_sync'
  ): Promise<SSOTestResult> {
    const startTime = Date.now();
    
    try {
      let success = false;
      let errorMessage: string | undefined;
      let details: any = {};

      switch (testType) {
        case 'connection':
          success = await this.testConnection(provider);
          break;
        case 'authentication':
          success = await this.testAuthentication(provider);
          break;
        case 'user_lookup':
          success = await this.testUserLookup(provider);
          break;
        case 'group_sync':
          success = await this.testGroupSync(provider);
          break;
      }

      if (!success) {
        errorMessage = `Test failed for ${testType}`;
      }

      return {
        provider_id: provider.id,
        test_type: testType,
        success,
        error_message: errorMessage,
        response_time_ms: Date.now() - startTime,
        details,
        tested_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider_id: provider.id,
        test_type: testType,
        success: false,
        error_message: error.message,
        response_time_ms: Date.now() - startTime,
        details: {},
        tested_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Perform health check on SSO provider
   */
  async performHealthCheck(provider: SSOProvider): Promise<SSOHealthCheck> {
    const startTime = Date.now();
    
    try {
      const connectionTest = await this.testConnection(provider);
      const authTest = await this.testAuthentication(provider);
      const userLookupTest = await this.testUserLookup(provider);
      const groupSyncTest = provider.protocol === 'ldap' ? await this.testGroupSync(provider) : true;

      const allTestsPassed = connectionTest && authTest && userLookupTest && groupSyncTest;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (allTestsPassed) {
        status = 'healthy';
      } else if (connectionTest && authTest) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        provider_id: provider.id,
        status,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        details: {
          connection: connectionTest,
          authentication: authTest,
          user_lookup: userLookupTest,
          group_sync: groupSyncTest,
        },
      };
    } catch (error) {
      return {
        provider_id: provider.id,
        status: 'unhealthy',
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        details: {
          connection: false,
          authentication: false,
          user_lookup: false,
          group_sync: false,
        },
      };
    }
  }

  /**
   * Perform security audit on SSO provider
   */
  async performSecurityAudit(provider: SSOProvider): Promise<SSOSecurityAudit> {
    const findings = [];
    let overallScore = 100;

    // Check for secure protocols
    if (provider.protocol === 'oauth2' && !provider.authorization_url?.startsWith('https://')) {
      findings.push({
        severity: 'high',
        category: 'configuration',
        description: 'OAuth2 authorization URL is not using HTTPS',
        recommendation: 'Use HTTPS for all OAuth2 endpoints',
        status: 'open',
      });
      overallScore -= 20;
    }

    // Check token lifetime
    if (provider.token_lifetime > 3600) {
      findings.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Token lifetime is too long',
        recommendation: 'Reduce token lifetime to 1 hour or less',
        status: 'open',
      });
      overallScore -= 10;
    }

    // Check email verification
    if (!provider.enforce_email_verification) {
      findings.push({
        severity: 'medium',
        category: 'authentication',
        description: 'Email verification is not enforced',
        recommendation: 'Enable email verification for all SSO logins',
        status: 'open',
      });
      overallScore -= 15;
    }

    const complianceStatus = overallScore >= 80 ? 'compliant' : overallScore >= 60 ? 'requires_review' : 'non_compliant';

    return {
      provider_id: provider.id,
      audit_date: new Date().toISOString(),
      findings,
      overall_score: overallScore,
      compliance_status: complianceStatus,
    };
  }

  /**
   * Build authentication URL
   */
  private buildAuthUrl(provider: SSOProvider, request: SSOLoginRequest): string {
    const params = new URLSearchParams({
      client_id: provider.client_id!,
      redirect_uri: request.redirect_uri,
      response_type: 'code',
      scope: request.scopes?.join(' ') || 'openid profile email',
      state: request.state || this.generateState(),
    });

    if (request.nonce) {
      params.append('nonce', request.nonce);
    }

    // Add custom parameters
    if (request.custom_parameters) {
      Object.entries(request.custom_parameters).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${provider.authorization_url}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: SSOProvider, authCode: string): Promise<SSOToken> {
    // This is a simplified implementation
    // In production, you would make actual HTTP requests to the provider's token endpoint
    
    return {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      id_token: 'mock_id_token',
      token_type: 'Bearer',
      expires_in: provider.token_lifetime,
      issued_at: Date.now(),
      expires_at: Date.now() + (provider.token_lifetime * 1000),
    };
  }

  /**
   * Get user profile from provider
   */
  private async getUserProfile(provider: SSOProvider, accessToken: string): Promise<SSOUserProfile> {
    // This is a simplified implementation
    // In production, you would make actual HTTP requests to the provider's userinfo endpoint
    
    return {
      id: 'mock_user_id',
      email: 'user@example.com',
      name: 'Mock User',
      given_name: 'Mock',
      family_name: 'User',
      email_verified: true,
    };
  }

  /**
   * Find or create user account
   */
  private async findOrCreateUser(provider: SSOProvider, userProfile: SSOUserProfile): Promise<any> {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', userProfile.email)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Create new user if auto_create_users is enabled
    if (provider.auto_create_users) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: userProfile.email,
          first_name: userProfile.given_name,
          last_name: userProfile.family_name,
          email_verified: userProfile.email_verified,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return newUser;
    }

    return null;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(provider: any, refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    // Simplified implementation
    return {
      access_token: 'new_mock_access_token',
      expires_in: provider.token_lifetime || 3600,
    };
  }

  /**
   * Test connection to provider
   */
  private async testConnection(provider: SSOProvider): Promise<boolean> {
    // Simplified implementation - would test actual connectivity
    return true;
  }

  /**
   * Test authentication flow
   */
  private async testAuthentication(provider: SSOProvider): Promise<boolean> {
    // Simplified implementation - would test actual auth flow
    return true;
  }

  /**
   * Test user lookup
   */
  private async testUserLookup(provider: SSOProvider): Promise<boolean> {
    // Simplified implementation - would test actual user lookup
    return true;
  }

  /**
   * Test group sync
   */
  private async testGroupSync(provider: SSOProvider): Promise<boolean> {
    // Simplified implementation - would test actual group sync
    return true;
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
