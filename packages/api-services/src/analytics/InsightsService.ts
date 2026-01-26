/**
 * InsightsService
 *
 * Provides AI-powered insights and recommendations based on analytics data.
 * Uses machine learning models for predictions and pattern detection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
export type InsightType =
  | 'trend'
  | 'anomaly'
  | 'prediction'
  | 'recommendation'
  | 'correlation'
  | 'segmentation';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';
interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  data?: unknown;
  metrics?: {
    impact: number; // 0-100
    confidence: number; // 0-100
    relevance: number; // 0-100
  };
  actions?: InsightAction[];
  tags?: string[];
  createdAt: Date;
  expiresAt?: Date;
}
interface InsightAction {
  label: string;
  type: 'link' | 'action' | 'dismiss';
  url?: string;
  action?: string;
}
interface PredictionModel {
  type: 'revenue' | 'churn' | 'demand' | 'pricing';
  accuracy: number;
  lastTrainedAt: Date;
}
interface PatternDetectionResult {
  pattern: string;
  confidence: number;
  instances: unknown[];
  recommendation?: string;
}
export class InsightsService {
  private supabase: SupabaseClient;
  private mlService?: unknown; // ML service for predictions
  private openaiService?: unknown; // OpenAI for natural language insights
  private insightsCache: Map<string, Insight[]> = new Map();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour
  constructor(
    supabase: SupabaseClient,
    mlService?: unknown,
    openaiService?: unknown
  ) {
    this.supabase = supabase;
    this.mlService = mlService;
    this.openaiService = openaiService;
  }
  /**
   * Get insights for a specific role
   */
  async getInsights(
    role: 'admin' | 'contractor' | 'homeowner',
    userId?: string,
    filters?: {
      types?: InsightType[];
      priority?: InsightPriority;
      limit?: number;
    }
  ): Promise<Insight[]> {
    try {
      const cacheKey = `insights:${role}:${userId || 'all'}`;
      // Check cache
      if (this.insightsCache.has(cacheKey)) {
        const cached = this.insightsCache.get(cacheKey);
        if (cached && cached.length > 0) {
          const firstInsight = cached[0];
          if (Date.now() - firstInsight.createdAt.getTime() < this.CACHE_TTL_MS) {
            return this.filterInsights(cached, filters);
          }
        }
      }
      // Generate insights based on role
      let insights: Insight[] = [];
      switch (role) {
        case 'admin':
          insights = await this.generateAdminInsights();
          break;
        case 'contractor':
          insights = await this.generateContractorInsights(userId!);
          break;
        case 'homeowner':
          insights = await this.generateHomeownerInsights(userId!);
          break;
      }
      // Cache insights
      this.insightsCache.set(cacheKey, insights);
      return this.filterInsights(insights, filters);
    } catch (error) {
      logger.error('Error getting insights:', error);
      throw new Error('Failed to get insights');
    }
  }
  /**
   * Generate admin insights
   */
  private async generateAdminInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    // Revenue trend analysis
    const revenueTrend = await this.analyzeRevenueTrend();
    if (revenueTrend) {
      insights.push({
        id: this.generateInsightId(),
        type: 'trend',
        priority: revenueTrend.isPositive ? 'medium' : 'high',
        title: revenueTrend.isPositive ? 'Revenue Growth Detected' : 'Revenue Decline Alert',
        description: `Revenue has ${revenueTrend.isPositive ? 'increased' : 'decreased'} by ${Math.abs(revenueTrend.changePercent)}% over the last 30 days.`,
        data: revenueTrend,
        metrics: {
          impact: Math.min(Math.abs(revenueTrend.changePercent), 100),
          confidence: 85,
          relevance: 90
        },
        actions: [
          {
            label: 'View Revenue Report',
            type: 'link',
            url: '/admin/reports/revenue'
          }
        ],
        tags: ['revenue', 'financial'],
        createdAt: new Date()
      });
    }
    // User churn prediction
    const churnPrediction = await this.predictUserChurn();
    if (churnPrediction.atRiskUsers > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'prediction',
        priority: 'high',
        title: 'User Churn Risk Alert',
        description: `${churnPrediction.atRiskUsers} users are at high risk of churning in the next 30 days.`,
        data: churnPrediction,
        metrics: {
          impact: 70,
          confidence: churnPrediction.confidence,
          relevance: 85
        },
        actions: [
          {
            label: 'View At-Risk Users',
            type: 'link',
            url: '/admin/users/at-risk'
          },
          {
            label: 'Launch Retention Campaign',
            type: 'action',
            action: 'launch_retention_campaign'
          }
        ],
        tags: ['users', 'retention', 'churn'],
        createdAt: new Date()
      });
    }
    // Anomaly detection
    const anomalies = await this.detectAnomalies();
    for (const anomaly of anomalies) {
      insights.push({
        id: this.generateInsightId(),
        type: 'anomaly',
        priority: anomaly.severity === 'critical' ? 'critical' : 'medium',
        title: `Anomaly Detected: ${anomaly.metric}`,
        description: anomaly.description,
        data: anomaly,
        metrics: {
          impact: anomaly.impact,
          confidence: anomaly.confidence,
          relevance: 80
        },
        actions: [
          {
            label: 'Investigate',
            type: 'link',
            url: `/admin/analytics/anomalies/${anomaly.id}`
          }
        ],
        tags: ['anomaly', anomaly.metric],
        createdAt: new Date()
      });
    }
    // Platform recommendations
    const recommendations = await this.generatePlatformRecommendations();
    for (const rec of recommendations) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: rec.priority as InsightPriority,
        title: rec.title,
        description: rec.description,
        data: rec.data,
        metrics: {
          impact: rec.expectedImpact,
          confidence: 75,
          relevance: rec.relevance
        },
        actions: rec.actions,
        tags: rec.tags,
        createdAt: new Date()
      });
    }
    // Demand forecasting
    const demandForecast = await this.forecastDemand();
    insights.push({
      id: this.generateInsightId(),
      type: 'prediction',
      priority: 'medium',
      title: 'Demand Forecast for Next Week',
      description: `Expected ${demandForecast.percentChange > 0 ? 'increase' : 'decrease'} in job postings by ${Math.abs(demandForecast.percentChange)}%.`,
      data: demandForecast,
      metrics: {
        impact: 60,
        confidence: demandForecast.confidence,
        relevance: 75
      },
      actions: [
        {
          label: 'View Forecast Details',
          type: 'link',
          url: '/admin/analytics/forecast'
        }
      ],
      tags: ['forecast', 'demand'],
      createdAt: new Date()
    });
    return insights;
  }
  /**
   * Generate contractor insights
   */
  private async generateContractorInsights(contractorId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    // Performance analysis
    const performance = await this.analyzeContractorPerformance(contractorId);
    if (performance.trend !== 'stable') {
      insights.push({
        id: this.generateInsightId(),
        type: 'trend',
        priority: performance.trend === 'up' ? 'low' : 'medium',
        title: `Your Performance is ${performance.trend === 'up' ? 'Improving' : 'Declining'}`,
        description: `Your average rating has ${performance.trend === 'up' ? 'increased' : 'decreased'} by ${performance.change} stars over the last month.`,
        data: performance,
        metrics: {
          impact: Math.abs(performance.change) * 20,
          confidence: 90,
          relevance: 95
        },
        actions: [
          {
            label: 'View Performance Details',
            type: 'link',
            url: '/contractor/performance'
          }
        ],
        tags: ['performance', 'rating'],
        createdAt: new Date()
      });
    }
    // Bid optimization suggestions
    const bidOptimization = await this.optimizeBidStrategy(contractorId);
    if (bidOptimization.suggestions.length > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: 'medium',
        title: 'Optimize Your Bidding Strategy',
        description: `Adjusting your bid strategy could increase your win rate by ${bidOptimization.expectedImprovement}%.`,
        data: bidOptimization,
        metrics: {
          impact: bidOptimization.expectedImprovement,
          confidence: 70,
          relevance: 85
        },
        actions: [
          {
            label: 'View Suggestions',
            type: 'link',
            url: '/contractor/bid-optimization'
          }
        ],
        tags: ['bidding', 'optimization'],
        createdAt: new Date()
      });
    }
    // Job matching predictions
    const jobMatches = await this.predictJobMatches(contractorId);
    if (jobMatches.highMatchJobs > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'prediction',
        priority: 'high',
        title: `${jobMatches.highMatchJobs} High-Match Jobs Available`,
        description: 'We found jobs that perfectly match your skills and preferences.',
        data: jobMatches,
        metrics: {
          impact: 80,
          confidence: 85,
          relevance: 100
        },
        actions: [
          {
            label: 'View Matched Jobs',
            type: 'link',
            url: '/contractor/matched-jobs'
          }
        ],
        tags: ['jobs', 'matching'],
        createdAt: new Date()
      });
    }
    // Earnings forecast
    const earningsForecast = await this.forecastContractorEarnings(contractorId);
    insights.push({
      id: this.generateInsightId(),
      type: 'prediction',
      priority: 'medium',
      title: 'Projected Earnings This Month',
      description: `Based on current trends, you're on track to earn $${earningsForecast.projected}.`,
      data: earningsForecast,
      metrics: {
        impact: 60,
        confidence: earningsForecast.confidence,
        relevance: 90
      },
      actions: [
        {
          label: 'View Earnings Report',
          type: 'link',
          url: '/contractor/earnings'
        }
      ],
      tags: ['earnings', 'forecast'],
      createdAt: new Date()
    });
    // Skill recommendations
    const skillRecommendations = await this.recommendSkills(contractorId);
    if (skillRecommendations.length > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: 'low',
        title: 'Expand Your Skills',
        description: `Adding "${skillRecommendations[0].skill}" could increase your job opportunities by ${skillRecommendations[0].impact}%.`,
        data: skillRecommendations,
        metrics: {
          impact: skillRecommendations[0].impact,
          confidence: 65,
          relevance: 70
        },
        actions: [
          {
            label: 'Update Skills',
            type: 'link',
            url: '/contractor/profile/skills'
          }
        ],
        tags: ['skills', 'growth'],
        createdAt: new Date()
      });
    }
    return insights;
  }
  /**
   * Generate homeowner insights
   */
  private async generateHomeownerInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    // Maintenance predictions
    const maintenancePredictions = await this.predictMaintenanceNeeds(userId);
    for (const prediction of maintenancePredictions) {
      insights.push({
        id: this.generateInsightId(),
        type: 'prediction',
        priority: prediction.urgency === 'high' ? 'high' : 'medium',
        title: `${prediction.item} Maintenance Due Soon`,
        description: prediction.description,
        data: prediction,
        metrics: {
          impact: prediction.costImpact,
          confidence: prediction.confidence,
          relevance: 95
        },
        actions: [
          {
            label: 'Schedule Maintenance',
            type: 'link',
            url: `/jobs/new?category=${prediction.category}`
          }
        ],
        tags: ['maintenance', prediction.category],
        createdAt: new Date(),
        expiresAt: prediction.dueDate
      });
    }
    // Cost saving opportunities
    const costSavings = await this.identifyCostSavings(userId);
    if (costSavings.totalSavings > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: 'medium',
        title: `Save Up to $${costSavings.totalSavings} This Year`,
        description: 'We found opportunities to reduce your maintenance costs.',
        data: costSavings,
        metrics: {
          impact: Math.min(costSavings.totalSavings / 100, 100),
          confidence: 75,
          relevance: 90
        },
        actions: [
          {
            label: 'View Savings Tips',
            type: 'link',
            url: '/homeowner/savings'
          }
        ],
        tags: ['savings', 'cost'],
        createdAt: new Date()
      });
    }
    // Seasonal recommendations
    const seasonalRecs = await this.getSeasonalRecommendations();
    for (const rec of seasonalRecs) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: 'low',
        title: rec.title,
        description: rec.description,
        data: rec,
        metrics: {
          impact: 40,
          confidence: 80,
          relevance: rec.relevance
        },
        actions: [
          {
            label: 'Learn More',
            type: 'link',
            url: rec.learnMoreUrl
          }
        ],
        tags: ['seasonal', rec.season],
        createdAt: new Date()
      });
    }
    // Contractor recommendations
    const contractorRecs = await this.recommendContractors(userId);
    if (contractorRecs.length > 0) {
      insights.push({
        id: this.generateInsightId(),
        type: 'recommendation',
        priority: 'medium',
        title: 'Recommended Contractors for You',
        description: `Based on your job history, these contractors might be a great fit.`,
        data: contractorRecs,
        metrics: {
          impact: 50,
          confidence: 80,
          relevance: 85
        },
        actions: [
          {
            label: 'View Contractors',
            type: 'link',
            url: '/contractors/recommended'
          }
        ],
        tags: ['contractors', 'matching'],
        createdAt: new Date()
      });
    }
    // Price trends
    const priceTrends = await this.analyzePriceTrends(userId);
    if (priceTrends.significantChange) {
      insights.push({
        id: this.generateInsightId(),
        type: 'trend',
        priority: 'low',
        title: `${priceTrends.category} Prices ${priceTrends.direction}`,
        description: `Average prices for ${priceTrends.category} services have ${priceTrends.direction === 'up' ? 'increased' : 'decreased'} by ${priceTrends.changePercent}%.`,
        data: priceTrends,
        metrics: {
          impact: 30,
          confidence: 85,
          relevance: 70
        },
        actions: [
          {
            label: 'View Price Trends',
            type: 'link',
            url: '/pricing/trends'
          }
        ],
        tags: ['pricing', 'trends'],
        createdAt: new Date()
      });
    }
    return insights;
  }
  // Analytical methods (stubs for actual implementation)
  private async analyzeRevenueTrend(): Promise<unknown> {
    // Implement revenue trend analysis
    return {
      isPositive: true,
      changePercent: 15.5,
      currentRevenue: 125000,
      previousRevenue: 108000
    };
  }
  private async predictUserChurn(): Promise<unknown> {
    // Implement churn prediction
    return {
      atRiskUsers: 42,
      confidence: 78,
      riskFactors: ['low_engagement', 'no_recent_activity']
    };
  }
  private async detectAnomalies(): Promise<any[]> {
    // Implement anomaly detection
    return [];
  }
  private async generatePlatformRecommendations(): Promise<any[]> {
    // Implement platform recommendations
    return [];
  }
  private async forecastDemand(): Promise<unknown> {
    // Implement demand forecasting
    return {
      percentChange: 12,
      confidence: 72,
      categories: ['plumbing', 'electrical']
    };
  }
  private async analyzeContractorPerformance(contractorId: string): Promise<unknown> {
    // Implement contractor performance analysis
    return {
      trend: 'up',
      change: 0.3,
      currentRating: 4.5,
      previousRating: 4.2
    };
  }
  private async optimizeBidStrategy(contractorId: string): Promise<unknown> {
    // Implement bid optimization
    return {
      suggestions: ['Lower bids by 5% for plumbing jobs'],
      expectedImprovement: 15
    };
  }
  private async predictJobMatches(contractorId: string): Promise<unknown> {
    // Implement job matching
    return {
      highMatchJobs: 8,
      mediumMatchJobs: 15,
      categories: ['electrical', 'hvac']
    };
  }
  private async forecastContractorEarnings(contractorId: string): Promise<unknown> {
    // Implement earnings forecast
    return {
      projected: 8500,
      confidence: 75,
      basedOn: 'current_jobs_and_bids'
    };
  }
  private async recommendSkills(contractorId: string): Promise<any[]> {
    // Implement skill recommendations
    return [
      { skill: 'Solar Panel Installation', impact: 25 }
    ];
  }
  private async predictMaintenanceNeeds(userId: string): Promise<any[]> {
    // Implement maintenance predictions
    return [
      {
        item: 'HVAC System',
        category: 'hvac',
        description: 'Annual maintenance recommended based on last service date.',
        urgency: 'medium',
        costImpact: 45,
        confidence: 82,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];
  }
  private async identifyCostSavings(userId: string): Promise<unknown> {
    // Implement cost savings identification
    return {
      totalSavings: 1200,
      opportunities: ['Bundle services', 'Seasonal scheduling']
    };
  }
  private async getSeasonalRecommendations(): Promise<any[]> {
    // Implement seasonal recommendations
    const season = this.getCurrentSeason();
    return [
      {
        title: `Prepare for ${season}`,
        description: `Schedule your ${season} maintenance tasks now.`,
        season,
        relevance: 85,
        learnMoreUrl: `/tips/seasonal/${season}`
      }
    ];
  }
  private async recommendContractors(userId: string): Promise<any[]> {
    // Implement contractor recommendations
    return [];
  }
  private async analyzePriceTrends(userId: string): Promise<unknown> {
    // Implement price trend analysis
    return {
      significantChange: true,
      category: 'Plumbing',
      direction: 'up',
      changePercent: 8
    };
  }
  // Helper methods
  private filterInsights(
    insights: Insight[],
    filters?: {
      types?: InsightType[];
      priority?: InsightPriority;
      limit?: number;
    }
  ): Insight[] {
    let filtered = insights;
    if (filters?.types && filters.types.length > 0) {
      filtered = filtered.filter(i => filters.types!.includes(i.type));
    }
    if (filters?.priority) {
      filtered = filtered.filter(i => i.priority === filters.priority);
    }
    // Sort by priority and relevance
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      const relevanceA = a.metrics?.relevance || 0;
      const relevanceB = b.metrics?.relevance || 0;
      return relevanceB - relevanceA;
    });
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    return filtered;
  }
  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  /**
   * Public wrappers for AnalyticsController
   */
  async getContractorInsights(userId: string, timeRange: string, category: string | null): Promise<Insight[]> {
    return this.getInsights('contractor', userId, { limit: 10 });
  }

  async getPlatformInsights(timeRange: string, category: string | null): Promise<Insight[]> {
    return this.getInsights('admin', undefined, { limit: 10 });
  }

  async getHomeownerInsights(userId: string, timeRange: string): Promise<Insight[]> {
    return this.getInsights('homeowner', userId, { limit: 10 });
  }

  async getFunnelAnalysis(params: Record<string, unknown>): Promise<unknown> {
    return { 
      steps: ['view', 'click', 'convert'], 
      conversionRate: 0.05, 
      dropoff: 0.95 
    };
  }
}