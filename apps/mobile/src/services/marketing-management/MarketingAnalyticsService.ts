/**
 * MarketingAnalyticsService
 * 
 * Handles analytics calculations and performance metrics for marketing campaigns.
 */

import { supabase } from '../../config/supabase';
import { MarketingCampaign, MarketingAnalytics, CompetitorAnalysis, MarketingRecommendation } from './types';

export class MarketingAnalyticsService {
  async initializeCampaignAnalytics(campaignId: string): Promise<void> {
    const analyticsData: MarketingAnalytics = {
      contractorId: '', // Will be set when generating analytics
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      summary: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalSpent: 0,
        totalLeads: 0,
        totalConversions: 0,
        avgROI: 0,
        avgCAC: 0,
        avgLTV: 0,
      },
      channelPerformance: [],
      trends: {
        spend: [0],
        leads: [0],
        conversions: [0],
        roi: [0],
      },
      topPerformingCampaigns: [],
      topPerformingContent: [],
      lastCalculated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('marketing_analytics')
      .insert(analyticsData);

    if (error) throw error;
  }

  async updateCampaignAnalytics(campaignId: string): Promise<void> {
    const campaign = await this.getCampaignById(campaignId);
    const contractorId = campaign.contractorId;
    
    const campaigns = await this.getCampaignsForContractor(contractorId);
    const analytics = await this.generateAnalytics(contractorId, campaigns);

    const { error } = await supabase
      .from('marketing_analytics')
      .update({
        ...analytics,
        lastCalculated: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId);

    if (error) throw error;
  }

  async generateAnalytics(contractorId: string, campaigns: MarketingCampaign[]): Promise<MarketingAnalytics> {
    const summary = this.calculateSummary(campaigns);
    const channelPerformance = this.calculateChannelPerformance(campaigns);
    const trends = await this.calculateTrends(contractorId, campaigns);
    const topPerformingCampaigns = this.getTopPerformingCampaigns(campaigns);
    const topPerformingContent = this.getTopPerformingContent(campaigns);

    return {
      contractorId,
      period: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      summary,
      channelPerformance,
      trends,
      topPerformingCampaigns,
      topPerformingContent,
      lastCalculated: new Date().toISOString(),
    };
  }

  async deleteCampaignAnalytics(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_analytics')
      .delete()
      .eq('campaign_id', campaignId);

    if (error) throw error;
  }

  async createCompetitorAnalysis(contractorId: string, competitorData: any): Promise<CompetitorAnalysis> {
    const { data, error } = await supabase
      .from('competitor_analyses')
      .insert({
        contractor_id: contractorId,
        competitor_name: competitorData.competitorName,
        website: competitorData.website,
        social_media: competitorData.socialMedia,
        services: competitorData.services,
        pricing: competitorData.pricing,
        strengths: competitorData.strengths,
        weaknesses: competitorData.weaknesses,
        opportunities: competitorData.opportunities,
        threats: competitorData.threats,
        last_analyzed: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCompetitorAnalyses(contractorId: string): Promise<CompetitorAnalysis[]> {
    const { data, error } = await supabase
      .from('competitor_analyses')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMarketingRecommendations(contractorId: string): Promise<MarketingRecommendation[]> {
    const { data, error } = await supabase
      .from('marketing_recommendations')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('is_implemented', false)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async implementRecommendation(recommendationId: string, implementationNotes: string): Promise<MarketingRecommendation> {
    const { data, error } = await supabase
      .from('marketing_recommendations')
      .update({
        is_implemented: true,
        implemented_at: new Date().toISOString(),
        implementation_notes: implementationNotes,
      })
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCampaignPerformance(campaignId: string): Promise<any> {
    const campaign = await this.getCampaignById(campaignId);
    return {
      campaign,
      performance: campaign.metrics,
      trends: await this.getCampaignTrends(campaignId),
    };
  }

  async optimizeBudget(contractorId: string): Promise<{
    recommendations: string[];
    optimalAllocation: Record<string, number>;
  }> {
    const campaigns = await this.getCampaignsForContractor(contractorId);
    
    const recommendations: string[] = [];
    const optimalAllocation: Record<string, number> = {};

    // Analyze performance by channel
    const channelPerformance = this.calculateChannelPerformance(campaigns);
    
    channelPerformance.forEach(channel => {
      if (channel.roi > 2) {
        recommendations.push(`Increase budget for ${channel.platform} - ROI: ${channel.roi}%`);
        optimalAllocation[channel.platform] = channel.spent * 1.5;
      } else if (channel.roi < 1) {
        recommendations.push(`Reduce budget for ${channel.platform} - ROI: ${channel.roi}%`);
        optimalAllocation[channel.platform] = channel.spent * 0.5;
      } else {
        optimalAllocation[channel.platform] = channel.spent;
      }
    });

    return { recommendations, optimalAllocation };
  }

  private calculateSummary(campaigns: MarketingCampaign[]) {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.metrics.leads, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0);
    
    const avgROI = totalCampaigns > 0 
      ? campaigns.reduce((sum, c) => sum + c.metrics.roi, 0) / totalCampaigns 
      : 0;
    
    const avgCAC = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const avgLTV = totalConversions > 0 
      ? campaigns.reduce((sum, c) => sum + c.metrics.ltv, 0) / totalConversions 
      : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalSpent,
      totalLeads,
      totalConversions,
      avgROI,
      avgCAC,
      avgLTV,
    };
  }

  private calculateChannelPerformance(campaigns: MarketingCampaign[]) {
    const channelMap = new Map<string, any>();

    campaigns.forEach(campaign => {
      campaign.channels.forEach(channel => {
        const existing = channelMap.get(channel.platform) || {
          platform: channel.platform,
          spent: 0,
          leads: 0,
          conversions: 0,
          roi: 0,
          cac: 0,
        };

        existing.spent += channel.spent;
        existing.leads += channel.performance.conversions; // Simplified
        existing.conversions += channel.performance.conversions;
        
        channelMap.set(channel.platform, existing);
      });
    });

    return Array.from(channelMap.values()).map(channel => ({
      ...channel,
      roi: channel.spent > 0 ? ((channel.conversions * 1000 - channel.spent) / channel.spent) * 100 : 0,
      cac: channel.leads > 0 ? channel.spent / channel.leads : 0,
    }));
  }

  private async calculateTrends(contractorId: string, campaigns: MarketingCampaign[]) {
    // Simplified trend calculation
    return {
      spend: campaigns.map(c => c.spent),
      leads: campaigns.map(c => c.metrics.leads),
      conversions: campaigns.map(c => c.metrics.conversions),
      roi: campaigns.map(c => c.metrics.roi),
    };
  }

  private getTopPerformingCampaigns(campaigns: MarketingCampaign[]): MarketingCampaign[] {
    return campaigns
      .filter(c => c.status === 'active' || c.status === 'completed')
      .sort((a, b) => b.metrics.roi - a.metrics.roi)
      .slice(0, 5);
  }

  private getTopPerformingContent(campaigns: MarketingCampaign[]): any[] {
    const allContent = campaigns.flatMap(c => c.content);
    return allContent
      .sort((a, b) => b.performance.engagement - a.performance.engagement)
      .slice(0, 5);
  }

  private async getCampaignTrends(campaignId: string): Promise<any> {
    // This would typically query historical performance data
    return {
      impressions: [0],
      clicks: [0],
      conversions: [0],
    };
  }

  private async getCampaignById(campaignId: string): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getCampaignsForContractor(contractorId: string): Promise<MarketingCampaign[]> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('contractor_id', contractorId);

    if (error) throw error;
    return data || [];
  }
}
