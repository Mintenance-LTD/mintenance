/**
 * SSOIntegrationService
 * 
 * Main service class for managing SSO providers, authentication flows,
 * and user account linking. Orchestrates the various SSO components.
 */

import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { SSOProviderRepository } from './SSOProviderRepository';
import { SSOAuthenticationService } from './SSOAuthenticationService';
import { SSOSessionService } from './SSOSessionService';
import { SSOAnalyticsService } from './SSOAnalyticsService';
import { SSOValidationService } from './SSOValidationService';
import {
  SSOProvider,
  CreateSSOProviderRequest,
  UpdateSSOProviderRequest,
  SSOFilterOptions,
  SSOSortOptions,
  SSOAnalytics,
  SSOSearchParams,
  SSOLoginRequest,
  SSOLoginResponse,
  SSOTestResult,
  SSOHealthCheck,
  SSOSecurityAudit,
  UserSSOAccount,
  SSOSession,
} from './types';

export class SSOIntegrationService {
  private providerRepository: SSOProviderRepository;
  private authService: SSOAuthenticationService;
  private sessionService: SSOSessionService;
  private analyticsService: SSOAnalyticsService;
  private validationService: SSOValidationService;

  constructor() {
    this.providerRepository = new SSOProviderRepository();
    this.authService = new SSOAuthenticationService();
    this.sessionService = new SSOSessionService();
    this.analyticsService = new SSOAnalyticsService();
    this.validationService = new SSOValidationService();
  }

  /**
   * Create a new SSO provider
   */
  async createSSOProvider(request: CreateSSOProviderRequest): Promise<SSOProvider> {
    try {
      // Validate the provider configuration
      await this.validationService.validateCreateSSOProviderRequest(request);

      // Create the provider
      const provider = await this.providerRepository.createSSOProvider(request);

      // Initialize analytics tracking
      await this.analyticsService.initializeProviderAnalytics(provider.id);

      // Perform initial health check
      await this.performHealthCheck(provider.id);

      return provider;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create SSO provider');
    }
  }

  /**
   * Get SSO providers with filtering and sorting
   */
  async getSSOProviders(
    contractorId: string,
    params?: SSOSearchParams
  ): Promise<{ providers: SSOProvider[]; total: number }> {
    try {
      return await this.providerRepository.getSSOProviders(contractorId, params);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch SSO providers');
    }
  }

  /**
   * Get a specific SSO provider by ID
   */
  async getSSOProviderById(providerId: string): Promise<SSOProvider> {
    try {
      return await this.providerRepository.getSSOProviderById(providerId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch SSO provider');
    }
  }

  /**
   * Update an existing SSO provider
   */
  async updateSSOProvider(request: UpdateSSOProviderRequest): Promise<SSOProvider> {
    try {
      // Validate the update request
      await this.validationService.validateUpdateSSOProviderRequest(request);

      // Update the provider
      const updatedProvider = await this.providerRepository.updateSSOProvider(request);

      // Update analytics if status changed
      if (request.updates.is_enabled !== undefined) {
        await this.analyticsService.updateProviderAnalytics(updatedProvider.id);
      }

      return updatedProvider;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update SSO provider');
    }
  }

  /**
   * Delete an SSO provider
   */
  async deleteSSOProvider(providerId: string): Promise<void> {
    try {
      // Get provider before deletion for cleanup
      const provider = await this.providerRepository.getSSOProviderById(providerId);

      // Delete the provider
      await this.providerRepository.deleteSSOProvider(providerId);

      // Clean up analytics data
      await this.analyticsService.deleteProviderAnalytics(providerId);

      // Clean up associated sessions
      await this.sessionService.cleanupProviderSessions(providerId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to delete SSO provider');
    }
  }

  /**
   * Initiate SSO login flow
   */
  async initiateSSOLogin(request: SSOLoginRequest): Promise<SSOLoginResponse> {
    try {
      // Validate the login request
      await this.validationService.validateSSOLoginRequest(request);

      // Get provider configuration
      const provider = await this.providerRepository.getSSOProviderById(request.provider_id);

      // Initiate authentication flow
      const authResponse = await this.authService.initiateAuthentication(provider, request);

      return authResponse;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to initiate SSO login');
    }
  }

  /**
   * Complete SSO login flow
   */
  async completeSSOLogin(
    providerId: string,
    authCode: string,
    state?: string
  ): Promise<SSOLoginResponse> {
    try {
      // Get provider configuration
      const provider = await this.providerRepository.getSSOProviderById(providerId);

      // Complete authentication flow
      const authResponse = await this.authService.completeAuthentication(provider, authCode, state);

      if (authResponse.success && authResponse.user) {
        // Create session
        await this.sessionService.createSession(authResponse.user.id, providerId);

        // Update analytics
        await this.analyticsService.recordLoginEvent(providerId, authResponse.user.id, true);
      } else {
        // Record failed login
        await this.analyticsService.recordLoginEvent(providerId, null, false, authResponse.error);
      }

      return authResponse;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to complete SSO login');
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
    try {
      return await this.authService.linkUserAccount(userId, providerId, externalUserId, profileData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to link user account');
    }
  }

  /**
   * Unlink user account from SSO provider
   */
  async unlinkUserAccount(userId: string, providerId: string): Promise<void> {
    try {
      await this.authService.unlinkUserAccount(userId, providerId);

      // Update analytics
      await this.analyticsService.recordUnlinkEvent(providerId, userId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to unlink user account');
    }
  }

  /**
   * Get user's linked SSO accounts
   */
  async getUserSSOAccounts(userId: string): Promise<UserSSOAccount[]> {
    try {
      return await this.authService.getUserSSOAccounts(userId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch user SSO accounts');
    }
  }

  /**
   * Refresh SSO token
   */
  async refreshSSOToken(
    userId: string,
    providerId: string
  ): Promise<{ access_token: string; expires_in: number }> {
    try {
      return await this.authService.refreshToken(userId, providerId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to refresh SSO token');
    }
  }

  /**
   * Test SSO provider configuration
   */
  async testSSOProvider(
    providerId: string,
    testType: 'connection' | 'authentication' | 'user_lookup' | 'group_sync'
  ): Promise<SSOTestResult> {
    try {
      const provider = await this.providerRepository.getSSOProviderById(providerId);
      const testResult = await this.authService.testProvider(provider, testType);

      // Update provider with test results
      await this.providerRepository.updateProviderTestResults(providerId, testResult);

      return testResult;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to test SSO provider');
    }
  }

  /**
   * Perform health check on SSO provider
   */
  async performHealthCheck(providerId: string): Promise<SSOHealthCheck> {
    try {
      const provider = await this.providerRepository.getSSOProviderById(providerId);
      return await this.authService.performHealthCheck(provider);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to perform health check');
    }
  }

  /**
   * Get SSO analytics dashboard
   */
  async getSSOAnalytics(contractorId: string): Promise<SSOAnalytics> {
    try {
      const providers = await this.providerRepository.getSSOProviders(contractorId);
      return await this.analyticsService.generateAnalytics(contractorId, providers.providers);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch SSO analytics');
    }
  }

  /**
   * Get active SSO sessions
   */
  async getActiveSSOSessions(userId?: string): Promise<SSOSession[]> {
    try {
      return await this.sessionService.getActiveSessions(userId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch SSO sessions');
    }
  }

  /**
   * Terminate SSO session
   */
  async terminateSSOSession(sessionId: string): Promise<void> {
    try {
      await this.sessionService.terminateSession(sessionId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to terminate SSO session');
    }
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(userId: string): Promise<void> {
    try {
      await this.sessionService.terminateAllUserSessions(userId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to terminate all user sessions');
    }
  }

  /**
   * Perform security audit on SSO provider
   */
  async performSecurityAudit(providerId: string): Promise<SSOSecurityAudit> {
    try {
      const provider = await this.providerRepository.getSSOProviderById(providerId);
      return await this.authService.performSecurityAudit(provider);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to perform security audit');
    }
  }

  /**
   * Get SSO events/logs
   */
  async getSSOEvents(
    contractorId: string,
    filters?: {
      provider_id?: string;
      event_type?: string[];
      event_status?: string[];
      date_range?: { start: string; end: string };
      page?: number;
      limit?: number;
    }
  ): Promise<{ events: any[]; total: number }> {
    try {
      return await this.analyticsService.getSSOEvents(contractorId, filters);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch SSO events');
    }
  }

  /**
   * Enable/disable SSO provider
   */
  async toggleSSOProviderStatus(providerId: string, enabled: boolean): Promise<SSOProvider> {
    try {
      return await this.providerRepository.updateSSOProvider({
        id: providerId,
        updates: { is_enabled: enabled },
      });
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to toggle SSO provider status');
    }
  }

  /**
   * Set default SSO provider
   */
  async setDefaultSSOProvider(providerId: string): Promise<void> {
    try {
      await this.providerRepository.setDefaultProvider(providerId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to set default SSO provider');
    }
  }
}
