/**
 * Analytics Controller - Comprehensive analytics and reporting
 */
import { EventTrackingService } from './EventTrackingService';
import { logger } from '@mintenance/shared';
import { MetricsAggregationService } from './MetricsAggregationService';
import { ReportingService } from './ReportingService';
import { DashboardService } from './DashboardService';
import { ExportService } from './ExportService';
import { InsightsService } from './InsightsService';
import { EventType, AnalyticsEvent as BaseAnalyticsEvent } from './types';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<Response>;
}
const NextResponse = {
  json(data: unknown, init?: ResponseInit): unknown {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};
interface User {
  id: string;
  email: string;
  role: string;
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'user-123', email: 'user@example.com', role: 'admin' };
}
async function requireAdmin(user: User | null): Promise<void> {
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // CSRF validation
}
async function checkRateLimit(request: NextRequest, options: unknown) {
  return {
    allowed: true,
    remaining: 30,
    resetTime: Date.now() + 60000,
    retryAfter: 60
  };
}
function handleAPIError(error: unknown): unknown {
  logger.error('Analytics Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// AnalyticsEvent is exported from types.ts, but we keep the local version 
// for controller-specific metadata if needed, or just alias it.
export { EventType };
export type AnalyticsEvent = BaseAnalyticsEvent;
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  dimensions?: Record<string, string>;
  tags?: string[];
}
export class AnalyticsController {
  private eventTracking: EventTrackingService;
  private metricsAggregation: MetricsAggregationService;
  private reporting: ReportingService;
  private dashboard: DashboardService;
  private export: ExportService;
  private insights: InsightsService;
  constructor() {
    const config = {
      supabase: {} as any,
      clickhouse: {} as any, // For time-series data
      redis: {} as any, // For real-time metrics
    };
    this.eventTracking = new EventTrackingService(config.supabase, config.clickhouse, config.redis);
    this.metricsAggregation = new MetricsAggregationService(config.supabase, config.redis);
    this.reporting = new ReportingService(config.supabase);
    this.dashboard = new DashboardService(config.supabase);
    this.export = new ExportService(config.supabase);
    this.insights = new InsightsService(config.supabase);
  }
  /**
   * POST /api/analytics/events - Track an event
   */
  async trackEvent(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 100
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const data = await request.json();
      const { type, properties, sessionId } = data;
      if (!type) {
        return NextResponse.json(
          { error: 'Event type is required' },
          { status: 400 }
        );
      }
      // Get user context
      const user = await getCurrentUserFromCookies();
      // Create event
      const event: AnalyticsEvent = {
        type: type as EventType,
        userId: user?.id,
        sessionId,
        timestamp: new Date().toISOString(),
        properties,
        metadata: {
          ip: this.getClientIp(request),
          userAgent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referer') || undefined,
          url: request.url
        }
      };
      // Track event
      const eventId = await this.eventTracking.trackEvent(event);
      // Process in real-time if needed
      if (this.isRealTimeEvent(type)) {
        await this.metricsAggregation.processRealTimeEvent(event);
      }
      return NextResponse.json({
        success: true,
        eventId
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/analytics/events/batch - Track multiple events
   */
  async trackEventsBatch(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const data = await request.json();
      const { events, sessionId } = data;
      if (!events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: 'Events array is required' },
          { status: 400 }
        );
      }
      // Get user context
      const user = await getCurrentUserFromCookies();
      // Process events
      const processedEvents = events.map(e => ({
        ...e,
        userId: e.userId || user?.id,
        sessionId: e.sessionId || sessionId,
        timestamp: e.timestamp || new Date().toISOString()
      }));
      // Track batch
      const result: unknown = await this.eventTracking.trackEventsBatch(processedEvents);
      return NextResponse.json({
        success: true,
        tracked: result.tracked,
        failed: result.failed
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/dashboard - Get dashboard data
   */
  async getDashboard(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || '7d';
      const role = user.role;
      // Get dashboard data based on role
      let dashboardData;
      if (role === 'admin') {
        dashboardData = await this.dashboard.getAdminDashboard(timeRange);
      } else if (role === 'contractor') {
        dashboardData = await this.dashboard.getContractorDashboard(user.id, timeRange);
      } else {
        dashboardData = await this.dashboard.getHomeownerDashboard(user.id, timeRange);
      }
      return NextResponse.json(dashboardData);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/metrics - Get aggregated metrics
   */
  async getMetrics(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Parse query parameters
      const url = new URL(request.url);
      const metric = url.searchParams.get('metric');
      const timeRange = url.searchParams.get('timeRange') || '7d';
      const groupBy = url.searchParams.get('groupBy');
      const filters = this.parseFilters(url.searchParams);
      if (!metric) {
        return NextResponse.json(
          { error: 'Metric name is required' },
          { status: 400 }
        );
      }
      // Get metrics
      const dateRange = this.parseTimeRange(timeRange);
      const metrics = await this.metricsAggregation.getMetrics(
        [metric],
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          groupBy: groupBy as any,
          metrics: [metric],
          ...filters
        }
      );
      return NextResponse.json({
        metrics,
        timeRange,
        groupBy
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/analytics/reports - Generate a report
   */
  async generateReport(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 5
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { reportType, parameters, format = 'pdf' } = data;
      if (!reportType) {
        return NextResponse.json(
          { error: 'Report type is required' },
          { status: 400 }
        );
      }
      // Generate report
      const report = await this.reporting.generateReport(user.id, {
        type: reportType,

        parameters,
        format
      });
      return NextResponse.json({
        success: true,
        reportId: report.jobId,
        status: report.status,
        downloadUrl: ''
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/reports/[id] - Get report status
   */
  async getReportStatus(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Get report status
      const report = await this.reporting.getReportStatus(params.id);
      if (!report) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(report);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/analytics/export - Export data
   */
  async exportData(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 5
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { dataSource: dataType, filters, format = 'csv', fields } = data;
      if (!dataType) {
        return NextResponse.json(
          { error: 'Data type is required' },
          { status: 400 }
        );
      }
      // Start export
      const exportJob = await this.export.exportData(user.id, {
        dataSource: dataType,

        filters,
        format,
        fields
      });
      return NextResponse.json({
        success: true,
        exportId: exportJob.jobId,
        status: exportJob.status
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/insights - Get AI-powered insights
   */
  async getInsights(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      const timeRange = url.searchParams.get('timeRange') || '30d';
      // Get insights based on role and category
      let insights;
      if (user.role === 'contractor') {
        insights = await this.insights.getContractorInsights(user.id, timeRange, category);
      } else if (user.role === 'admin') {
        insights = await this.insights.getPlatformInsights(timeRange, category);
      } else {
        insights = await this.insights.getHomeownerInsights(user.id, timeRange);
      }
      return NextResponse.json({
        insights,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/realtime - Get real-time metrics
   */
  async getRealTimeMetrics(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Admin only
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Get real-time metrics
      const metrics = await this.metricsAggregation.getRealTimeMetrics();
      return NextResponse.json({
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/analytics/funnel - Get funnel analysis
   */
  async getFunnelAnalysis(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const funnelType = url.searchParams.get('type') || 'conversion';
      const timeRange = url.searchParams.get('timeRange') || '30d';
      // Get funnel analysis
      const funnel = await this.insights.getFunnelAnalysis({
        type: funnelType,
        userId: user.role === 'admin' ? undefined : user.id,
        timeRange
      });
      return NextResponse.json(funnel);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `analytics:${ip}`;
  }
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0] || realIp || '';
  }
  private rateLimitResponse(rateLimitResult: unknown): unknown {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  }
  private parseFilters(params: URLSearchParams): Record<string, any> {
    const filters: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      if (key.startsWith('filter.')) {
        const filterKey = key.replace('filter.', '');
        filters[filterKey] = value;
      }
    }
    return filters;
  }

  private parseTimeRange(range: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    const match = range.match(/(\d+)([dhm])/);
    if (!match) {
      start.setDate(start.getDate() - 7);
      return { start, end };
    }
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd': start.setDate(start.getDate() - num); break;
      case 'h': start.setHours(start.getHours() - num); break;
      case 'm': start.setMinutes(start.getMinutes() - num); break;
      default: start.setDate(start.getDate() - 7);
    }
    return { start, end };
  }

  private isRealTimeEvent(type: string): boolean {
    const realTimeEvents = [
      EventType.PAYMENT_COMPLETED,
      EventType.JOB_COMPLETED,
      EventType.USER_SIGNUP,
      EventType.ERROR_OCCURRED
    ];
    return realTimeEvents.includes(type as EventType);
  }
}
// Export singleton instance (commented out to avoid circular dependency issues in tests)
// export const analyticsController = new AnalyticsController();
