import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

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
        transactionFeeRevenue: parseFloat(result.transaction_fee_revenue || '0'),
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
  static async getRevenueTrends(
    days: number = 30
  ): Promise<RevenueTrend[]> {
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
      const trendsMap = new Map<string, { subscriptionRevenue: number; transactionFeeRevenue: number }>();

      (payments || []).forEach((payment) => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        const revenue = parseFloat(payment.net_revenue || '0');

        if (!trendsMap.has(date)) {
          trendsMap.set(date, { subscriptionRevenue: 0, transactionFeeRevenue: 0 });
        }

        const dayData = trendsMap.get(date)!;
        if (payment.payment_type === 'subscription') {
          dayData.subscriptionRevenue += revenue;
        } else {
          dayData.transactionFeeRevenue += revenue;
        }
      });

      // Convert to array and sort
      const trends: RevenueTrend[] = Array.from(trendsMap.entries()).map(([date, data]) => ({
        date,
        subscriptionRevenue: data.subscriptionRevenue,
        transactionFeeRevenue: data.transactionFeeRevenue,
        totalRevenue: data.subscriptionRevenue + data.transactionFeeRevenue,
      }));

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
        .from('users')
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
      const { data: subscriptions, error: subscriptionsError } = await serverSupabase
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
      const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

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
  ): Promise<Array<{ month: string; revenue: number; fees: number; subscriptions: number }>> {
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
      const monthlyMap = new Map<string, { revenue: number; fees: number; subscriptions: number }>();

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
        } else if (payment.payment_type === 'transaction_fee' || payment.payment_type === 'platform_fee') {
          monthData.fees += revenue;
        } else {
          monthData.revenue += revenue;
        }
      });

      // Fill in missing months and convert to array
      const result: Array<{ month: string; revenue: number; fees: number; subscriptions: number }> = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < months; i++) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = currentDate.toLocaleString('en-GB', { month: 'short' });
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

  /**
   * Get revenue by category breakdown
   */
  static async getRevenueByCategory(): Promise<Array<{ category: string; amount: number; percentage: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months

      const { data: payments, error } = await serverSupabase
        .from('payment_tracking')
        .select('payment_type, net_revenue')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        logger.error('Failed to get revenue by category', error, {
          service: 'RevenueAnalytics',
        });
        return [];
      }

      const categoryMap = new Map<string, number>();

      (payments || []).forEach((payment) => {
        const revenue = parseFloat(payment.net_revenue || '0');
        let category = 'Other';

        if (payment.payment_type === 'job_payment' || payment.payment_type === 'payment') {
          category = 'Job Payments';
        } else if (payment.payment_type === 'transaction_fee' || payment.payment_type === 'platform_fee') {
          category = 'Platform Fees';
        } else if (payment.payment_type === 'subscription') {
          category = 'Subscriptions';
        }

        categoryMap.set(category, (categoryMap.get(category) || 0) + revenue);
      });

      const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

      return Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    } catch (err) {
      logger.error('Error getting revenue by category', err, {
        service: 'RevenueAnalytics',
      });
      return [];
    }
  }

  /**
   * Get revenue by contractor type/trade
   */
  static async getRevenueByContractorType(): Promise<Array<{ type: string; revenue: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months

      // Get payments with contractor information
      const { data: payments, error } = await serverSupabase
        .from('payments')
        .select(`
          amount,
          payee_id,
          contractor:payee_id (
            contractor_profiles (
              specialties
            )
          )
        `)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        logger.error('Failed to get revenue by contractor type', error, {
          service: 'RevenueAnalytics',
        });
        return [];
      }

      const typeMap = new Map<string, number>();

      // Define type for payment with contractor data
      interface PaymentWithContractor {
        amount: string | number;
        payee_id?: string;
        contractor: {
          contractor_profiles?: { specialties?: string[] }[] | { specialties?: string[] };
        }[] | {
          contractor_profiles?: { specialties?: string[] }[] | { specialties?: string[] };
        } | null;
      }

      (payments || []).forEach((payment) => {
        const typedPayment = payment as PaymentWithContractor;
        const revenue = parseFloat(String(typedPayment.amount) || '0');
        const contractorData = Array.isArray(typedPayment.contractor) 
          ? typedPayment.contractor[0] 
          : typedPayment.contractor;
        const profile = Array.isArray(contractorData?.contractor_profiles)
          ? contractorData?.contractor_profiles[0]
          : contractorData?.contractor_profiles;
        const specialties = profile?.specialties || [];

        // Use first specialty or 'General' as fallback
        const type = specialties.length > 0 ? specialties[0] : 'General';

        typeMap.set(type, (typeMap.get(type) || 0) + revenue);
      });

      return Array.from(typeMap.entries())
        .map(([type, revenue]) => ({
          type,
          revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 types
    } catch (err) {
      logger.error('Error getting revenue by contractor type', err, {
        service: 'RevenueAnalytics',
      });
      return [];
    }
  }

  /**
   * Get recent transactions for admin dashboard
   */
  static async getRecentTransactions(limit: number = 50): Promise<Array<{
    id: string;
    date: string;
    type: string;
    amount: number;
    fee: number;
    net: number;
    contractor: string;
    homeowner: string;
    jobTitle: string;
    status: string;
  }>> {
    try {
      const { data: payments, error } = await serverSupabase
        .from('payments')
        .select(`
          id,
          amount,
          created_at,
          status,
          payer_id,
          payee_id,
          job_id,
          payer:payer_id (
            first_name,
            last_name,
            email
          ),
          payee:payee_id (
            first_name,
            last_name,
            email,
            company_name
          ),
          job:job_id (
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get recent transactions', error, {
          service: 'RevenueAnalytics',
        });
        return [];
      }

      // Define type for transaction payment data
      interface TransactionPayment {
        id: string;
        amount: string | number;
        created_at: string;
        status: string;
        payer: { first_name?: string; last_name?: string; email?: string } | Array<{ first_name?: string; last_name?: string; email?: string }> | null;
        payee: { first_name?: string; last_name?: string; email?: string; company_name?: string } | Array<{ first_name?: string; last_name?: string; email?: string; company_name?: string }> | null;
        job: { title?: string } | Array<{ title?: string }> | null;
      }

      return (payments || []).map((payment: TransactionPayment) => {
        const payer = Array.isArray(payment.payer) ? payment.payer[0] : payment.payer;
        const payee = Array.isArray(payment.payee) ? payment.payee[0] : payment.payee;
        const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;

        const amount = parseFloat(String(payment.amount) || '0');
        const fee = amount * 0.15; // 15% platform fee (adjust based on your fee structure)
        const net = amount - fee;

        return {
          id: payment.id,
          date: new Date(payment.created_at).toISOString().split('T')[0],
          type: 'job_payment', // Could be determined from payment metadata
          amount,
          fee,
          net,
          contractor: payee?.company_name || `${payee?.first_name || ''} ${payee?.last_name || ''}`.trim() || payee?.email || 'Unknown',
          homeowner: `${payer?.first_name || ''} ${payer?.last_name || ''}`.trim() || payer?.email || 'Unknown',
          jobTitle: job?.title || 'N/A',
          status: payment.status,
        };
      });
    } catch (err) {
      logger.error('Error getting recent transactions', err, {
        service: 'RevenueAnalytics',
      });
      return [];
    }
  }
}

