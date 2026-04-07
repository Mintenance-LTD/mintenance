import { logger } from '@/lib/logger';
import {
  getJobMetrics,
  getResponseMetrics,
} from './contractor-analytics/job-metrics';
import { getFinancialMetrics } from './contractor-analytics/financial-metrics';
import { getRatingMetrics } from './contractor-analytics/rating-metrics';
import { getTrendsData } from './contractor-analytics/trends';
import { getMarketData } from './contractor-analytics/market-data';
import { generatePerformanceInsights } from './contractor-analytics/insights';

export type {
  ContractorAnalytics,
  MonthlyTrend,
  SkillPerformance,
  MarketPosition,
  PerformanceInsight,
} from './contractor-analytics/types';

export { generatePerformanceInsights } from './contractor-analytics/insights';

import type {
  ContractorAnalytics,
  PerformanceInsight,
} from './contractor-analytics/types';

export class ContractorAnalyticsService {
  /**
   * Get comprehensive analytics for a contractor
   */
  static async getContractorAnalytics(
    contractorId: string
  ): Promise<ContractorAnalytics> {
    try {
      const [
        jobMetrics,
        financialMetrics,
        ratingMetrics,
        responseMetrics,
        trendsData,
        marketData,
      ] = await Promise.all([
        getJobMetrics(contractorId),
        getFinancialMetrics(contractorId),
        getRatingMetrics(contractorId),
        getResponseMetrics(contractorId),
        getTrendsData(contractorId),
        getMarketData(contractorId),
      ]);

      return {
        ...jobMetrics,
        ...financialMetrics,
        ...ratingMetrics,
        ...responseMetrics,
        ...trendsData,
        ...marketData,
      };
    } catch (error) {
      logger.error('Failed to load contractor analytics', error);
      throw new Error('Failed to load analytics data');
    }
  }

  /**
   * Generate performance insights and recommendations
   */
  static async getPerformanceInsights(
    contractorId: string
  ): Promise<PerformanceInsight[]> {
    const analytics = await this.getContractorAnalytics(contractorId);
    return generatePerformanceInsights(analytics);
  }
}
