/**
 * SSOAnalyticsService
 * 
 * Handles analytics calculations and performance metrics for SSO providers.
 */

import { supabase } from '../../config/supabase';
import { SSOProvider, SSOAnalytics } from './types';

export class SSOAnalyticsService {
  /**
   * Initialize analytics tracking for a new provider
   */
  async initializeProviderAnalytics(providerId: string): Promise<void> {
    const analyticsData: SSOAnalytics = {
      contractor_id: '', // Will be set when generating analytics
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      summary: {
        total_logins: 0,
        successful_logins: 0,
        failed_logins: 0,
        unique_users: 0,
        active_providers: 0,
        avg_login_time_ms: 0,
      },
      provider_stats: [],
      trends: {
        logins_by_day: [0],
        success_rate_by_day: [0],
        response_time_by_day: [0],
      },
      top_users: [],
      error_analysis: [],
      last_calculated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('sso_analytics')
      .insert(analyticsData);

    if (error) throw error;
  }

  /**
   * Update analytics for a provider
   */
  async updateProviderAnalytics(providerId: string): Promise<void> {
    const provider = await this.getProviderById(providerId);
    const contractorId = provider.contractor_id;
    
    const providers = await this.getProvidersForContractor(contractorId);
    const analytics = await this.generateAnalytics(contractorId, providers);

    const { error } = await supabase
      .from('sso_analytics')
      .update({
        ...analytics,
        last_calculated: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId);

    if (error) throw error;
  }

  /**
   * Generate comprehensive analytics for a contractor
   */
  async generateAnalytics(contractorId: string, providers: SSOProvider[]): Promise<SSOAnalytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const summary = await this.calculateSummary(contractorId, thirtyDaysAgo);
    const providerStats = await this.calculateProviderStats(contractorId, providers);
    const trends = await this.calculateTrends(contractorId, thirtyDaysAgo);
    const topUsers = await this.getTopUsers(contractorId, thirtyDaysAgo);
    const errorAnalysis = await this.getErrorAnalysis(contractorId, thirtyDaysAgo);

    return {
      contractor_id: contractorId,
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      },
      summary,
      provider_stats: providerStats,
      trends,
      top_users: topUsers,
      error_analysis: errorAnalysis,
      last_calculated: new Date().toISOString(),
    };
  }

  /**
   * Record login event
   */
  async recordLoginEvent(
    providerId: string,
    userId: string | null,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('sso_events')
      .insert({
        provider_id: providerId,
        user_id: userId,
        event_type: 'login',
        event_status: success ? 'success' : 'failure',
        error_message: errorMessage,
        metadata: {
          timestamp: new Date().toISOString(),
          success,
        },
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Record unlink event
   */
  async recordUnlinkEvent(providerId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_events')
      .insert({
        provider_id: providerId,
        user_id: userId,
        event_type: 'account_unlink',
        event_status: 'success',
        metadata: {
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Delete analytics data for a provider
   */
  async deleteProviderAnalytics(providerId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_analytics')
      .delete()
      .eq('provider_id', providerId);

    if (error) throw error;
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
    let query = supabase
      .from('sso_events')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    if (filters?.provider_id) {
      query = query.eq('provider_id', filters.provider_id);
    }

    if (filters?.event_type?.length) {
      query = query.in('event_type', filters.event_type);
    }

    if (filters?.event_status?.length) {
      query = query.in('event_status', filters.event_status);
    }

    if (filters?.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      events: data || [],
      total: count || 0,
    };
  }

  /**
   * Calculate summary statistics
   */
  private async calculateSummary(contractorId: string, since: Date) {
    const { data: events, error } = await supabase
      .from('sso_events')
      .select('event_type, event_status, user_id')
      .eq('contractor_id', contractorId)
      .gte('created_at', since.toISOString());

    if (error) throw error;

    const loginEvents = events?.filter(e => e.event_type === 'login') || [];
    const totalLogins = loginEvents.length;
    const successfulLogins = loginEvents.filter(e => e.event_status === 'success').length;
    const failedLogins = totalLogins - successfulLogins;
    const uniqueUsers = new Set(loginEvents.map(e => e.user_id).filter(Boolean)).size;

    const { data: providers, error: providerError } = await supabase
      .from('sso_providers')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('is_enabled', true);

    if (providerError) throw providerError;

    return {
      total_logins: totalLogins,
      successful_logins: successfulLogins,
      failed_logins: failedLogins,
      unique_users: uniqueUsers,
      active_providers: providers?.length || 0,
      avg_login_time_ms: 0, // Would be calculated from actual timing data
    };
  }

  /**
   * Calculate provider statistics
   */
  private async calculateProviderStats(contractorId: string, providers: SSOProvider[]) {
    const providerStats = [];

    for (const provider of providers) {
      const { data: events, error } = await supabase
        .from('sso_events')
        .select('event_type, event_status')
        .eq('contractor_id', contractorId)
        .eq('provider_id', provider.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) continue;

      const loginEvents = events?.filter(e => e.event_type === 'login') || [];
      const loginCount = loginEvents.length;
      const successCount = loginEvents.filter(e => e.event_status === 'success').length;
      const successRate = loginCount > 0 ? (successCount / loginCount) * 100 : 0;

      providerStats.push({
        provider_id: provider.id,
        provider_name: provider.display_name,
        login_count: loginCount,
        success_rate: successRate,
        avg_response_time_ms: 0, // Would be calculated from actual timing data
        error_count: loginCount - successCount,
      });
    }

    return providerStats;
  }

  /**
   * Calculate trends over time
   */
  private async calculateTrends(contractorId: string, since: Date) {
    // This would typically involve querying historical data
    // For now, we'll return simplified trends
    return {
      logins_by_day: [0],
      success_rate_by_day: [0],
      response_time_by_day: [0],
    };
  }

  /**
   * Get top users by login count
   */
  private async getTopUsers(contractorId: string, since: Date) {
    const { data: events, error } = await supabase
      .from('sso_events')
      .select('user_id, created_at')
      .eq('contractor_id', contractorId)
      .eq('event_type', 'login')
      .eq('event_status', 'success')
      .gte('created_at', since.toISOString());

    if (error) throw error;

    const userLoginCounts = new Map<string, { count: number; lastLogin: string }>();

    events?.forEach(event => {
      if (event.user_id) {
        const existing = userLoginCounts.get(event.user_id) || { count: 0, lastLogin: event.created_at };
        userLoginCounts.set(event.user_id, {
          count: existing.count + 1,
          lastLogin: event.created_at > existing.lastLogin ? event.created_at : existing.lastLogin,
        });
      }
    });

    return Array.from(userLoginCounts.entries())
      .map(([userId, data]) => ({
        user_id: userId,
        login_count: data.count,
        last_login: data.lastLogin,
      }))
      .sort((a, b) => b.login_count - a.login_count)
      .slice(0, 10);
  }

  /**
   * Get error analysis
   */
  private async getErrorAnalysis(contractorId: string, since: Date) {
    const { data: events, error } = await supabase
      .from('sso_events')
      .select('error_message, event_status')
      .eq('contractor_id', contractorId)
      .eq('event_status', 'failure')
      .gte('created_at', since.toISOString());

    if (error) throw error;

    const errorCounts = new Map<string, number>();
    events?.forEach(event => {
      const errorType = event.error_message || 'Unknown error';
      errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
    });

    const totalErrors = events?.length || 0;

    return Array.from(errorCounts.entries()).map(([errorType, count]) => ({
      error_type: errorType,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
    }));
  }

  /**
   * Get provider by ID
   */
  private async getProviderById(providerId: string): Promise<SSOProvider> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get providers for contractor
   */
  private async getProvidersForContractor(contractorId: string): Promise<SSOProvider[]> {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('contractor_id', contractorId);

    if (error) throw error;
    return data || [];
  }
}
