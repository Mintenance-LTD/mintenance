/**
 * SSOProviderRepository
 * 
 * Handles all database operations for SSO providers, including CRUD operations,
 * configuration management, and test results storage.
 */

import { supabase } from '../../config/supabase';
import {
  SSOProvider,
  CreateSSOProviderRequest,
  UpdateSSOProviderRequest,
  SSOFilterOptions,
  SSOSearchParams,
  SSOTestResult,
} from './types';

export class SSOProviderRepository {
  /**
   * Create a new SSO provider
   */
  async createSSOProvider(request: CreateSSOProviderRequest): Promise<SSOProvider> {
    const { data, error } = await supabase
      .from('sso_providers')
      .insert({
        provider_name: request.provider_name,
        provider_type: request.provider_type,
        protocol: request.protocol,
        status: 'draft',
        is_enabled: false,
        is_default: false,
        client_id: request.config.client_id,
        client_secret_encrypted: request.config.client_secret, // Should be encrypted
        authorization_url: request.config.authorization_url,
        token_url: request.config.token_url,
        userinfo_url: request.config.userinfo_url,
        jwks_url: request.config.jwks_url,
        issuer: request.config.issuer,
        saml_entity_id: request.config.saml_config?.entity_id,
        saml_sso_url: request.config.saml_config?.sso_url,
        saml_sls_url: request.config.saml_config?.sls_url,
        saml_certificate: request.config.saml_config?.certificate,
        saml_private_key_encrypted: request.config.saml_config?.private_key,
        ldap_host: request.config.ldap_config?.host,
        ldap_port: request.config.ldap_config?.port,
        ldap_base_dn: request.config.ldap_config?.base_dn,
        ldap_bind_dn: request.config.ldap_config?.bind_dn,
        ldap_bind_password_encrypted: request.config.ldap_config?.bind_password,
        ldap_user_search_filter: request.config.ldap_config?.user_search_filter,
        ldap_group_search_filter: request.config.ldap_config?.group_search_filter,
        requested_scopes: request.config.requested_scopes,
        user_attributes: request.config.user_attributes,
        group_attributes: request.config.group_attributes,
        display_name: request.display_name,
        description: request.description,
        logo_url: request.logo_url,
        button_color: request.button_color || '#007bff',
        button_text_color: request.button_text_color || '#ffffff',
        enforce_email_verification: request.enforce_email_verification || false,
        auto_create_users: request.auto_create_users || false,
        auto_link_accounts: request.auto_link_accounts || false,
        require_matching_email: request.require_matching_email || false,
        custom_claims: request.config.custom_endpoints,
        token_lifetime: request.token_lifetime || 3600,
        refresh_token_enabled: request.refresh_token_enabled || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get SSO providers with filtering and sorting
   */
  async getSSOProviders(
    contractorId: string,
    params?: SSOSearchParams
  ): Promise<{ providers: SSOProvider[]; total: number }> {
    let query = supabase
      .from('sso_providers')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    // Apply filters
    if (params?.filters) {
      const filters = params.filters;
      
      if (filters.provider_id?.length) {
        query = query.in('id', filters.provider_id);
      }
      
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.protocol?.length) {
        query = query.in('protocol', filters.protocol);
      }
      
      if (filters.is_enabled !== undefined) {
        query = query.eq('is_enabled', filters.is_enabled);
      }
      
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }
    }

    // Apply search query
    if (params?.query) {
      query = query.or(`provider_name.ilike.%${params.query}%,display_name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    // Apply sorting
    if (params?.sort) {
      const { field, direction } = params.sort;
      query = query.order(field, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      providers: data || [],
      total: count || 0,
    };
  }

  /**
   * Get a specific SSO provider by ID
   */
  async getSSOProviderById(providerId: string): Promise<SSOProvider> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing SSO provider
   */
  async updateSSOProvider(request: UpdateSSOProviderRequest): Promise<SSOProvider> {
    const updateData = {
      ...request.updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('sso_providers')
      .update(updateData)
      .eq('id', request.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an SSO provider
   */
  async deleteSSOProvider(providerId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_providers')
      .delete()
      .eq('id', providerId);

    if (error) throw error;
  }

  /**
   * Update provider test results
   */
  async updateProviderTestResults(providerId: string, testResult: SSOTestResult): Promise<void> {
    const { error } = await supabase
      .from('sso_providers')
      .update({
        last_tested_at: testResult.tested_at,
        test_results: testResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (error) throw error;
  }

  /**
   * Set default SSO provider
   */
  async setDefaultProvider(providerId: string): Promise<void> {
    // First, unset all other providers as default
    const { error: unsetError } = await supabase
      .from('sso_providers')
      .update({ is_default: false })
      .neq('id', providerId);

    if (unsetError) throw unsetError;

    // Then set the specified provider as default
    const { error: setError } = await supabase
      .from('sso_providers')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (setError) throw setError;
  }

  /**
   * Get default SSO provider
   */
  async getDefaultProvider(contractorId: string): Promise<SSOProvider | null> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('is_default', true)
      .eq('is_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Get enabled SSO providers
   */
  async getEnabledProviders(contractorId: string): Promise<SSOProvider[]> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('is_enabled', true)
      .order('is_default', { ascending: false })
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update provider status
   */
  async updateProviderStatus(
    providerId: string,
    status: SSOProvider['status']
  ): Promise<SSOProvider> {
    const { data, error } = await supabase
      .from('sso_providers')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get providers by type
   */
  async getProvidersByType(
    contractorId: string,
    providerType: SSOProvider['provider_type']
  ): Promise<SSOProvider[]> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('provider_type', providerType)
      .eq('is_enabled', true)
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get provider statistics
   */
  async getProviderStatistics(contractorId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const { data: providers, error } = await supabase
      .from('sso_providers')
      .select('provider_type, status, is_enabled')
      .eq('contractor_id', contractorId);

    if (error) throw error;

    const stats = {
      total: providers?.length || 0,
      enabled: providers?.filter(p => p.is_enabled).length || 0,
      disabled: providers?.filter(p => !p.is_enabled).length || 0,
      by_type: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    };

    providers?.forEach(provider => {
      stats.by_type[provider.provider_type] = (stats.by_type[provider.provider_type] || 0) + 1;
      stats.by_status[provider.status] = (stats.by_status[provider.status] || 0) + 1;
    });

    return stats;
  }
}
