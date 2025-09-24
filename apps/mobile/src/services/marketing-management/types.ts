/**
 * Marketing Management Types
 * 
 * Contains all TypeScript interfaces and types for marketing management functionality.
 */

export interface MarketingCampaign {
  id: string;
  contractorId: string;
  name: string;
  type: 'social_media' | 'email' | 'ppc' | 'seo' | 'print' | 'referral' | 'content';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  targetAudience: TargetAudience;
  objectives: CampaignObjective[];
  channels: MarketingChannel[];
  metrics: CampaignMetrics;
  content: CampaignContent[];
  createdAt: string;
  updatedAt: string;
}

export interface TargetAudience {
  demographics: {
    ageRange: [number, number];
    income: string[];
    location: string[];
    interests: string[];
  };
  behaviors: {
    homeOwnership: boolean;
    previousServices: string[];
    seasonalPatterns: string[];
  };
  size: number;
  reach: number;
}

export interface CampaignObjective {
  type: 'awareness' | 'leads' | 'conversions' | 'engagement' | 'traffic';
  target: number;
  current: number;
  weight: number;
}

export interface MarketingChannel {
  platform: string;
  budget: number;
  spent: number;
  performance: ChannelPerformance;
  content: string[];
  settings: any;
}

export interface ChannelPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  customers: number;
  revenue: number;
  roi: number;
  cac: number;
  ltv: number;
  engagementRate: number;
}

export interface CampaignContent {
  id: string;
  type: 'image' | 'video' | 'text' | 'carousel' | 'story';
  title: string;
  description?: string;
  mediaUrls: string[];
  callToAction: string;
  performance: ContentPerformance;
  createdAt: string;
}

export interface ContentPerformance {
  views: number;
  engagement: number;
  shares: number;
  saves: number;
  clickThrough: number;
  conversionRate: number;
}

export interface Lead {
  id: string;
  contractorId: string;
  campaignId?: string;
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  serviceInterest: string[];
  budget?: number;
  timeline?: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost';
  score: number;
  notes: string;
  tags: string[];
  assignedTo?: string;
  lastContactDate?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSource {
  id: string;
  contractorId: string;
  name: string;
  type: 'website' | 'social_media' | 'referral' | 'advertising' | 'events' | 'cold_outreach';
  url?: string;
  description?: string;
  isActive: boolean;
  conversionRate: number;
  costPerLead: number;
  totalLeads: number;
  createdAt: string;
}

export interface MarketingAsset {
  id: string;
  contractorId: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'template' | 'logo' | 'banner';
  category: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
  tags: string[];
  usageCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentCalendar {
  id: string;
  contractorId: string;
  title: string;
  description?: string;
  platform: string;
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  content: {
    text?: string;
    images?: string[];
    videos?: string[];
    hashtags?: string[];
    mentions?: string[];
  };
  campaignId?: string;
  performance?: {
    reach: number;
    engagement: number;
    clicks: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorAnalysis {
  id: string;
  contractorId: string;
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
  lastAnalyzed: string;
  createdAt: string;
}

export interface MarketingAnalytics {
  contractorId: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpent: number;
    totalLeads: number;
    totalConversions: number;
    avgROI: number;
    avgCAC: number;
    avgLTV: number;
  };
  channelPerformance: {
    platform: string;
    spent: number;
    leads: number;
    conversions: number;
    roi: number;
    cac: number;
  }[];
  trends: {
    spend: number[];
    leads: number[];
    conversions: number[];
    roi: number[];
  };
  topPerformingCampaigns: MarketingCampaign[];
  topPerformingContent: CampaignContent[];
  lastCalculated: string;
}

export interface MarketingFilters {
  type?: MarketingCampaign['type'][];
  status?: MarketingCampaign['status'][];
  platform?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  budgetRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface MarketingSortOptions {
  field: 'name' | 'status' | 'budget' | 'spent' | 'roi' | 'createdAt' | 'startDate';
  direction: 'asc' | 'desc';
}

export interface CreateCampaignRequest {
  contractorId: string;
  name: string;
  type: MarketingCampaign['type'];
  budget: number;
  startDate: string;
  endDate?: string;
  targetAudience: TargetAudience;
  objectives: CampaignObjective[];
  channels: Omit<MarketingChannel, 'performance'>[];
  content?: Partial<CampaignContent>[];
}

export interface UpdateCampaignRequest {
  id: string;
  updates: Partial<Pick<MarketingCampaign, 'name' | 'status' | 'budget' | 'endDate' | 'targetAudience' | 'objectives' | 'channels'>>;
}

export interface CampaignSearchParams {
  query?: string;
  filters?: MarketingFilters;
  sort?: MarketingSortOptions;
  page?: number;
  limit?: number;
}

export interface LeadSearchParams {
  query?: string;
  status?: Lead['status'][];
  source?: string[];
  urgency?: Lead['urgency'][];
  assignedTo?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
  page?: number;
  limit?: number;
}

export interface ContentCreationRequest {
  contractorId: string;
  campaignId?: string;
  type: CampaignContent['type'];
  title: string;
  description?: string;
  mediaUrls: string[];
  callToAction: string;
  platforms: string[];
  scheduledDate?: string;
}

export interface MarketingRecommendation {
  id: string;
  contractorId: string;
  type: 'campaign_optimization' | 'budget_allocation' | 'content_improvement' | 'audience_expansion' | 'competitor_response';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedROI: number;
  actionItems: string[];
  isImplemented: boolean;
  implementedAt?: string;
  createdAt: string;
}
