/**
 * SSOValidationService
 * 
 * Handles validation logic for SSO providers, authentication requests, and configurations.
 */

import {
  CreateSSOProviderRequest,
  UpdateSSOProviderRequest,
  SSOLoginRequest,
  SSOProviderConfig,
} from './types';

export class SSOValidationService {
  /**
   * Validate a create SSO provider request
   */
  async validateCreateSSOProviderRequest(request: CreateSSOProviderRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.provider_name || request.provider_name.trim().length === 0) {
      errors.push('Provider name is required');
    }

    if (!request.provider_type) {
      errors.push('Provider type is required');
    }

    if (!request.protocol) {
      errors.push('Protocol is required');
    }

    if (!request.display_name || request.display_name.trim().length === 0) {
      errors.push('Display name is required');
    }

    if (!request.config) {
      errors.push('Provider configuration is required');
    } else {
      this.validateProviderConfig(request.config, request.protocol, errors);
    }

    // Validate name lengths
    if (request.provider_name && request.provider_name.length > 100) {
      errors.push('Provider name must be 100 characters or less');
    }

    if (request.display_name && request.display_name.length > 100) {
      errors.push('Display name must be 100 characters or less');
    }

    if (request.description && request.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    // Validate token lifetime
    if (request.token_lifetime !== undefined) {
      if (request.token_lifetime < 300) {
        errors.push('Token lifetime must be at least 5 minutes');
      }
      if (request.token_lifetime > 86400) {
        errors.push('Token lifetime cannot exceed 24 hours');
      }
    }

    // Validate button colors
    if (request.button_color && !this.isValidHexColor(request.button_color)) {
      errors.push('Button color must be a valid hex color');
    }

    if (request.button_text_color && !this.isValidHexColor(request.button_text_color)) {
      errors.push('Button text color must be a valid hex color');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate an update SSO provider request
   */
  async validateUpdateSSOProviderRequest(request: UpdateSSOProviderRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Provider ID is required');
    }

    if (!request.updates || Object.keys(request.updates).length === 0) {
      errors.push('At least one field must be updated');
    }

    if (request.updates.display_name !== undefined) {
      if (!request.updates.display_name || request.updates.display_name.trim().length === 0) {
        errors.push('Display name cannot be empty');
      }
      if (request.updates.display_name.length > 100) {
        errors.push('Display name must be 100 characters or less');
      }
    }

    if (request.updates.description !== undefined && request.updates.description) {
      if (request.updates.description.length > 500) {
        errors.push('Description must be 500 characters or less');
      }
    }

    if (request.updates.token_lifetime !== undefined) {
      if (request.updates.token_lifetime < 300) {
        errors.push('Token lifetime must be at least 5 minutes');
      }
      if (request.updates.token_lifetime > 86400) {
        errors.push('Token lifetime cannot exceed 24 hours');
      }
    }

    if (request.updates.button_color !== undefined && request.updates.button_color) {
      if (!this.isValidHexColor(request.updates.button_color)) {
        errors.push('Button color must be a valid hex color');
      }
    }

    if (request.updates.button_text_color !== undefined && request.updates.button_text_color) {
      if (!this.isValidHexColor(request.updates.button_text_color)) {
        errors.push('Button text color must be a valid hex color');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate SSO login request
   */
  async validateSSOLoginRequest(request: SSOLoginRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.provider_id) {
      errors.push('Provider ID is required');
    }

    if (!request.redirect_uri || request.redirect_uri.trim().length === 0) {
      errors.push('Redirect URI is required');
    }

    if (request.redirect_uri && !this.isValidUrl(request.redirect_uri)) {
      errors.push('Redirect URI must be a valid URL');
    }

    if (request.scopes && request.scopes.length > 20) {
      errors.push('Maximum 20 scopes allowed');
    }

    if (request.custom_parameters) {
      const paramKeys = Object.keys(request.custom_parameters);
      if (paramKeys.length > 10) {
        errors.push('Maximum 10 custom parameters allowed');
      }

      paramKeys.forEach(key => {
        if (key.length > 50) {
          errors.push('Custom parameter keys must be 50 characters or less');
        }
        if (request.custom_parameters![key].length > 200) {
          errors.push('Custom parameter values must be 200 characters or less');
        }
      });
    }

    if (request.state && request.state.length > 100) {
      errors.push('State parameter must be 100 characters or less');
    }

    if (request.nonce && request.nonce.length > 100) {
      errors.push('Nonce parameter must be 100 characters or less');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate provider configuration
   */
  validateProviderConfig(config: SSOProviderConfig, protocol: string, errors: string[]): void {
    if (!config.client_id || config.client_id.trim().length === 0) {
      errors.push('Client ID is required');
    }

    if (!config.client_secret || config.client_secret.trim().length === 0) {
      errors.push('Client secret is required');
    }

    if (config.client_id && config.client_id.length > 200) {
      errors.push('Client ID must be 200 characters or less');
    }

    if (config.client_secret && config.client_secret.length > 500) {
      errors.push('Client secret must be 500 characters or less');
    }

    // Protocol-specific validation
    switch (protocol) {
      case 'oauth2':
      case 'openid_connect':
        this.validateOAuth2Config(config, errors);
        break;
      case 'saml2':
        this.validateSAMLConfig(config, errors);
        break;
      case 'ldap':
        this.validateLDAPConfig(config, errors);
        break;
    }

    // Validate scopes
    if (config.requested_scopes) {
      if (config.requested_scopes.length > 20) {
        errors.push('Maximum 20 scopes allowed');
      }
      config.requested_scopes.forEach(scope => {
        if (scope.length > 100) {
          errors.push('Each scope must be 100 characters or less');
        }
      });
    }

    // Validate custom endpoints
    if (config.custom_endpoints) {
      const endpointKeys = Object.keys(config.custom_endpoints);
      if (endpointKeys.length > 10) {
        errors.push('Maximum 10 custom endpoints allowed');
      }
      endpointKeys.forEach(key => {
        if (!this.isValidUrl(config.custom_endpoints![key])) {
          errors.push(`Custom endpoint ${key} must be a valid URL`);
        }
      });
    }
  }

  /**
   * Validate OAuth2/OpenID Connect configuration
   */
  private validateOAuth2Config(config: SSOProviderConfig, errors: string[]): void {
    if (!config.authorization_url) {
      errors.push('Authorization URL is required for OAuth2/OpenID Connect');
    } else if (!this.isValidUrl(config.authorization_url)) {
      errors.push('Authorization URL must be a valid URL');
    }

    if (!config.token_url) {
      errors.push('Token URL is required for OAuth2/OpenID Connect');
    } else if (!this.isValidUrl(config.token_url)) {
      errors.push('Token URL must be a valid URL');
    }

    if (config.userinfo_url && !this.isValidUrl(config.userinfo_url)) {
      errors.push('UserInfo URL must be a valid URL');
    }

    if (config.jwks_url && !this.isValidUrl(config.jwks_url)) {
      errors.push('JWKS URL must be a valid URL');
    }

    if (config.issuer && config.issuer.length > 200) {
      errors.push('Issuer must be 200 characters or less');
    }
  }

  /**
   * Validate SAML configuration
   */
  private validateSAMLConfig(config: SSOProviderConfig, errors: string[]): void {
    if (!config.saml_config) {
      errors.push('SAML configuration is required for SAML2 protocol');
      return;
    }

    const samlConfig = config.saml_config;

    if (!samlConfig.entity_id || samlConfig.entity_id.trim().length === 0) {
      errors.push('SAML Entity ID is required');
    }

    if (!samlConfig.sso_url || samlConfig.sso_url.trim().length === 0) {
      errors.push('SAML SSO URL is required');
    } else if (!this.isValidUrl(samlConfig.sso_url)) {
      errors.push('SAML SSO URL must be a valid URL');
    }

    if (samlConfig.sls_url && !this.isValidUrl(samlConfig.sls_url)) {
      errors.push('SAML SLS URL must be a valid URL');
    }

    if (!samlConfig.certificate || samlConfig.certificate.trim().length === 0) {
      errors.push('SAML Certificate is required');
    }

    if (samlConfig.entity_id && samlConfig.entity_id.length > 200) {
      errors.push('SAML Entity ID must be 200 characters or less');
    }
  }

  /**
   * Validate LDAP configuration
   */
  private validateLDAPConfig(config: SSOProviderConfig, errors: string[]): void {
    if (!config.ldap_config) {
      errors.push('LDAP configuration is required for LDAP protocol');
      return;
    }

    const ldapConfig = config.ldap_config;

    if (!ldapConfig.host || ldapConfig.host.trim().length === 0) {
      errors.push('LDAP Host is required');
    }

    if (!ldapConfig.port || ldapConfig.port < 1 || ldapConfig.port > 65535) {
      errors.push('LDAP Port must be between 1 and 65535');
    }

    if (!ldapConfig.base_dn || ldapConfig.base_dn.trim().length === 0) {
      errors.push('LDAP Base DN is required');
    }

    if (!ldapConfig.bind_dn || ldapConfig.bind_dn.trim().length === 0) {
      errors.push('LDAP Bind DN is required');
    }

    if (!ldapConfig.bind_password || ldapConfig.bind_password.trim().length === 0) {
      errors.push('LDAP Bind Password is required');
    }

    if (!ldapConfig.user_search_filter || ldapConfig.user_search_filter.trim().length === 0) {
      errors.push('LDAP User Search Filter is required');
    }

    if (ldapConfig.host && ldapConfig.host.length > 100) {
      errors.push('LDAP Host must be 100 characters or less');
    }

    if (ldapConfig.base_dn && ldapConfig.base_dn.length > 200) {
      errors.push('LDAP Base DN must be 200 characters or less');
    }

    if (ldapConfig.bind_dn && ldapConfig.bind_dn.length > 200) {
      errors.push('LDAP Bind DN must be 200 characters or less');
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }
}
