/**
 * MarketingManagementService
 * 
 * Main service class for managing marketing campaigns, leads, content, and analytics.
 * Orchestrates the various marketing management components.
 */

import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { MarketingCampaignRepository } from './MarketingCampaignRepository';
import { LeadManagementService } from './LeadManagementService';
import { ContentManagementService } from './ContentManagementService';
import { MarketingAnalyticsService } from './MarketingAnalyticsService';
import { MarketingValidationService } from './MarketingValidationService';
import {
  MarketingCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MarketingFilters,
  MarketingSortOptions,
  MarketingAnalytics,
  CampaignSearchParams,
  Lead,
  LeadSearchParams,
  ContentCreationRequest,
  MarketingAsset,
  ContentCalendar,
  CompetitorAnalysis,
  MarketingRecommendation,
} from './types';

export class MarketingManagementService {
  private campaignRepository: MarketingCampaignRepository;
  private leadService: LeadManagementService;
  private contentService: ContentManagementService;
  private analyticsService: MarketingAnalyticsService;
  private validationService: MarketingValidationService;

  constructor() {
    this.campaignRepository = new MarketingCampaignRepository();
    this.leadService = new LeadManagementService();
    this.contentService = new ContentManagementService();
    this.analyticsService = new MarketingAnalyticsService();
    this.validationService = new MarketingValidationService();
  }

  /**
   * Create a new marketing campaign
   */
  async createCampaign(request: CreateCampaignRequest): Promise<MarketingCampaign> {
    try {
      // Validate the campaign data
      await this.validationService.validateCreateCampaignRequest(request);

      // Create the campaign
      const campaign = await this.campaignRepository.createCampaign(request);

      // Initialize analytics tracking
      await this.analyticsService.initializeCampaignAnalytics(campaign.id);

      return campaign;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create campaign');
    }
  }

  /**
   * Get campaigns for a contractor with filtering and sorting
   */
  async getCampaigns(
    contractorId: string,
    params?: CampaignSearchParams
  ): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
    try {
      return await this.campaignRepository.getCampaigns(contractorId, params);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch campaigns');
    }
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<MarketingCampaign> {
    try {
      return await this.campaignRepository.getCampaignById(campaignId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch campaign');
    }
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(request: UpdateCampaignRequest): Promise<MarketingCampaign> {
    try {
      // Validate the update request
      await this.validationService.validateUpdateCampaignRequest(request);

      // Update the campaign
      const updatedCampaign = await this.campaignRepository.updateCampaign(request);

      // Update analytics if metrics changed
      if (request.updates.status === 'active' || request.updates.status === 'completed') {
        await this.analyticsService.updateCampaignAnalytics(updatedCampaign.id);
      }

      return updatedCampaign;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update campaign');
    }
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      // Get campaign before deletion for cleanup
      const campaign = await this.campaignRepository.getCampaignById(campaignId);

      // Delete the campaign
      await this.campaignRepository.deleteCampaign(campaignId);

      // Clean up analytics data
      await this.analyticsService.deleteCampaignAnalytics(campaignId);

      // Clean up associated content
      await this.contentService.cleanupCampaignContent(campaignId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to delete campaign');
    }
  }

  /**
   * Get marketing analytics dashboard
   */
  async getMarketingAnalytics(contractorId: string): Promise<MarketingAnalytics> {
    try {
      const campaigns = await this.campaignRepository.getCampaigns(contractorId);
      return await this.analyticsService.generateAnalytics(contractorId, campaigns.campaigns);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch marketing analytics');
    }
  }

  /**
   * Update campaign metrics
   */
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
    try {
      const campaign = await this.campaignRepository.updateCampaignMetrics(campaignId, metricsData);

      // Update analytics
      await this.analyticsService.updateCampaignAnalytics(campaignId);

      return campaign;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update campaign metrics');
    }
  }

  /**
   * Lead Management Methods
   */
  async createLead(leadData: {
    contractorId: string;
    campaignId?: string;
    source: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    serviceInterest: string[];
    urgency: 'low' | 'medium' | 'high';
    notes?: string;
  }): Promise<Lead> {
    try {
      return await this.leadService.createLead(leadData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create lead');
    }
  }

  async getLeads(
    contractorId: string,
    params?: LeadSearchParams
  ): Promise<{ leads: Lead[]; total: number }> {
    try {
      return await this.leadService.getLeads(contractorId, params);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch leads');
    }
  }

  async updateLeadStatus(
    leadId: string,
    status: Lead['status'],
    notes?: string
  ): Promise<Lead> {
    try {
      return await this.leadService.updateLeadStatus(leadId, status, notes);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update lead status');
    }
  }

  /**
   * Content Management Methods
   */
  async createContent(request: ContentCreationRequest): Promise<any> {
    try {
      return await this.contentService.createContent(request);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create content');
    }
  }

  async getMarketingAssets(contractorId: string): Promise<MarketingAsset[]> {
    try {
      return await this.contentService.getMarketingAssets(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch marketing assets');
    }
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
    try {
      return await this.contentService.uploadMarketingAsset(contractorId, assetData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to upload marketing asset');
    }
  }

  async getContentCalendar(contractorId: string): Promise<ContentCalendar[]> {
    try {
      return await this.contentService.getContentCalendar(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch content calendar');
    }
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
    try {
      return await this.contentService.scheduleContent(contractorId, contentData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to schedule content');
    }
  }

  /**
   * Competitor Analysis Methods
   */
  async createCompetitorAnalysis(
    contractorId: string,
    competitorData: {
      competitorName: string;
      website?: string;
      socialMedia: {
        platform: string;
        handle: string;
        followers: number;
        engagementRate: number;
      }[];
      services: string[];
      pricing?: {
        service: string;
        priceRange: [number, number];
      }[];
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    }
  ): Promise<CompetitorAnalysis> {
    try {
      return await this.analyticsService.createCompetitorAnalysis(contractorId, competitorData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create competitor analysis');
    }
  }

  async getCompetitorAnalyses(contractorId: string): Promise<CompetitorAnalysis[]> {
    try {
      return await this.analyticsService.getCompetitorAnalyses(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch competitor analyses');
    }
  }

  /**
   * Marketing Recommendations
   */
  async getMarketingRecommendations(contractorId: string): Promise<MarketingRecommendation[]> {
    try {
      return await this.analyticsService.getMarketingRecommendations(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch marketing recommendations');
    }
  }

  async implementRecommendation(
    recommendationId: string,
    implementationNotes: string
  ): Promise<MarketingRecommendation> {
    try {
      return await this.analyticsService.implementRecommendation(recommendationId, implementationNotes);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to implement recommendation');
    }
  }

  /**
   * Campaign Performance Analysis
   */
  async getCampaignPerformance(campaignId: string): Promise<any> {
    try {
      return await this.analyticsService.getCampaignPerformance(campaignId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch campaign performance');
    }
  }

  /**
   * Budget Optimization
   */
  async optimizeBudget(contractorId: string): Promise<{
    recommendations: string[];
    optimalAllocation: Record<string, number>;
  }> {
    try {
      return await this.analyticsService.optimizeBudget(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to optimize budget');
    }
  }
}
