/**
 * DashboardService
 *
 * Provides dashboard data for different user roles.
 * Aggregates and formats data for visualization.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
export type DashboardType = 'admin' | 'contractor' | 'homeowner';
interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'map';
  data: any;
  config?: {
    refreshInterval?: number;
    color?: string;
    icon?: string;
    link?: string;
  };
}
interface DashboardData {
  type: DashboardType;
  widgets: DashboardWidget[];
  summary: {
    title: string;
    subtitle?: string;
    lastUpdated: Date;
  };
  filters?: {
    dateRange?: { start: Date; end: Date };
    categories?: string[];
    locations?: string[];
  };
}
interface MetricWidget {
  value: number | string;
  label: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  sparkline?: number[];
}
interface ChartWidget {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  datasets: {
    label: string;
    data: any[];
    color?: string;
  }[];
  labels?: string[];
  options?: Record<string, any>;
}
interface TableWidget {
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
  }[];
  rows: Record<string, any>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}
export class DashboardService {
  private supabase: SupabaseClient;
  private metricsCache: Map<string, any> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  /**
   * Get dashboard data based on user role
   */
  async getDashboard(
    type: DashboardType,
    userId: string,
    filters?: any
  ): Promise<DashboardData> {
    try {
      switch (type) {
        case 'admin':
          return await this.getAdminDashboard(filters);
        case 'contractor':
          return await this.getContractorDashboard(userId, filters);
        case 'homeowner':
          return await this.getHomeownerDashboard(userId, filters);
        default:
          throw new Error(`Unknown dashboard type: ${type}`);
      }
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      throw new Error('Failed to get dashboard');
    }
  }
  /**
   * Get admin dashboard
   */
  public async getAdminDashboard(filters?: any): Promise<DashboardData> {
    const widgets: DashboardWidget[] = [];
    // Key metrics
    widgets.push(await this.createMetricWidget('total-users', 'Total Users', async () => {
      const { count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('active-jobs', 'Active Jobs', async () => {
      const { count } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('monthly-revenue', 'Monthly Revenue', async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return `$${(total / 100).toFixed(2)}`;
    }));
    widgets.push(await this.createMetricWidget('platform-rating', 'Platform Rating', async () => {
      const { data } = await this.supabase
        .from('reviews')
        .select('rating');
      if (!data || data.length === 0) return 'N/A';
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return avg.toFixed(1);
    }));
    // User growth chart
    widgets.push(await this.createChartWidget(
      'user-growth',
      'User Growth',
      'line',
      async () => {
        const last30Days = await this.getUserGrowthData(30);
        return {
          datasets: [{
            label: 'New Users',
            data: last30Days.map(d => d.count),
            color: '#3B82F6'
          }],
          labels: last30Days.map(d => d.date)
        };
      }
    ));
    // Job statistics chart
    widgets.push(await this.createChartWidget(
      'job-stats',
      'Job Statistics',
      'bar',
      async () => {
        const stats = await this.getJobStatsByCategory();
        return {
          datasets: [{
            label: 'Jobs',
            data: stats.map(s => s.count),
            color: '#10B981'
          }],
          labels: stats.map(s => s.category)
        };
      }
    ));
    // Revenue trend chart
    widgets.push(await this.createChartWidget(
      'revenue-trend',
      'Revenue Trend',
      'area',
      async () => {
        const last12Months = await this.getRevenueByMonth(12);
        return {
          datasets: [{
            label: 'Revenue',
            data: last12Months.map(m => m.revenue),
            color: '#8B5CF6'
          }],
          labels: last12Months.map(m => m.month)
        };
      }
    ));
    // Recent activities table
    widgets.push(await this.createTableWidget(
      'recent-activities',
      'Recent Activities',
      async () => {
        const { data } = await this.supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        return {
          columns: [
            { key: 'action', label: 'Action' },
            { key: 'user_id', label: 'User' },
            { key: 'created_at', label: 'Time' }
          ],
          rows: data || []
        };
      }
    ));
    // Top contractors list
    widgets.push(await this.createListWidget(
      'top-contractors',
      'Top Contractors',
      async () => {
        const { data } = await this.supabase
          .from('contractor_profiles')
          .select('*, reviews(rating)')
          .order('average_rating', { ascending: false })
          .limit(5);
        return data?.map(c => ({
          title: c.business_name,
          subtitle: `Rating: ${c.average_rating}`,
          value: c.jobs_completed
        })) || [];
      }
    ));
    return {
      type: 'admin',
      widgets,
      summary: {
        title: 'Admin Dashboard',
        subtitle: 'Platform Overview',
        lastUpdated: new Date()
      },
      filters
    };
  }
  /**
   * Get contractor dashboard
   */
  public async getContractorDashboard(
    contractorId: string,
    filters?: any
  ): Promise<DashboardData> {
    const widgets: DashboardWidget[] = [];
    // Contractor metrics
    widgets.push(await this.createMetricWidget('active-bids', 'Active Bids', async () => {
      const { count } = await this.supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
        .eq('status', 'pending');
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('jobs-completed', 'Jobs Completed', async () => {
      const { count } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
        .eq('status', 'completed');
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('average-rating', 'Average Rating', async () => {
      const { data } = await this.supabase
        .from('reviews')
        .select('rating')
        .eq('contractor_id', contractorId);
      if (!data || data.length === 0) return 'N/A';
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return avg.toFixed(1);
    }));
    widgets.push(await this.createMetricWidget('monthly-earnings', 'Monthly Earnings', async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return `$${(total / 100).toFixed(2)}`;
    }));
    // Job completion chart
    widgets.push(await this.createChartWidget(
      'job-completion',
      'Job Completion Rate',
      'pie',
      async () => {
        const stats = await this.getContractorJobStats(contractorId);
        return {
          datasets: [{
            label: 'Jobs',
            data: [stats.completed, stats.inProgress, stats.cancelled],
            color: ['#10B981', '#F59E0B', '#EF4444']
          }],
          labels: ['Completed', 'In Progress', 'Cancelled']
        };
      }
    ));
    // Earnings trend
    widgets.push(await this.createChartWidget(
      'earnings-trend',
      'Earnings Trend',
      'line',
      async () => {
        const last6Months = await this.getContractorEarnings(contractorId, 6);
        return {
          datasets: [{
            label: 'Earnings',
            data: last6Months.map(m => m.amount),
            color: '#3B82F6'
          }],
          labels: last6Months.map(m => m.month)
        };
      }
    ));
    // Active jobs table
    widgets.push(await this.createTableWidget(
      'active-jobs',
      'Active Jobs',
      async () => {
        const { data } = await this.supabase
          .from('jobs')
          .select('*')
          .eq('contractor_id', contractorId)
          .in('status', ['in_progress', 'scheduled'])
          .limit(10);
        return {
          columns: [
            { key: 'title', label: 'Job Title' },
            { key: 'status', label: 'Status' },
            { key: 'scheduled_date', label: 'Scheduled' },
            { key: 'budget', label: 'Budget' }
          ],
          rows: data || []
        };
      }
    ));
    // Recent reviews
    widgets.push(await this.createListWidget(
      'recent-reviews',
      'Recent Reviews',
      async () => {
        const { data } = await this.supabase
          .from('reviews')
          .select('*, users(name)')
          .eq('contractor_id', contractorId)
          .order('created_at', { ascending: false })
          .limit(5);
        return data?.map(r => ({
          title: `${r.rating} stars from ${r.users?.name}`,
          subtitle: r.comment,
          value: r.created_at
        })) || [];
      }
    ));
    return {
      type: 'contractor',
      widgets,
      summary: {
        title: 'Contractor Dashboard',
        subtitle: 'Your Performance Overview',
        lastUpdated: new Date()
      },
      filters
    };
  }
  /**
   * Get homeowner dashboard
   */
  public async getHomeownerDashboard(
    userId: string,
    filters?: any
  ): Promise<DashboardData> {
    const widgets: DashboardWidget[] = [];
    // Homeowner metrics
    widgets.push(await this.createMetricWidget('open-jobs', 'Open Jobs', async () => {
      const { count } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'open');
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('active-jobs', 'Active Jobs', async () => {
      const { count } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['in_progress', 'scheduled']);
      return count || 0;
    }));
    widgets.push(await this.createMetricWidget('total-spent', 'Total Spent', async () => {
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed');
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return `$${(total / 100).toFixed(2)}`;
    }));
    widgets.push(await this.createMetricWidget('saved-contractors', 'Saved Contractors', async () => {
      const { count } = await this.supabase
        .from('saved_contractors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count || 0;
    }));
    // Job status chart
    widgets.push(await this.createChartWidget(
      'job-status',
      'Job Status Overview',
      'pie',
      async () => {
        const stats = await this.getUserJobStats(userId);
        return {
          datasets: [{
            label: 'Jobs',
            data: Object.values(stats),
            color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444']
          }],
          labels: Object.keys(stats)
        };
      }
    ));
    // Spending history
    widgets.push(await this.createChartWidget(
      'spending-history',
      'Spending History',
      'bar',
      async () => {
        const last6Months = await this.getUserSpending(userId, 6);
        return {
          datasets: [{
            label: 'Spending',
            data: last6Months.map(m => m.amount),
            color: '#3B82F6'
          }],
          labels: last6Months.map(m => m.month)
        };
      }
    ));
    // Recent jobs table
    widgets.push(await this.createTableWidget(
      'recent-jobs',
      'Recent Jobs',
      async () => {
        const { data } = await this.supabase
          .from('jobs')
          .select('*, contractors(business_name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        return {
          columns: [
            { key: 'title', label: 'Job Title' },
            { key: 'status', label: 'Status' },
            { key: 'contractor', label: 'Contractor' },
            { key: 'created_at', label: 'Created' }
          ],
          rows: data?.map(j => ({
            ...j,
            contractor: j.contractors?.business_name || 'Unassigned'
          })) || []
        };
      }
    ));
    // Upcoming scheduled jobs
    widgets.push(await this.createListWidget(
      'upcoming-jobs',
      'Upcoming Scheduled Jobs',
      async () => {
        const { data } = await this.supabase
          .from('jobs')
          .select('*, contractors(business_name)')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true })
          .limit(5);
        return data?.map(j => ({
          title: j.title,
          subtitle: `${j.contractors?.business_name} - ${new Date(j.scheduled_date).toLocaleDateString()}`,
          value: j.budget
        })) || [];
      }
    ));
    return {
      type: 'homeowner',
      widgets,
      summary: {
        title: 'Homeowner Dashboard',
        subtitle: 'Your Property Maintenance Overview',
        lastUpdated: new Date()
      },
      filters
    };
  }
  // Widget creation helpers
  private async createMetricWidget(
    id: string,
    title: string,
    dataFetcher: () => Promise<any>
  ): Promise<DashboardWidget> {
    const cacheKey = `metric:${id}`;
    // Check cache
    if (this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.widget;
      }
    }
    const value = await dataFetcher();
    const widget: DashboardWidget = {
      id,
      title,
      type: 'metric',
      data: { value, label: title }
    };
    // Cache result
    this.metricsCache.set(cacheKey, {
      widget,
      timestamp: Date.now()
    });
    return widget;
  }
  private async createChartWidget(
    id: string,
    title: string,
    chartType: string,
    dataFetcher: () => Promise<any>
  ): Promise<DashboardWidget> {
    const data = await dataFetcher();
    return {
      id,
      title,
      type: 'chart',
      data: {
        type: chartType,
        ...data
      }
    };
  }
  private async createTableWidget(
    id: string,
    title: string,
    dataFetcher: () => Promise<any>
  ): Promise<DashboardWidget> {
    const data = await dataFetcher();
    return {
      id,
      title,
      type: 'table',
      data
    };
  }
  private async createListWidget(
    id: string,
    title: string,
    dataFetcher: () => Promise<any>
  ): Promise<DashboardWidget> {
    const data = await dataFetcher();
    return {
      id,
      title,
      type: 'list',
      data: { items: data }
    };
  }
  // Data fetching helpers
  private async getUserGrowthData(days: number): Promise<{ date: string; count: number }[]> {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const { count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);
      result.push({ date: dateStr, count: count || 0 });
    }
    return result;
  }
  private async getJobStatsByCategory(): Promise<{ category: string; count: number }[]> {
    const { data } = await this.supabase
      .from('jobs')
      .select('category');
    const counts: Record<string, number> = {};
    data?.forEach(job => {
      counts[job.category] = (counts[job.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
  }
  private async getRevenueByMonth(months: number): Promise<{ month: string; revenue: number }[]> {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextMonth.toISOString());
      const revenue = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: revenue / 100
      });
    }
    return result;
  }
  private async getContractorJobStats(contractorId: string): Promise<any> {
    const { data } = await this.supabase
      .from('jobs')
      .select('status')
      .eq('contractor_id', contractorId);
    const stats = {
      completed: 0,
      inProgress: 0,
      cancelled: 0
    };
    data?.forEach(job => {
      if (job.status === 'completed') stats.completed++;
      else if (job.status === 'in_progress') stats.inProgress++;
      else if (job.status === 'cancelled') stats.cancelled++;
    });
    return stats;
  }
  private async getContractorEarnings(
    contractorId: string,
    months: number
  ): Promise<{ month: string; amount: number }[]> {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextMonth.toISOString());
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: total / 100
      });
    }
    return result;
  }
  private async getUserJobStats(userId: string): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('jobs')
      .select('status')
      .eq('user_id', userId);
    const stats: Record<string, number> = {};
    data?.forEach(job => {
      stats[job.status] = (stats[job.status] || 0) + 1;
    });
    return stats;
  }
  private async getUserSpending(
    userId: string,
    months: number
  ): Promise<{ month: string; amount: number }[]> {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const { data } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextMonth.toISOString());
      const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: total / 100
      });
    }
    return result;
  }
}