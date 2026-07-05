import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Revenue breakdown / reporting queries, split out of RevenueAnalytics
 * (2026-07-04, pre-commit 500-line gate). RevenueAnalytics re-exposes these
 * as static delegates so callers are unchanged.
 */
export class RevenueBreakdowns {
  /**
   * Get revenue by category breakdown
   */
  static async getRevenueByCategory(): Promise<
    Array<{ category: string; amount: number; percentage: number }>
  > {
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

        if (
          payment.payment_type === 'job_payment' ||
          payment.payment_type === 'payment'
        ) {
          category = 'Job Payments';
        } else if (
          payment.payment_type === 'transaction_fee' ||
          payment.payment_type === 'platform_fee'
        ) {
          category = 'Platform Fees';
        } else if (payment.payment_type === 'subscription') {
          category = 'Subscriptions';
        }

        categoryMap.set(category, (categoryMap.get(category) || 0) + revenue);
      });

      const total = Array.from(categoryMap.values()).reduce(
        (sum, val) => sum + val,
        0
      );

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
  static async getRevenueByContractorType(): Promise<
    Array<{ type: string; revenue: number }>
  > {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months

      // Get payments with contractor information.
      // 2026-07-04: trade/type comes from canonical `profiles.skills`
      // (text[]); the old nested contractor-profiles(specialties)
      // embed pointed at a retired table that never had that column.
      const { data: payments, error } = await serverSupabase
        .from('payments')
        .select(
          `
          amount,
          payee_id,
          contractor:payee_id (
            skills
          )
        `
        )
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
        contractor: { skills?: string[] }[] | { skills?: string[] } | null;
      }

      (payments || []).forEach((payment) => {
        const typedPayment = payment as unknown as PaymentWithContractor;
        const revenue = parseFloat(String(typedPayment.amount) || '0');
        const contractorData = Array.isArray(typedPayment.contractor)
          ? typedPayment.contractor[0]
          : typedPayment.contractor;
        const skills = contractorData?.skills || [];

        // Use first skill or 'General' as fallback
        const type = skills.length > 0 ? skills[0] : 'General';

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
  static async getRecentTransactions(limit: number = 50): Promise<
    Array<{
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
    }>
  > {
    try {
      const { data: payments, error } = await serverSupabase
        .from('payments')
        .select(
          `
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
        `
        )
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
        payer:
          | { first_name?: string; last_name?: string; email?: string }
          | Array<{ first_name?: string; last_name?: string; email?: string }>
          | null;
        payee:
          | {
              first_name?: string;
              last_name?: string;
              email?: string;
              company_name?: string;
            }
          | Array<{
              first_name?: string;
              last_name?: string;
              email?: string;
              company_name?: string;
            }>
          | null;
        job: { title?: string } | Array<{ title?: string }> | null;
      }

      return (payments || []).map((payment: TransactionPayment) => {
        const payer = Array.isArray(payment.payer)
          ? payment.payer[0]
          : payment.payer;
        const payee = Array.isArray(payment.payee)
          ? payment.payee[0]
          : payment.payee;
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
          contractor:
            payee?.company_name ||
            `${payee?.first_name || ''} ${payee?.last_name || ''}`.trim() ||
            payee?.email ||
            'Unknown',
          homeowner:
            `${payer?.first_name || ''} ${payer?.last_name || ''}`.trim() ||
            payer?.email ||
            'Unknown',
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
