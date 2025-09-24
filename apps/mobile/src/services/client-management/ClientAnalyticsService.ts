/**
 * ClientAnalyticsService
 * 
 * Handles analytics calculations, dashboard generation, and performance metrics
 * for client management.
 */

import { supabase } from '../../config/supabase';
import { Client, ClientAnalytics } from './types';

export class ClientAnalyticsService {
  /**
   * Initialize analytics tracking for a new client
   */
  async initializeClientAnalytics(clientId: string): Promise<void> {
    const analyticsData: ClientAnalytics = {
      contractorId: '', // Will be set when generating analytics
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      summary: {
        totalClients: 0,
        activeClients: 0,
        newClients: 0,
        churnedClients: 0,
        avgClientValue: 0,
        totalRevenue: 0,
        avgSatisfactionScore: 0,
      },
      lifecycle: {
        leads: 0,
        prospects: 0,
        customers: 0,
        repeatCustomers: 0,
        advocates: 0,
      },
      trends: {
        clientGrowth: [0],
        revenueByClient: [0],
        satisfactionTrend: [0],
        churnRate: [0],
      },
      topPerformers: [],
      atRiskClients: [],
      opportunities: [],
      lastCalculated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('client_analytics')
      .insert(analyticsData);

    if (error) throw error;
  }

  /**
   * Update analytics for a client
   */
  async updateClientAnalytics(clientId: string): Promise<void> {
    const client = await this.getClientById(clientId);
    const contractorId = client.contractorId;
    
    const clients = await this.getClientsForContractor(contractorId);
    const analytics = await this.generateAnalytics(contractorId, clients);

    const { error } = await supabase
      .from('client_analytics')
      .update({
        ...analytics,
        lastCalculated: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId);

    if (error) throw error;
  }

  /**
   * Generate comprehensive analytics for a contractor
   */
  async generateAnalytics(contractorId: string, clients: Client[]): Promise<ClientAnalytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const summary = this.calculateSummary(clients, thirtyDaysAgo);
    const lifecycle = this.calculateLifecycleDistribution(clients);
    const trends = await this.calculateTrends(contractorId, clients);
    const topPerformers = this.getTopPerformers(clients);
    const atRiskClients = this.getAtRiskClients(clients);
    const opportunities = this.getClientOpportunities(clients);

    return {
      contractorId,
      period: {
        start: oneYearAgo.toISOString(),
        end: now.toISOString(),
      },
      summary,
      lifecycle,
      trends,
      topPerformers,
      atRiskClients,
      opportunities,
      lastCalculated: new Date().toISOString(),
    };
  }

  /**
   * Get at-risk clients
   */
  async getAtRiskClients(contractorId: string): Promise<Client[]> {
    const clients = await this.getClientsForContractor(contractorId);
    return this.getAtRiskClientsFromList(clients);
  }

  /**
   * Get client opportunities
   */
  async getClientOpportunities(contractorId: string): Promise<Client[]> {
    const clients = await this.getClientsForContractor(contractorId);
    return this.getClientOpportunitiesFromList(clients);
  }

  /**
   * Delete analytics data for a client
   */
  async deleteClientAnalytics(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('client_analytics')
      .delete()
      .eq('client_id', clientId);

    if (error) throw error;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(clients: Client[], thirtyDaysAgo: Date) {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const newClients = clients.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
    const churnedClients = clients.filter(c => c.status === 'former').length;
    
    const totalRevenue = clients.reduce((sum, c) => sum + c.financials.totalSpent, 0);
    const avgClientValue = totalClients > 0 ? totalRevenue / totalClients : 0;
    
    const avgSatisfactionScore = totalClients > 0 
      ? clients.reduce((sum, c) => sum + c.lifecycle.satisfactionScore, 0) / totalClients 
      : 0;

    return {
      totalClients,
      activeClients,
      newClients,
      churnedClients,
      avgClientValue,
      totalRevenue,
      avgSatisfactionScore,
    };
  }

  /**
   * Calculate lifecycle stage distribution
   */
  private calculateLifecycleDistribution(clients: Client[]) {
    return {
      leads: clients.filter(c => c.lifecycle.stage === 'lead').length,
      prospects: clients.filter(c => c.lifecycle.stage === 'prospect').length,
      customers: clients.filter(c => c.lifecycle.stage === 'customer').length,
      repeatCustomers: clients.filter(c => c.lifecycle.stage === 'repeat_customer').length,
      advocates: clients.filter(c => c.lifecycle.stage === 'advocate').length,
    };
  }

  /**
   * Calculate trends over time
   */
  private async calculateTrends(contractorId: string, clients: Client[]) {
    // This would typically involve querying historical data
    // For now, we'll return simplified trends
    return {
      clientGrowth: [clients.length],
      revenueByClient: clients.map(c => c.financials.totalSpent),
      satisfactionTrend: clients.map(c => c.lifecycle.satisfactionScore),
      churnRate: [0], // Would be calculated from historical data
    };
  }

  /**
   * Get top performing clients
   */
  private getTopPerformers(clients: Client[]): Client[] {
    return clients
      .filter(c => c.status === 'active')
      .sort((a, b) => b.financials.totalSpent - a.financials.totalSpent)
      .slice(0, 5);
  }

  /**
   * Get at-risk clients from list
   */
  private getAtRiskClientsFromList(clients: Client[]): Client[] {
    return clients.filter(client => {
      const riskFactors = [
        client.lifecycle.retentionRisk > 0.7,
        client.lifecycle.satisfactionScore < 3,
        client.financials.outstandingBalance > client.financials.totalSpent * 0.5,
        client.status === 'inactive',
      ];
      
      return riskFactors.filter(Boolean).length >= 2;
    });
  }

  /**
   * Get client opportunities from list
   */
  private getClientOpportunitiesFromList(clients: Client[]): Client[] {
    return clients.filter(client => {
      const opportunityFactors = [
        client.lifecycle.stage === 'prospect',
        client.priority === 'high' || client.priority === 'vip',
        client.financials.totalSpent === 0 && client.status === 'active',
        client.lifecycle.satisfactionScore >= 4,
      ];
      
      return opportunityFactors.filter(Boolean).length >= 2;
    });
  }

  /**
   * Get clients for contractor
   */
  private async getClientsForContractor(contractorId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('contractor_clients')
      .select('*')
      .eq('contractor_id', contractorId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Helper method to get client by ID
   */
  private async getClientById(clientId: string): Promise<Client> {
    const { data, error } = await supabase
      .from('contractor_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  }
}
