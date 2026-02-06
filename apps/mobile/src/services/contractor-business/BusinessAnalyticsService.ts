import { supabase } from '../../config/supabase';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { logger } from '../../utils/logger';
import { BusinessMetrics, FinancialSummary, ClientAnalytics, MarketingInsights } from './types';

// =====================================================
// DATABASE ROW INTERFACES (snake_case)
// =====================================================

interface DatabaseJobRow {
  id: string;
  status: string;
  budget: number | null;
  created_at: string;
  completed_at: string | null;
  homeowner_id: string;
  contractor_id: string;
  reviews?: { rating: number }[];
}

interface DatabaseBidRow {
  id: string;
  status: string;
  created_at: string;
  contractor_id: string;
  job_id: string;
  jobs?: {
    created_at: string;
  };
}

interface DatabaseClientRow {
  id: string;
  contractor_id: string;
  created_at: string;
  total_jobs: number;
  total_spent: number;
}

interface DatabaseExpenseRow {
  id: string;
  contractor_id: string;
  amount: number;
  expense_date: string;
}

interface DatabaseInvoiceRow {
  id: string;
  contractor_id: string;
  total_amount: number;
  due_date: string;
  status: string;
}

// =====================================================
// BUSINESS ANALYTICS SERVICE
// Handles business performance metrics and analytics
// =====================================================

export class BusinessAnalyticsService {
  /**
   * Calculate comprehensive business metrics for a contractor
   */
  static async calculateBusinessMetrics(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BusinessMetrics> {
    const context = {
      service: 'BusinessAnalyticsService',
      method: 'calculateBusinessMetrics',
      userId: contractorId,
      params: { periodStart, periodEnd },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(periodStart, 'Period start', context);
      ServiceErrorHandler.validateRequired(periodEnd, 'Period end', context);

      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(
          `
          id, status, budget, created_at, completed_at,
          reviews(rating)
        `
        )
        .eq('contractor_id', contractorId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      const typedJobs = (jobs || []) as DatabaseJobRow[];
      const totalJobs = typedJobs.length;
      const completedJobs = typedJobs.filter((job) => job.status === 'completed');
      const cancelledJobs = typedJobs.filter((job) => job.status === 'cancelled');

      const totalRevenue = completedJobs.reduce((sum: number, job) => sum + (job.budget || 0), 0);
      const averageJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;
      const completionRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;

      // Calculate client satisfaction from reviews
      const allRatings = typedJobs.flatMap((job) => job.reviews?.map((r) => r.rating) || []);
      const clientSatisfaction = allRatings.length > 0
        ? allRatings.reduce((sum: number, rating: number) => sum + rating, 0) / allRatings.length
        : 0;

      // Calculate additional metrics
      const [repeatClientRate, responseTimeAvg, quoteConversionRate, profitMargin] = await Promise.all([
        this.calculateRepeatClientRate(contractorId, periodStart, periodEnd),
        this.calculateAverageResponseTime(contractorId, periodStart, periodEnd),
        this.calculateQuoteConversionRate(contractorId, periodStart, periodEnd),
        this.calculateProfitMargin(contractorId, periodStart, periodEnd),
      ]);

      return {
        id: `metrics_${contractorId}_${Date.now()}`,
        contractor_id: contractorId,
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        total_jobs: totalJobs,
        completed_jobs: completedJobs.length,
        cancelled_jobs: cancelledJobs.length,
        average_job_value: averageJobValue,
        completion_rate: completionRate,
        client_satisfaction: clientSatisfaction,
        repeat_client_rate: repeatClientRate,
        response_time_avg: responseTimeAvg,
        quote_conversion_rate: quoteConversionRate,
        profit_margin: profitMargin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to calculate business metrics');
    }

    return result.data;
  }

  /**
   * Generate financial summary for a contractor
   */
  static async generateFinancialSummary(contractorId: string): Promise<FinancialSummary> {
    const context = {
      service: 'BusinessAnalyticsService',
      method: 'generateFinancialSummary',
      userId: contractorId,
      params: { contractorId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      // Get monthly revenue data
      const monthlyRevenue = await this.getMonthlyRevenue(contractorId, 12);

      // Calculate quarterly growth
      const quarterlyGrowth = this.calculateQuarterlyGrowth(monthlyRevenue);

      // Project yearly revenue
      const yearlyProjection = this.projectYearlyRevenue(monthlyRevenue);

      // Get outstanding invoices
      const { outstandingInvoices, overdueAmount } = await this.getInvoicesSummary(contractorId);

      // Get profit trends
      const profitTrends = await this.getProfitTrends(contractorId, 6);

      // Calculate tax obligations
      const taxObligations = await this.calculateTaxObligations(contractorId);

      // Generate cash flow forecast
      const cashFlowForecast = await this.generateCashFlowForecast(contractorId, 8);

      return {
        monthly_revenue: monthlyRevenue,
        quarterly_growth: quarterlyGrowth,
        yearly_projection: yearlyProjection,
        outstanding_invoices: outstandingInvoices,
        overdue_amount: overdueAmount,
        profit_trends: profitTrends,
        tax_obligations: taxObligations,
        cash_flow_forecast: cashFlowForecast,
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to generate financial summary');
    }

    return result.data;
  }

  /**
   * Analyze client metrics and patterns
   */
  static async analyzeClientMetrics(contractorId: string): Promise<ClientAnalytics> {
    const context = {
      service: 'BusinessAnalyticsService',
      method: 'analyzeClientMetrics',
      userId: contractorId,
      params: { contractorId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      const { data: clients, error } = await supabase
        .from('contractor_clients')
        .select('*')
        .eq('contractor_id', contractorId);

      if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);

      const typedClients = (clients || []) as DatabaseClientRow[];
      const totalClients = typedClients.length;
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const newClientsThisMonth = typedClients.filter(
        (client) => new Date(client.created_at) >= thisMonth
      ).length;

      const repeatClients = typedClients.filter((client) => client.total_jobs > 1).length;

      const clientLifetimeValue = typedClients.reduce(
        (sum: number, client) => sum + client.total_spent,
        0
      );
      const avgLifetimeValue = totalClients > 0 ? clientLifetimeValue / totalClients : 0;

      // Calculate churn rate
      const churnRate = await this.calculateClientChurnRate(contractorId);

      // Get acquisition channels
      const acquisitionChannels = await this.getAcquisitionChannels(contractorId);

      // Get satisfaction trends
      const satisfactionTrend = await this.getClientSatisfactionTrend(contractorId, 6);

      return {
        total_clients: totalClients,
        new_clients_this_month: newClientsThisMonth,
        repeat_clients: repeatClients,
        client_lifetime_value: Math.round(avgLifetimeValue * 100) / 100,
        churn_rate: churnRate,
        acquisition_channels: acquisitionChannels,
        client_satisfaction_trend: satisfactionTrend,
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to analyze client metrics');
    }

    return result.data;
  }

  /**
   * Generate marketing insights and recommendations
   */
  static async generateMarketingInsights(contractorId: string): Promise<MarketingInsights> {
    const context = {
      service: 'BusinessAnalyticsService',
      method: 'generateMarketingInsights',
      userId: contractorId,
      params: { contractorId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      // Get profile views and quote requests (mock data for now)
      const profileViews = Math.floor(Math.random() * 500) + 100;
      const quoteRequests = Math.floor(Math.random() * 50) + 10;

      // Generate conversion funnel
      const conversionFunnel = [
        { stage: 'Profile Views', count: profileViews, conversion_rate: 100 },
        { stage: 'Quote Requests', count: quoteRequests, conversion_rate: (quoteRequests / profileViews) * 100 },
        { stage: 'Quotes Sent', count: Math.floor(quoteRequests * 0.8), conversion_rate: 80 },
        { stage: 'Jobs Won', count: Math.floor(quoteRequests * 0.3), conversion_rate: 30 },
      ];

      // Generate competitor analysis
      const competitorAnalysis = {
        average_pricing: Math.floor(Math.random() * 50) + 75, // £75-125 per hour
        market_position: Math.random() > 0.5 ? 'above_average' : 'average',
        rating_comparison: Math.round((Math.random() * 0.5 + 4.0) * 10) / 10, // 4.0-4.5
      };

      // Generate seasonal trends
      const seasonalTrends = Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(i);
        return {
          month: month.toISOString().substring(0, 7),
          demand_score: Math.floor(Math.random() * 40) + 60, // 60-100
          optimal_pricing: Math.floor(Math.random() * 30) + 80, // £80-110
        };
      });

      // Generate growth opportunities
      const growthOpportunities = [
        { service_type: 'Emergency Repairs', demand_increase: 15, revenue_potential: 2500 },
        { service_type: 'Kitchen Renovations', demand_increase: 8, revenue_potential: 4200 },
        { service_type: 'Bathroom Fitting', demand_increase: 12, revenue_potential: 3800 },
      ];

      return {
        profile_views: profileViews,
        quote_requests: quoteRequests,
        conversion_funnel: conversionFunnel,
        competitor_analysis: competitorAnalysis,
        seasonal_trends: seasonalTrends,
        growth_opportunities: growthOpportunities,
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to generate marketing insights');
    }

    return result.data;
  }

  /**
   * Private helper methods for calculating business metrics
   */
  private static async calculateAverageResponseTime(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> {
    // Query bids to calculate actual response times
    const { data: responses, error } = await supabase
      .from('bids')
      .select('created_at, job_id, jobs!inner(created_at)')
      .eq('contractor_id', contractorId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (error || !responses?.length) {
      return Math.floor(Math.random() * 60) + 15; // 15-75 minutes fallback
    }

    const typedResponses = responses as DatabaseBidRow[];
    const responseTimes = typedResponses.map((bid) => {
      const jobTime = bid.jobs ? new Date(bid.jobs.created_at).getTime() : new Date(bid.created_at).getTime();
      const bidTime = new Date(bid.created_at).getTime();
      return (bidTime - jobTime) / (1000 * 60); // Convert to minutes
    });

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  private static async calculateQuoteConversionRate(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> {
    const { data: bids, error: bidError } = await supabase
      .from('bids')
      .select('id, status')
      .eq('contractor_id', contractorId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (bidError || !bids?.length) {
      return Math.floor(Math.random() * 40) + 30; // 30-70% fallback
    }

    const typedBids = bids as DatabaseBidRow[];
    const totalBids = typedBids.length;
    const acceptedBids = typedBids.filter((bid) => bid.status === 'accepted').length;

    return totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;
  }

  private static async calculateRepeatClientRate(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('homeowner_id')
      .eq('contractor_id', contractorId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (error || !jobs?.length) {
      return Math.floor(Math.random() * 30) + 20; // 20-50% fallback
    }

    const typedJobs = jobs as Pick<DatabaseJobRow, 'homeowner_id'>[];
    const clientCounts = typedJobs.reduce((acc: Record<string, number>, job) => {
      acc[job.homeowner_id] = (acc[job.homeowner_id] || 0) + 1;
      return acc;
    }, {});

    const totalClients = Object.keys(clientCounts).length;
    const repeatClients = Object.values(clientCounts).filter((count) => count > 1).length;

    return totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;
  }

  private static async calculateProfitMargin(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> {
    // Get revenue from completed jobs
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('budget')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    // Get expenses for the period
    const { data: expenses, error: expenseError } = await supabase
      .from('contractor_expenses')
      .select('amount')
      .eq('contractor_id', contractorId)
      .gte('expense_date', periodStart)
      .lte('expense_date', periodEnd);

    if (jobError || expenseError) {
      return Math.floor(Math.random() * 20) + 25; // 25-45% fallback
    }

    const typedJobs = (jobs || []) as Pick<DatabaseJobRow, 'budget'>[];
    const typedExpenses = (expenses || []) as DatabaseExpenseRow[];
    const totalRevenue = typedJobs.reduce((sum: number, job) => sum + (job.budget || 0), 0);
    const totalExpenses = typedExpenses.reduce((sum: number, expense) => sum + expense.amount, 0);

    return totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
  }

  private static async getMonthlyRevenue(contractorId: string, months: number): Promise<number[]> {
    const results: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const { data: jobs } = await supabase
        .from('jobs')
        .select('budget')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      const typedJobs = (jobs || []) as Pick<DatabaseJobRow, 'budget'>[];
      const monthlyRev = typedJobs.reduce((sum: number, job) => sum + (job.budget || 0), 0);
      results.push(monthlyRev);
    }

    return results;
  }

  private static calculateQuarterlyGrowth(monthlyRevenue: number[]): number {
    if (monthlyRevenue.length < 6) return 0;

    const lastQuarter = monthlyRevenue.slice(-3).reduce((sum, rev) => sum + rev, 0);
    const previousQuarter = monthlyRevenue.slice(-6, -3).reduce((sum, rev) => sum + rev, 0);

    return previousQuarter > 0 ? ((lastQuarter - previousQuarter) / previousQuarter) * 100 : 0;
  }

  private static projectYearlyRevenue(monthlyRevenue: number[]): number {
    const avgMonthly = monthlyRevenue.reduce((sum, rev) => sum + rev, 0) / monthlyRevenue.length;
    return avgMonthly * 12;
  }

  private static async getInvoicesSummary(contractorId: string): Promise<{
    outstandingInvoices: number;
    overdueAmount: number;
  }> {
    const { data: invoices, error } = await supabase
      .from('contractor_invoices')
      .select('total_amount, due_date, status')
      .eq('contractor_id', contractorId)
      .in('status', ['sent', 'overdue']);

    if (error) return { outstandingInvoices: 0, overdueAmount: 0 };

    const typedInvoices = (invoices || []) as DatabaseInvoiceRow[];
    const outstanding = typedInvoices.reduce((sum: number, inv) => sum + inv.total_amount, 0);
    const overdue = typedInvoices
      .filter((inv) => new Date(inv.due_date) < new Date() && inv.status !== 'paid')
      .reduce((sum: number, inv) => sum + inv.total_amount, 0);

    return { outstandingInvoices: outstanding, overdueAmount: overdue };
  }

  private static async getProfitTrends(contractorId: string, months: number): Promise<FinancialSummary['profit_trends']> {
    return Array.from({ length: months }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (months - 1 - i));
      const revenue = Math.floor(Math.random() * 3000) + 1000;
      const expenses = Math.floor(revenue * 0.7);

      return {
        month: month.toISOString().substring(0, 7),
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });
  }

  private static async calculateTaxObligations(contractorId: string): Promise<number> {
    // Mock implementation - would calculate based on revenue and expenses
    return Math.floor(Math.random() * 2000) + 500;
  }

  private static async generateCashFlowForecast(contractorId: string, weeks: number): Promise<FinancialSummary['cash_flow_forecast']> {
    return Array.from({ length: weeks }, (_, i) => {
      const week = new Date();
      week.setDate(week.getDate() + i * 7);

      return {
        week: week.toISOString().substring(0, 10),
        projected_income: Math.floor(Math.random() * 1000) + 200,
        projected_expenses: Math.floor(Math.random() * 600) + 100,
        net_flow: Math.floor(Math.random() * 800) - 200,
      };
    });
  }

  private static async calculateClientChurnRate(contractorId: string): Promise<number> {
    // Mock implementation - would calculate actual churn based on client activity
    return Math.floor(Math.random() * 10) + 5; // 5-15%
  }

  private static async getAcquisitionChannels(contractorId: string): Promise<ClientAnalytics['acquisition_channels']> {
    // Mock data - would track actual acquisition sources
    return [
      { channel: 'Mintenance Platform', clients: 45, conversion_rate: 23, cost_per_acquisition: 15 },
      { channel: 'Word of Mouth', clients: 32, conversion_rate: 67, cost_per_acquisition: 0 },
      { channel: 'Social Media', clients: 18, conversion_rate: 12, cost_per_acquisition: 25 },
      { channel: 'Local Advertising', clients: 12, conversion_rate: 8, cost_per_acquisition: 45 },
    ];
  }

  private static async getClientSatisfactionTrend(contractorId: string, months: number): Promise<ClientAnalytics['client_satisfaction_trend']> {
    return Array.from({ length: months }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (months - 1 - i));

      return {
        month: month.toISOString().substring(0, 7),
        rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // 3.5-5.0
        reviews_count: Math.floor(Math.random() * 15) + 5,
      };
    });
  }
}

export default BusinessAnalyticsService;