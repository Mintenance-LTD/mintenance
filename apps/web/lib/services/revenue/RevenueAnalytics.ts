import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { RevenueBreakdowns } from './RevenueBreakdowns';

export interface RevenueMetrics {
  subscriptionRevenue: number;
  transactionFeeRevenue: number;
  totalRevenue: number;
  subscriptionCount: number;
  transactionCount: number;
}

export interface MRRMetrics {
  totalMRR: number;
  activeSubscriptions: number;
  mrrByPlan: Record<string, { mrr: number; count: number }>;
}

export interface RevenueTrend {
  date: string;
  subscriptionRevenue: number;
  transactionFeeRevenue: number;
  totalRevenue: number;
}

/**
 * Service for revenue analytics and reporting
 */
export class RevenueAnalytics {
  /**
   * Get revenue metrics for a date range
   */
  static async getRevenueMetrics(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<RevenueMetrics | null> {
    try {
      const { data, error } = await serverSupabase.rpc('get_revenue_metrics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) {
        logger.error('Failed to get revenue metrics', error, {
          service: 'RevenueAnalytics',
        });
        return null;
      }

      if (!data || data.length === 0) {
        return {
          subscriptionRevenue: 0,
          transactionFeeRevenue: 0,
          totalRevenue: 0,
          subscriptionCount: 0,
          transactionCount: 0,
        };
      }

      const result = data[0];
      return {
        subscriptionRevenue: parseFloat(result.subscription_revenue || '0'),
        transactionFeeRevenue: parseFloat(
          result.transaction_fee_revenue || '0'
        ),
        totalRevenue: parseFloat(result.total_revenue || '0'),
        subscriptionCount: result.subscription_count || 0,
        transactionCount: result.transaction_count || 0,
      };
    } catch (err) {
      logger.error('Error getting revenue metrics', err, {
        service: 'RevenueAnalytics',
      });
      return null;
    }
  }

  /**
   * Get Monthly Recurring Revenue (MRR)
   */
  static async getMRR(): Promise<MRRMetrics | null> {
    try {
      const { data, error } = await serverSupabase.rpc('calculate_mrr');

      if (error) {
        logger.error('Failed to calculate MRR', error, {
          service: 'RevenueAnalytics',
        });
        return null;
      }

      if (!data || data.length === 0) {
        return {
          totalMRR: 0,
          activeSubscriptions: 0,
          mrrByPlan: {},
        };
      }

      const result = data[0];
      return {
        totalMRR: parseFloat(result.total_mrr || '0'),
        activeSubscriptions: result.active_subscriptions || 0,
        mrrByPlan: result.mrr_by_plan || {},
      };
    } catch (err) {
      logger.error('Error calculating MRR', err, {
        service: 'RevenueAnalytics',
      });
      return null;
    }
  }

  /**
   * Get revenue trends over time
   */
  static async getRevenueTrends(days: number = 30): Promise<RevenueTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily revenue breakdown
      const { data: payments, error } = await serverSupabase
        .from('payment_tracking')
        .select('payment_type, net_revenue, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to get revenue trends', error, {
          service: 'RevenueAnalytics',
        });
        return [];
      }

      // Group by date
      const trendsMap = new Map<
        string,
        { subscriptionRevenue: number; transactionFeeRevenue: number }
      >();

      (payments || []).forEach((payment) => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        const revenue = parseFloat(payment.net_revenue || '0');

        if (!trendsMap.has(date)) {
          trendsMap.set(date, {
            subscriptionRevenue: 0,
            transactionFeeRevenue: 0,
          });
        }

        const dayData = trendsMap.get(date)!;
        if (payment.payment_type === 'subscription') {
          dayData.subscriptionRevenue += revenue;
        } else {
          dayData.transactionFeeRevenue += revenue;
        }
      });

      // Convert to array and sort
      const trends: RevenueTrend[] = Array.from(trendsMap.entries()).map(
        ([date, data]) => ({
          date,
          subscriptionRevenue: data.subscriptionRevenue,
          transactionFeeRevenue: data.transactionFeeRevenue,
          totalRevenue: data.subscriptionRevenue + data.transactionFeeRevenue,
        })
      );

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      logger.error('Error getting revenue trends', err, {
        service: 'RevenueAnalytics',
      });
      return [];
    }
  }

  /**
   * Get trial conversion rate
   */
  static async getTrialConversionRate(): Promise<{
    conversionRate: number;
    totalTrials: number;
    convertedTrials: number;
  }> {
    try {
      // Get total contractors who started trials
      const { data: trials, error: trialsError } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'contractor')
        .not('trial_started_at', 'is', null);

      if (trialsError) {
        logger.error('Failed to get trial data', trialsError, {
          service: 'RevenueAnalytics',
        });
        return { conversionRate: 0, totalTrials: 0, convertedTrials: 0 };
      }

      const totalTrials = trials?.length || 0;

      // Get contractors with active subscriptions
      const { data: subscriptions, error: subscriptionsError } =
        await serverSupabase
          .from('contractor_subscriptions')
          .select('contractor_id')
          .in('status', ['active', 'trial']);

      if (subscriptionsError) {
        logger.error('Failed to get subscription data', subscriptionsError, {
          service: 'RevenueAnalytics',
        });
        return { conversionRate: 0, totalTrials, convertedTrials: 0 };
      }

      const convertedTrials = subscriptions?.length || 0;
      const conversionRate =
        totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

      return {
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalTrials,
        convertedTrials,
      };
    } catch (err) {
      logger.error('Error calculating trial conversion rate', err, {
        service: 'RevenueAnalytics',
      });
      return { conversionRate: 0, totalTrials: 0, convertedTrials: 0 };
    }
  }

  /**
   * Get average revenue per contractor (ARPC)
   */
  static async getARPC(): Promise<number> {
    try {
      const mrr = await this.getMRR();
      if (!mrr || mrr.activeSubscriptions === 0) {
        return 0;
      }

      return mrr.totalMRR / mrr.activeSubscriptions;
    } catch (err) {
      logger.error('Error calculating ARPC', err, {
        service: 'RevenueAnalytics',
      });
      return 0;
    }
  }

  /**
   * Get monthly revenue breakdown (for charts)
   */
  static async getMonthlyRevenue(
    months: number = 12
  ): Promise<
    Array<{
      month: string;
      revenue: number;
      fees: number;
      subscriptions: number;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const { data: payments, error } = await serverSupabase
        .from('payment_tracking')
        .select('payment_type, net_revenue, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to get monthly revenue', error, {
          service: 'RevenueAnalytics',
        });
        return [];
      }

      // Group by month
      const monthlyMap = new Map<
        string,
        { revenue: number; fees: number; subscriptions: number }
      >();

      (payments || []).forEach((payment) => {
        const date = new Date(payment.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleString('en-GB', { month: 'short' });
        const revenue = parseFloat(payment.net_revenue || '0');

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { revenue: 0, fees: 0, subscriptions: 0 });
        }

        const monthData = monthlyMap.get(monthKey)!;
        if (payment.payment_type === 'subscription') {
          monthData.subscriptions += revenue;
        } else if (
          payment.payment_type === 'transaction_fee' ||
          payment.payment_type === 'platform_fee'
        ) {
          monthData.fees += revenue;
        } else {
          monthData.revenue += revenue;
        }
      });

      // Fill in missing months and convert to array
      const result: Array<{
        month: string;
        revenue: number;
        fees: number;
        subscriptions: number;
      }> = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < months; i++) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = currentDate.toLocaleString('en-GB', {
          month: 'short',
        });
        const monthData = monthlyMap.get(monthKey);

        result.push({
          month: monthLabel,
          revenue: monthData?.revenue || 0,
          fees: monthData?.fees || 0,
          subscriptions: monthData?.subscriptions || 0,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return result;
    } catch (err) {
      logger.error('Error getting monthly revenue', err, {
        service: 'RevenueAnalytics',
      });
      return [];
    }
  }

  // Breakdown/reporting queries live in RevenueBreakdowns (split 2026-07-04
  // for the 500-line pre-commit gate); delegated here so callers keep the
  // single RevenueAnalytics entry point.
  static getRevenueByCategory = RevenueBreakdowns.getRevenueByCategory;
  static getRevenueByContractorType =
    RevenueBreakdowns.getRevenueByContractorType;
  static getRecentTransactions = RevenueBreakdowns.getRecentTransactions;
}
