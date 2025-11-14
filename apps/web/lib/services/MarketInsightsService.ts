import { logger } from '@/lib/logger';
import { serverSupabase } from '@/lib/api/supabaseServer';

export interface PricingTrend {
  month: string;
  year: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  jobCount: number;
  change: number; // percentage change from previous month
}

export interface DemandForecast {
  month: string;
  year: number;
  predictedDemand: number; // score 0-100
  confidence: number; // 0-100
  serviceType?: string;
  location?: string;
}

export interface MarketAnalysis {
  averageMarketRate: number;
  yourAverageRate: number;
  marketPosition: 'above_average' | 'average' | 'below_average';
  competitorCount: number;
  marketShare: number; // percentage
  pricingRecommendation: {
    suggestedRate: number;
    reasoning: string;
  };
}

export interface SeasonalTrend {
  month: string;
  demandScore: number; // 0-100
  optimalPricing: number;
  jobVolume: number;
}

export interface MarketInsights {
  pricingTrends: PricingTrend[];
  demandForecast: DemandForecast[];
  marketAnalysis: MarketAnalysis;
  seasonalTrends: SeasonalTrend[];
  serviceTypeInsights: {
    serviceType: string;
    averagePrice: number;
    demandLevel: 'high' | 'medium' | 'low';
    growthRate: number;
  }[];
}

export class MarketInsightsService {
  /**
   * Get comprehensive market insights for a contractor
   */
  static async getMarketInsights(
    contractorId: string,
    location?: string,
    serviceTypes?: string[]
  ): Promise<MarketInsights> {
    try {
      // Get contractor's location and service types if not provided
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('city, country')
        .eq('id', contractorId)
        .single();

      const contractorLocation = location || `${contractor?.city || ''}, ${contractor?.country || 'UK'}`;

      // Get contractor's skills if service types not provided
      if (!serviceTypes || serviceTypes.length === 0) {
        const { data: skills } = await serverSupabase
          .from('contractor_skills')
          .select('skill_name')
          .eq('contractor_id', contractorId);
        serviceTypes = (skills || []).map((s: { skill_name: string }) => s.skill_name);
      }

      const [pricingTrends, demandForecast, marketAnalysis, seasonalTrends, serviceTypeInsights] =
        await Promise.all([
          this.getPricingTrends(contractorId, contractorLocation, serviceTypes),
          this.getDemandForecast(contractorLocation, serviceTypes),
          this.getMarketAnalysis(contractorId, contractorLocation, serviceTypes),
          this.getSeasonalTrends(contractorLocation, serviceTypes),
          this.getServiceTypeInsights(contractorLocation, serviceTypes),
        ]);

      return {
        pricingTrends,
        demandForecast,
        marketAnalysis,
        seasonalTrends,
        serviceTypeInsights,
      };
    } catch (error) {
      logger.error('Failed to load market insights', error);
      throw new Error('Failed to load market insights data');
    }
  }

  /**
   * Get pricing trends over the last 12 months
   */
  private static async getPricingTrends(
    contractorId: string,
    location: string,
    serviceTypes: string[]
  ): Promise<PricingTrend[]> {
    const trends: PricingTrend[] = [];
    const now = new Date();

    // Get contractor's historical pricing
    const { data: contractorJobs } = await serverSupabase
      .from('jobs')
      .select('budget, created_at')
      .eq('contractor_id', contractorId)
      .not('budget', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get market-wide pricing data
    const { data: marketJobs } = await serverSupabase
      .from('jobs')
      .select('budget, created_at, location')
      .not('budget', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const startOfMonth = new Date(year, date.getMonth(), 1);
      const endOfMonth = new Date(year, date.getMonth() + 1, 0);

      // Filter jobs for this month
      const monthMarketJobs =
        marketJobs?.filter(
          (job) =>
            new Date(job.created_at) >= startOfMonth &&
            new Date(job.created_at) <= endOfMonth &&
            job.budget
        ) || [];

      const budgets = monthMarketJobs.map((job) => parseFloat(job.budget as string));
      const jobCount = budgets.length;

      if (jobCount > 0) {
        budgets.sort((a, b) => a - b);
        const averagePrice = budgets.reduce((sum, b) => sum + b, 0) / jobCount;
        const minPrice = budgets[0];
        const maxPrice = budgets[budgets.length - 1];
        const medianPrice = budgets[Math.floor(budgets.length / 2)];

        const previousTrend = trends[trends.length - 1];
        const change = previousTrend
          ? ((averagePrice - previousTrend.averagePrice) / previousTrend.averagePrice) * 100
          : 0;

        trends.push({
          month,
          year,
          averagePrice: Math.round(averagePrice),
          minPrice: Math.round(minPrice),
          maxPrice: Math.round(maxPrice),
          medianPrice: Math.round(medianPrice),
          jobCount,
          change: Math.round(change * 10) / 10,
        });
      }
    }

    return trends;
  }

  /**
   * Get demand forecast for the next 6 months
   */
  private static async getDemandForecast(
    location: string,
    serviceTypes: string[]
  ): Promise<DemandForecast[]> {
    const forecast: DemandForecast[] = [];
    const now = new Date();

    // Get historical job data for pattern analysis
    const { data: historicalJobs } = await serverSupabase
      .from('jobs')
      .select('created_at, status')
      .order('created_at', { ascending: false })
      .limit(1000);

    // Analyze historical patterns by month
    const monthlyPatterns: { [key: string]: number } = {};
    historicalJobs?.forEach((job) => {
      const date = new Date(job.created_at);
      const monthKey = `${date.getMonth()}`;
      monthlyPatterns[monthKey] = (monthlyPatterns[monthKey] || 0) + 1;
    });

    // Generate forecast for next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthKey = `${date.getMonth()}`;

      // Base demand on historical patterns
      const historicalCount = monthlyPatterns[monthKey] || 0;
      const maxCount = Math.max(...Object.values(monthlyPatterns), 100);
      const predictedDemand = Math.min(100, (historicalCount / maxCount) * 100);

      // Add seasonal adjustments
      let seasonalAdjustment = 0;
      if (date.getMonth() >= 2 && date.getMonth() <= 4) {
        // Spring - higher demand
        seasonalAdjustment = 15;
      } else if (date.getMonth() >= 8 && date.getMonth() <= 10) {
        // Autumn - higher demand
        seasonalAdjustment = 10;
      } else if (date.getMonth() === 11 || date.getMonth() === 0) {
        // Winter - lower demand
        seasonalAdjustment = -10;
      }

      const adjustedDemand = Math.min(100, Math.max(0, predictedDemand + seasonalAdjustment));
      const confidence = i <= 3 ? 85 : i <= 6 ? 70 : 60; // Higher confidence for near-term

      forecast.push({
        month,
        year,
        predictedDemand: Math.round(adjustedDemand),
        confidence,
        location,
      });
    }

    return forecast;
  }

  /**
   * Get market analysis comparing contractor to market
   */
  private static async getMarketAnalysis(
    contractorId: string,
    location: string,
    serviceTypes: string[]
  ): Promise<MarketAnalysis> {
    // Get contractor's average pricing
    const { data: contractorJobs } = await serverSupabase
      .from('jobs')
      .select('budget')
      .eq('contractor_id', contractorId)
      .not('budget', 'is', null);

    const contractorBudgets = (contractorJobs || []).map((job) => parseFloat(job.budget as string));
    const yourAverageRate =
      contractorBudgets.length > 0
        ? contractorBudgets.reduce((sum, b) => sum + b, 0) / contractorBudgets.length
        : 0;

    // Get market average pricing
    const { data: marketJobs } = await serverSupabase
      .from('jobs')
      .select('budget')
      .not('budget', 'is', null)
      .limit(500);

    const marketBudgets = (marketJobs || []).map((job) => parseFloat(job.budget as string));
    const averageMarketRate =
      marketBudgets.length > 0
        ? marketBudgets.reduce((sum, b) => sum + b, 0) / marketBudgets.length
        : 0;

    // Count competitors (other contractors in same location/service area)
    const { data: competitors } = await serverSupabase
      .from('users')
      .select('id')
      .eq('role', 'contractor')
      .limit(1000);

    const competitorCount = (competitors || []).length;

    // Calculate market position
    let marketPosition: 'above_average' | 'average' | 'below_average' = 'average';
    if (yourAverageRate > averageMarketRate * 1.1) {
      marketPosition = 'above_average';
    } else if (yourAverageRate < averageMarketRate * 0.9) {
      marketPosition = 'below_average';
    }

    // Calculate market share (simplified - based on job count)
    const { data: contractorJobCount } = await serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractorId);

    const { data: totalJobCount } = await serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true });

    const marketShare =
      totalJobCount && contractorJobCount && totalJobCount > 0
        ? (contractorJobCount / totalJobCount) * 100
        : 0;

    // Generate pricing recommendation
    const suggestedRate =
      marketPosition === 'below_average'
        ? Math.round(averageMarketRate * 0.95)
        : marketPosition === 'above_average'
          ? Math.round(averageMarketRate * 1.05)
          : Math.round(averageMarketRate);

    const reasoning =
      marketPosition === 'below_average'
        ? 'Your rates are below market average. Consider increasing to improve profitability.'
        : marketPosition === 'above_average'
          ? 'Your rates are above market average. Ensure quality matches pricing.'
          : 'Your rates align with market average. Maintain competitive positioning.';

    return {
      averageMarketRate: Math.round(averageMarketRate),
      yourAverageRate: Math.round(yourAverageRate),
      marketPosition,
      competitorCount,
      marketShare: Math.round(marketShare * 100) / 100,
      pricingRecommendation: {
        suggestedRate,
        reasoning,
      },
    };
  }

  /**
   * Get seasonal trends
   */
  private static async getSeasonalTrends(
    location: string,
    serviceTypes: string[]
  ): Promise<SeasonalTrend[]> {
    const trends: SeasonalTrend[] = [];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Get historical job data by month
    const { data: historicalJobs } = await serverSupabase
      .from('jobs')
      .select('created_at, budget')
      .not('budget', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    const monthlyData: { [key: number]: { count: number; totalBudget: number } } = {};
    historicalJobs?.forEach((job) => {
      const date = new Date(job.created_at);
      const month = date.getMonth();
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, totalBudget: 0 };
      }
      monthlyData[month].count++;
      monthlyData[month].totalBudget += parseFloat(job.budget as string);
    });

    months.forEach((month, index) => {
      const data = monthlyData[index] || { count: 0, totalBudget: 0 };
      const avgBudget = data.count > 0 ? data.totalBudget / data.count : 0;

      // Calculate demand score based on historical patterns
      let demandScore = 50; // Base score
      if (index >= 2 && index <= 4) {
        // Spring - higher demand
        demandScore = 75;
      } else if (index >= 8 && index <= 10) {
        // Autumn - higher demand
        demandScore = 70;
      } else if (index === 11 || index === 0) {
        // Winter - lower demand
        demandScore = 40;
      } else if (index >= 5 && index <= 7) {
        // Summer - moderate demand
        demandScore = 60;
      }

      trends.push({
        month,
        demandScore,
        optimalPricing: Math.round(avgBudget || 100),
        jobVolume: data.count,
      });
    });

    return trends;
  }

  /**
   * Get insights by service type
   */
  private static async getServiceTypeInsights(
    location: string,
    serviceTypes: string[]
  ): Promise<
    {
      serviceType: string;
      averagePrice: number;
      demandLevel: 'high' | 'medium' | 'low';
      growthRate: number;
    }[]
  > {
    const insights: {
      serviceType: string;
      averagePrice: number;
      demandLevel: 'high' | 'medium' | 'low';
      growthRate: number;
    }[] = [];

    // Get jobs by service type (using job descriptions/categories)
    for (const serviceType of serviceTypes.slice(0, 5)) {
      const { data: jobs } = await serverSupabase
        .from('jobs')
        .select('budget, created_at')
        .ilike('description', `%${serviceType}%`)
        .not('budget', 'is', null)
        .limit(100);

      const budgets = (jobs || []).map((job) => parseFloat(job.budget as string));
      const averagePrice =
        budgets.length > 0 ? budgets.reduce((sum, b) => sum + b, 0) / budgets.length : 0;

      // Determine demand level
      let demandLevel: 'high' | 'medium' | 'low' = 'medium';
      if (budgets.length > 20) {
        demandLevel = 'high';
      } else if (budgets.length < 5) {
        demandLevel = 'low';
      }

      // Calculate growth rate (simplified)
      const recentJobs = jobs?.filter(
        (job) => new Date(job.created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      ).length || 0;
      const olderJobs = (jobs?.length || 0) - recentJobs;
      const growthRate = olderJobs > 0 ? ((recentJobs - olderJobs) / olderJobs) * 100 : 0;

      insights.push({
        serviceType,
        averagePrice: Math.round(averagePrice),
        demandLevel,
        growthRate: Math.round(growthRate * 10) / 10,
      });
    }

    return insights;
  }
}

