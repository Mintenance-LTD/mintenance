/**
 * MetricsAggregationService
 *
 * Handles metrics aggregation, calculations, and real-time processing.
 * Provides various aggregation methods for analytics data.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { EventType } from './AnalyticsController';
interface MetricValue {
  value: number;
  change: number; // Percentage change from previous period
  trend: 'up' | 'down' | 'stable';
}
interface AggregatedMetric {
  name: string;
  current: MetricValue;
  previous: MetricValue;
  sparkline: number[]; // Last 7 data points for mini chart
}
interface MetricsFilters {
  startDate: Date;
  endDate: Date;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  dimensions?: string[];
  metrics?: string[];
  userId?: string;
  jobId?: string;
  contractorId?: string;
}
interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  successRate: number;
  throughput: number;
}
export class MetricsAggregationService {
  private supabase: SupabaseClient;
  private redis?: unknown;
  private aggregationCache: Map<string, any> = new Map();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes
  constructor(supabase: SupabaseClient, redis?: unknown) {
    this.supabase = supabase;
    this.redis = redis;
  }
  /**
   * Get aggregated metrics
   */
  async getMetrics(
    metrics: string[],
    filters: MetricsFilters
  ): Promise<AggregatedMetric[]> {
    try {
      const results: AggregatedMetric[] = [];
      for (const metric of metrics) {
        const aggregated = await this.aggregateMetric(metric, filters);
        results.push(aggregated);
      }
      return results;
    } catch (error) {
      logger.error('Error getting aggregated metrics:', error);
      throw new Error('Failed to get aggregated metrics');
    }
  }
  /**
   * Aggregate a specific metric
   */
  private async aggregateMetric(
    metric: string,
    filters: MetricsFilters
  ): Promise<AggregatedMetric> {
    const cacheKey = this.getCacheKey(metric, filters);
    // Check cache
    if (this.aggregationCache.has(cacheKey)) {
      const cached = this.aggregationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }
    // Calculate current and previous period
    const current = await this.calculateMetricValue(metric, filters);
    const previousFilters = this.getPreviousPeriodFilters(filters);
    const previous = await this.calculateMetricValue(metric, previousFilters);
    // Calculate change and trend
    const change = this.calculatePercentageChange(previous.value, current.value);
    const trend = this.determineTrend(change);
    // Get sparkline data
    const sparkline = await this.getSparklineData(metric, filters);
    const result: AggregatedMetric = {
      name: metric,
      current: {
        value: current.value,
        change,
        trend
      },
      previous: {
        value: previous.value,
        change: 0,
        trend: 'stable'
      },
      sparkline
    };
    // Cache result
    this.aggregationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    return result;
  }
  /**
   * Calculate metric value
   */
  private async calculateMetricValue(
    metric: string,
    filters: MetricsFilters
  ): Promise<{ value: number }> {
    try {
      let value = 0;
      switch (metric) {
        case 'total_users':
          value = await this.getTotalUsers(filters);
          break;
        case 'active_users':
          value = await this.getActiveUsers(filters);
          break;
        case 'total_jobs':
          value = await this.getTotalJobs(filters);
          break;
        case 'completed_jobs':
          value = await this.getCompletedJobs(filters);
          break;
        case 'total_revenue':
          value = await this.getTotalRevenue(filters);
          break;
        case 'average_job_value':
          value = await this.getAverageJobValue(filters);
          break;
        case 'contractor_rating':
          value = await this.getAverageContractorRating(filters);
          break;
        case 'job_completion_time':
          value = await this.getAverageJobCompletionTime(filters);
          break;
        case 'bid_acceptance_rate':
          value = await this.getBidAcceptanceRate(filters);
          break;
        case 'customer_satisfaction':
          value = await this.getCustomerSatisfaction(filters);
          break;
        default:
          value = await this.getCustomMetric(metric, filters);
      }
      return { value };
    } catch (error) {
      logger.error(`Error calculating metric ${metric}:`, error);
      return { value: 0 };
    }
  }
  /**
   * Process real-time event for metrics
   */
  async processRealTimeEvent(event: {
    type: EventType;
    userId?: string;
    properties?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.redis) return;
    try {
      // Update real-time counters
      const date = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      // Increment event counter
      await this.redis.hincrby(`metrics:events:${date}`, event.type, 1);
      // Update unique users
      if (event.userId) {
        await this.redis.sadd(`metrics:users:${date}`, event.userId);
        await this.redis.sadd(`metrics:users:${date}:${hour}`, event.userId);
      }
      // Update specific metrics based on event type
      switch (event.type) {
        case EventType.JOB_CREATED:
          await this.redis.hincrby(`metrics:jobs:${date}`, 'created', 1);
          break;
        case EventType.JOB_COMPLETED:
          await this.redis.hincrby(`metrics:jobs:${date}`, 'completed', 1);
          break;
        case EventType.PAYMENT_COMPLETED:
          const amount = event.properties?.amount || 0;
          await this.redis.hincrbyfloat(`metrics:revenue:${date}`, 'total', amount);
          break;
        case EventType.BID_SUBMITTED:
          await this.redis.hincrby(`metrics:bids:${date}`, 'submitted', 1);
          break;
        case EventType.BID_ACCEPTED:
          await this.redis.hincrby(`metrics:bids:${date}`, 'accepted', 1);
          break;
      }
      // Set expiration
      await this.redis.expire(`metrics:events:${date}`, 86400 * 30); // 30 days
      await this.redis.expire(`metrics:users:${date}`, 86400 * 30);
      await this.redis.expire(`metrics:users:${date}:${hour}`, 86400);
    } catch (error) {
      logger.error('Error processing real-time event:', error);
    }
  }
  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    service: string,
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    try {
      const { data, error } = await this.supabase.rpc('get_performance_metrics', {
        service_name: service,
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString()
      });
      if (error) throw error;
      return {
        avgResponseTime: data.avg_response_time || 0,
        p95ResponseTime: data.p95_response_time || 0,
        p99ResponseTime: data.p99_response_time || 0,
        errorRate: data.error_rate || 0,
        successRate: data.success_rate || 0,
        throughput: data.throughput || 0
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw new Error('Failed to get performance metrics');
    }
  }
  /**
   * Get conversion funnel metrics
   */
  async getFunnelMetrics(
    steps: string[],
    filters: MetricsFilters
  ): Promise<{
    step: string;
    users: number;
    conversionRate: number;
    dropOffRate: number;
  }[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_funnel_metrics', {
        funnel_steps: steps,
        start_date: filters.startDate.toISOString(),
        end_date: filters.endDate.toISOString(),
        user_id: filters.userId
      });
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting funnel metrics:', error);
      throw new Error('Failed to get funnel metrics');
    }
  }
  /**
   * Get cohort analysis metrics
   */
  async getCohortMetrics(
    cohortType: 'signup' | 'first_purchase' | 'first_job',
    metric: 'retention' | 'revenue' | 'engagement',
    filters: MetricsFilters
  ): Promise<unknown> {
    try {
      const { data, error } = await this.supabase.rpc('get_cohort_metrics', {
        cohort_type: cohortType,
        metric_type: metric,
        start_date: filters.startDate.toISOString(),
        end_date: filters.endDate.toISOString()
      });
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting cohort metrics:', error);
      throw new Error('Failed to get cohort metrics');
    }
  }
  // Specific metric calculation methods
  private async getTotalUsers(filters: MetricsFilters): Promise<number> {
    const { count, error } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    return count || 0;
  }
  private async getActiveUsers(filters: MetricsFilters): Promise<number> {
    const { count, error } = await this.supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_activity', filters.startDate.toISOString())
      .lte('last_activity', filters.endDate.toISOString());
    return count || 0;
  }
  private async getTotalJobs(filters: MetricsFilters): Promise<number> {
    let query = this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    const { count, error } = await query;
    return count || 0;
  }
  private async getCompletedJobs(filters: MetricsFilters): Promise<number> {
    let query = this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', filters.startDate.toISOString())
      .lte('completed_at', filters.endDate.toISOString());
    if (filters.contractorId) {
      query = query.eq('contractor_id', filters.contractorId);
    }
    const { count, error } = await query;
    return count || 0;
  }
  private async getTotalRevenue(filters: MetricsFilters): Promise<number> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    if (error || !data) return 0;
    return data.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }
  private async getAverageJobValue(filters: MetricsFilters): Promise<number> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('budget')
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    if (error || !data || data.length === 0) return 0;
    const total = data.reduce((sum, job) => sum + (job.budget || 0), 0);
    return total / data.length;
  }
  private async getAverageContractorRating(filters: MetricsFilters): Promise<number> {
    let query = this.supabase
      .from('reviews')
      .select('rating');
    if (filters.contractorId) {
      query = query.eq('contractor_id', filters.contractorId);
    }
    query = query
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    const { data, error } = await query;
    if (error || !data || data.length === 0) return 0;
    const total = data.reduce((sum, review) => sum + (review.rating || 0), 0);
    return total / data.length;
  }
  private async getAverageJobCompletionTime(filters: MetricsFilters): Promise<number> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('created_at, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', filters.startDate.toISOString())
      .lte('completed_at', filters.endDate.toISOString());
    if (error || !data || data.length === 0) return 0;
    const totalHours = data.reduce((sum, job) => {
      const created = new Date(job.created_at);
      const completed = new Date(job.completed_at);
      const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    return totalHours / data.length;
  }
  private async getBidAcceptanceRate(filters: MetricsFilters): Promise<number> {
    const { count: total } = await this.supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    const { count: accepted } = await this.supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    if (!total || total === 0) return 0;
    return (accepted || 0) / total * 100;
  }
  private async getCustomerSatisfaction(filters: MetricsFilters): Promise<number> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('rating')
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString());
    if (error || !data || data.length === 0) return 0;
    // Calculate CSAT score (percentage of ratings >= 4)
    const satisfied = data.filter(r => r.rating >= 4).length;
    return (satisfied / data.length) * 100;
  }
  private async getCustomMetric(metric: string, filters: MetricsFilters): Promise<number> {
    // Custom metric calculation based on metric name
    const { data, error } = await this.supabase.rpc('calculate_custom_metric', {
      metric_name: metric,
      filters: filters
    });
    return data || 0;
  }
  // Helper methods
  private getCacheKey(metric: string, filters: MetricsFilters): string {
    return `${metric}:${filters.startDate.getTime()}:${filters.endDate.getTime()}:${filters.groupBy || 'none'}`;
  }
  private getPreviousPeriodFilters(filters: MetricsFilters): MetricsFilters {
    const duration = filters.endDate.getTime() - filters.startDate.getTime();
    const previousStart = new Date(filters.startDate.getTime() - duration);
    const previousEnd = new Date(filters.startDate.getTime());
    return {
      ...filters,
      startDate: previousStart,
      endDate: previousEnd
    };
  }
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }
  private determineTrend(change: number): 'up' | 'down' | 'stable' {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }
  private async getSparklineData(metric: string, filters: MetricsFilters): Promise<number[]> {
    // Get last 7 data points for sparkline
    const points = 7;
    const duration = filters.endDate.getTime() - filters.startDate.getTime();
    const interval = duration / points;
    const sparkline: number[] = [];
    for (let i = 0; i < points; i++) {
      const start = new Date(filters.startDate.getTime() + (interval * i));
      const end = new Date(filters.startDate.getTime() + (interval * (i + 1)));
      const value = await this.calculateMetricValue(metric, {
        ...filters,
        startDate: start,
        endDate: end
      });
      sparkline.push(value.value);
    }
    return sparkline;
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<unknown> {
    if (!this.redis) return {};
    const date = new Date().toISOString().split('T')[0];
    // Fetch some basic keys
    // const events = await this.redis.hgetall('metrics:events:' + date);
    return { timestamp: new Date(), active: true };
  }
}