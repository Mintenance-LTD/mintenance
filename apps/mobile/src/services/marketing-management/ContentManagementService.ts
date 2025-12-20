/**
 * ContentManagementService
 * 
 * Handles content creation, management, and scheduling functionality.
 */

import { supabase } from '../../config/supabase';
import { ContentCreationRequest, MarketingAsset, ContentCalendar } from './types';

export class ContentManagementService {
  async createContent(request: ContentCreationRequest): Promise<any> {
    const { data, error } = await supabase
      .from('marketing_content')
      .insert({
        contractor_id: request.contractorId,
        campaign_id: request.campaignId,
        type: request.type,
        title: request.title,
        description: request.description,
        media_urls: request.mediaUrls,
        call_to_action: request.callToAction,
        platforms: request.platforms,
        scheduled_date: request.scheduledDate,
        status: request.scheduledDate ? 'scheduled' : 'draft',
        performance: {
          views: 0,
          engagement: 0,
          shares: 0,
          saves: 0,
          clickThrough: 0,
          conversionRate: 0,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMarketingAssets(contractorId: string): Promise<MarketingAsset[]> {
    const { data, error } = await supabase
      .from('marketing_assets')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async uploadMarketingAsset(
    contractorId: string,
    assetData: {
      name: string;
      type: MarketingAsset['type'];
      category: string;
      fileUrl: string;
      thumbnailUrl?: string;
      fileSize: number;
      dimensions?: { width: number; height: number };
      tags?: string[];
    }
  ): Promise<MarketingAsset> {
    const { data, error } = await supabase
      .from('marketing_assets')
      .insert({
        contractor_id: contractorId,
        name: assetData.name,
        type: assetData.type,
        category: assetData.category,
        file_url: assetData.fileUrl,
        thumbnail_url: assetData.thumbnailUrl,
        file_size: assetData.fileSize,
        dimensions: assetData.dimensions,
        tags: assetData.tags || [],
        usage_count: 0,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getContentCalendar(contractorId: string): Promise<ContentCalendar[]> {
    const { data, error } = await supabase
      .from('content_calendar')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async scheduleContent(
    contractorId: string,
    contentData: {
      title: string;
      platform: string;
      scheduledDate: string;
      content: {
        text?: string;
        images?: string[];
        videos?: string[];
        hashtags?: string[];
        mentions?: string[];
      };
      campaignId?: string;
    }
  ): Promise<ContentCalendar> {
    const { data, error } = await supabase
      .from('content_calendar')
      .insert({
        contractor_id: contractorId,
        title: contentData.title,
        platform: contentData.platform,
        scheduled_date: contentData.scheduledDate,
        status: 'scheduled',
        content: contentData.content,
        campaign_id: contentData.campaignId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cleanupCampaignContent(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_content')
      .delete()
      .eq('campaign_id', campaignId);

    if (error) throw error;
  }
}
