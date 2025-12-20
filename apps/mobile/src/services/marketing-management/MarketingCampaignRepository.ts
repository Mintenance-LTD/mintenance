/**
 * MarketingCampaignRepository
 * 
 * Handles all database operations for marketing campaigns.
 */

import { supabase } from '../../config/supabase';
import {
  MarketingCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MarketingFilters,
  CampaignSearchParams,
} from './types';

export class MarketingCampaignRepository {
  async createCampaign(request: CreateCampaignRequest): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        contractor_id: request.contractorId,
        name: request.name,
        type: request.type,
        status: 'draft',
        budget: request.budget,
        spent: 0,
        start_date: request.startDate,
        end_date: request.endDate,
        target_audience: request.targetAudience,
        objectives: request.objectives,
        channels: request.channels.map(channel => ({
          ...channel,
          performance: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0,
            cpa: 0,
            roas: 0,
          },
        })),
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          leads: 0,
          customers: 0,
          revenue: 0,
          roi: 0,
          cac: 0,
          ltv: 0,
          engagementRate: 0,
        },
        content: request.content || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCampaigns(
    contractorId: string,
    params?: CampaignSearchParams
  ): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
    let query = supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    if (params?.filters) {
      const filters = params.filters;
      
      if (filters.type?.length) {
        query = query.in('type', filters.type);
      }
      
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.platform?.length) {
        query = query.overlaps('channels->platform', filters.platform);
      }
      
      if (filters.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start)
          .lte('start_date', filters.dateRange.end);
      }
      
      if (filters.budgetRange) {
        query = query
          .gte('budget', filters.budgetRange.min)
          .lte('budget', filters.budgetRange.max);
      }
    }

    if (params?.query) {
      query = query.ilike('name', `%${params.query}%`);
    }

    if (params?.sort) {
      const { field, direction } = params.sort;
      query = query.order(field, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      campaigns: data || [],
      total: count || 0,
    };
  }

  async getCampaignById(campaignId: string): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateCampaign(request: UpdateCampaignRequest): Promise<MarketingCampaign> {
    const updateData = {
      ...request.updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update(updateData)
      .eq('id', request.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;
  }

  async updateCampaignMetrics(
    campaignId: string,
    metricsData: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      leads?: number;
      revenue?: number;
    }
  ): Promise<MarketingCampaign> {
    const { data: currentCampaign, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select('metrics')
      .eq('id', campaignId)
      .single();

    if (fetchError) throw fetchError;

    const updatedMetrics = {
      ...currentCampaign.metrics,
      ...metricsData,
    };

    // Calculate derived metrics
    if (metricsData.clicks && metricsData.impressions) {
      updatedMetrics.ctr = (metricsData.clicks / metricsData.impressions) * 100;
    }

    if (metricsData.revenue && metricsData.clicks) {
      updatedMetrics.roi = ((metricsData.revenue - currentCampaign.metrics.cac) / currentCampaign.metrics.cac) * 100;
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({
        metrics: updatedMetrics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
