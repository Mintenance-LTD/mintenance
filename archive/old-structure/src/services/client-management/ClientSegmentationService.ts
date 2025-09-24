/**
 * ClientSegmentationService
 * 
 * Handles client segmentation, targeting, and grouping functionality
 * for marketing and communication purposes.
 */

import { supabase } from '../../config/supabase';
import { Client, ClientSegment, SegmentCriteria } from './types';

export class ClientSegmentationService {
  /**
   * Get all client segments for a contractor
   */
  async getClientSegments(contractorId: string): Promise<ClientSegment[]> {
    const { data, error } = await supabase
      .from('client_segments')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new client segment
   */
  async createClientSegment(
    contractorId: string,
    segmentData: {
      name: string;
      description: string;
      criteria: SegmentCriteria;
    }
  ): Promise<ClientSegment> {
    // Calculate initial client count
    const clientCount = await this.calculateSegmentSize(contractorId, segmentData.criteria);
    
    // Calculate average value
    const avgValue = await this.calculateAverageValue(contractorId, segmentData.criteria);

    const { data, error } = await supabase
      .from('client_segments')
      .insert({
        contractor_id: contractorId,
        name: segmentData.name,
        description: segmentData.description,
        criteria: segmentData.criteria,
        client_count: clientCount,
        avg_value: avgValue,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing client segment
   */
  async updateClientSegment(
    segmentId: string,
    updates: {
      name?: string;
      description?: string;
      criteria?: SegmentCriteria;
    }
  ): Promise<ClientSegment> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Recalculate metrics if criteria changed
    if (updates.criteria) {
      const segment = await this.getSegmentById(segmentId);
      updateData.client_count = await this.calculateSegmentSize(segment.contractor_id, updates.criteria);
      updateData.avg_value = await this.calculateAverageValue(segment.contractor_id, updates.criteria);
    }

    const { data, error } = await supabase
      .from('client_segments')
      .update(updateData)
      .eq('id', segmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a client segment
   */
  async deleteClientSegment(segmentId: string): Promise<void> {
    const { error } = await supabase
      .from('client_segments')
      .delete()
      .eq('id', segmentId);

    if (error) throw error;
  }

  /**
   * Get clients in a specific segment
   */
  async getClientsInSegment(segmentId: string): Promise<Client[]> {
    const segment = await this.getSegmentById(segmentId);
    return await this.getClientsMatchingCriteria(segment.contractor_id, segment.criteria);
  }

  /**
   * Update segment metrics (client count, average value)
   */
  async updateSegmentMetrics(segmentId: string): Promise<void> {
    const segment = await this.getSegmentById(segmentId);
    
    const clientCount = await this.calculateSegmentSize(segment.contractor_id, segment.criteria);
    const avgValue = await this.calculateAverageValue(segment.contractor_id, segment.criteria);

    const { error } = await supabase
      .from('client_segments')
      .update({
        client_count: clientCount,
        avg_value: avgValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', segmentId);

    if (error) throw error;
  }

  /**
   * Get suggested segments based on client data
   */
  async getSuggestedSegments(contractorId: string): Promise<SegmentCriteria[]> {
    const clients = await this.getClientsForContractor(contractorId);
    
    const suggestions: SegmentCriteria[] = [];

    // High-value clients
    const highValueClients = clients.filter(c => c.financials.totalSpent > 5000);
    if (highValueClients.length > 0) {
      suggestions.push({
        name: 'High-Value Clients',
        description: 'Clients with total spending over $5,000',
        totalSpentRange: [5000, Infinity],
      });
    }

    // Recent clients
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentClients = clients.filter(c => new Date(c.createdAt) >= thirtyDaysAgo);
    if (recentClients.length > 0) {
      suggestions.push({
        name: 'Recent Clients',
        description: 'Clients acquired in the last 30 days',
        lastJobDateRange: [thirtyDaysAgo.toISOString(), new Date().toISOString()],
      });
    }

    // At-risk clients
    const atRiskClients = clients.filter(c => c.lifecycle.retentionRisk > 0.7);
    if (atRiskClients.length > 0) {
      suggestions.push({
        name: 'At-Risk Clients',
        description: 'Clients with high retention risk',
        lifecycleStage: ['customer', 'repeat_customer'],
      });
    }

    // VIP clients
    const vipClients = clients.filter(c => c.priority === 'vip');
    if (vipClients.length > 0) {
      suggestions.push({
        name: 'VIP Clients',
        description: 'Clients marked as VIP priority',
        priority: ['vip'],
      });
    }

    return suggestions;
  }

  /**
   * Calculate segment size based on criteria
   */
  private async calculateSegmentSize(contractorId: string, criteria: SegmentCriteria): Promise<number> {
    const clients = await this.getClientsMatchingCriteria(contractorId, criteria);
    return clients.length;
  }

  /**
   * Calculate average value for segment
   */
  private async calculateAverageValue(contractorId: string, criteria: SegmentCriteria): Promise<number> {
    const clients = await this.getClientsMatchingCriteria(contractorId, criteria);
    
    if (clients.length === 0) return 0;
    
    const totalValue = clients.reduce((sum, client) => sum + client.financials.totalSpent, 0);
    return totalValue / clients.length;
  }

  /**
   * Get clients matching specific criteria
   */
  private async getClientsMatchingCriteria(contractorId: string, criteria: SegmentCriteria): Promise<Client[]> {
    let query = supabase
      .from('contractor_clients')
      .select('*')
      .eq('contractor_id', contractorId);

    // Apply criteria filters
    if (criteria.status?.length) {
      query = query.in('status', criteria.status);
    }

    if (criteria.priority?.length) {
      query = query.in('priority', criteria.priority);
    }

    if (criteria.type?.length) {
      query = query.in('type', criteria.type);
    }

    if (criteria.tags?.length) {
      query = query.overlaps('tags', criteria.tags);
    }

    if (criteria.lifecycleStage?.length) {
      query = query.in('lifecycle->stage', criteria.lifecycleStage);
    }

    if (criteria.totalSpentRange) {
      query = query
        .gte('financials->totalSpent', criteria.totalSpentRange[0])
        .lte('financials->totalSpent', criteria.totalSpentRange[1]);
    }

    if (criteria.lastJobDateRange) {
      query = query
        .gte('lifecycle->lastJobDate', criteria.lastJobDateRange[0])
        .lte('lifecycle->lastJobDate', criteria.lastJobDateRange[1]);
    }

    if (criteria.location) {
      if (criteria.location.city) {
        query = query.eq('address->city', criteria.location.city);
      }
      if (criteria.location.state) {
        query = query.eq('address->state', criteria.location.state);
      }
      // Note: Radius-based filtering would require more complex geospatial queries
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get segment by ID
   */
  private async getSegmentById(segmentId: string): Promise<ClientSegment> {
    const { data, error } = await supabase
      .from('client_segments')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (error) throw error;
    return data;
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
}
