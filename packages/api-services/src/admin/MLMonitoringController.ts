/**
 * ML Monitoring Controller - Machine Learning monitoring and management
 */
import { MLMonitoringService } from './MLMonitoringService';
import { logger } from '@mintenance/shared';
import { ModelPerformanceService } from './ModelPerformanceService';
import { DriftDetectionService } from './DriftDetectionService';
import { FeedbackProcessingService } from './FeedbackProcessingService';
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
  return { id: 'admin-user', email: 'admin@example.com', role: 'admin' };
}
async function requireAdmin(user: User | null): Promise<void> {
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
}
async function checkRateLimit(request: NextRequest, options: unknown) {
  return { allowed: true };
}
function handleAPIError(error: unknown): unknown {
  logger.error('ML Monitoring Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock Supabase
const serverSupabase = {} as any;
export class MLMonitoringController {
  private monitoringService: MLMonitoringService;
  private performanceService: ModelPerformanceService;
  private driftService: DriftDetectionService;
  private feedbackService: FeedbackProcessingService;
  constructor() {
    const config = {
      supabase: serverSupabase,
    };
    this.monitoringService = new MLMonitoringService(config);
    this.performanceService = new ModelPerformanceService(config);
    this.driftService = new DriftDetectionService(config);
    this.feedbackService = new FeedbackProcessingService(config);
  }
  /**
   * GET /api/admin/ml-monitoring - Get ML monitoring dashboard data
   */
  async getDashboard(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse query parameters
      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || '7d';
      const modelVersion = url.searchParams.get('modelVersion');
      // Get all monitoring data in parallel
      const [
        pipelineHealth,
        modelPerformance,
        feedbackMetrics,
        trainingMetrics,
        driftMetrics,
        alerts
      ] = await Promise.all([
        this.monitoringService.getPipelineHealth(),
        this.performanceService.getModelPerformance(modelVersion || undefined),
        this.feedbackService.getFeedbackMetrics(timeRange),
        this.monitoringService.getTrainingMetrics(timeRange),
        this.driftService.getDriftMetrics(),
        this.monitoringService.getAlerts()
      ]);
      return NextResponse.json({
        pipelineHealth,
        modelPerformance,
        feedbackMetrics,
        trainingMetrics,
        driftMetrics,
        alerts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/admin/ml-monitoring/models - List all ML models
   */
  async listModels(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse query parameters
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      // Get models list
      const models = await this.performanceService.listModels({
        status: status || undefined,
        limit,
        offset
      });
      return NextResponse.json(models);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/admin/ml-monitoring/models/train - Trigger model training
   */
  async triggerTraining(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting - more restrictive for expensive operations
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000, // 1 hour
        maxRequests: 5, // 5 training jobs per hour
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse request body
      const data = await request.json();
      const { datasetId, hyperparameters, priority = 'normal' } = data;
      // Trigger training job
      const trainingJob = await this.monitoringService.triggerTraining({
        datasetId,
        hyperparameters,
        priority,
        triggeredBy: user!.id
      });
      return NextResponse.json({
        success: true,
        jobId: trainingJob.id,
        status: trainingJob.status,
        estimatedCompletionTime: trainingJob.estimatedCompletionTime
      }, { status: 201 });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/admin/ml-monitoring/performance/[modelId] - Get model performance details
   */
  async getModelPerformance(
    request: NextRequest,
    { params }: { params: { modelId: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse query parameters
      const url = new URL(request.url);
      const includeConfusionMatrix = url.searchParams.get('includeConfusionMatrix') === 'true';
      const includeExamples = url.searchParams.get('includeExamples') === 'true';
      // Get detailed performance metrics
      const performance = await this.performanceService.getDetailedPerformance(
        params.modelId,
        {
          includeConfusionMatrix,
          includeExamples
        }
      );
      return NextResponse.json(performance);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/admin/ml-monitoring/feedback/approve - Approve feedback corrections
   */
  async approveFeedback(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 100,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse request body
      const { feedbackIds, notes } = await request.json();
      if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
        return NextResponse.json(
          { error: 'Feedback IDs required' },
          { status: 400 }
        );
      }
      // Approve feedback items
      const result = await this.feedbackService.approveFeedback(
        feedbackIds,
        user!.id,
        notes
      );
      return NextResponse.json({
        success: true,
        approved: result.approved,
        failed: result.failed,
        message: `Approved ${result.approved} feedback items`
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/admin/ml-monitoring/drift - Get drift detection details
   */
  async getDriftAnalysis(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse query parameters
      const url = new URL(request.url);
      const modelId = url.searchParams.get('modelId');
      const timeRange = url.searchParams.get('timeRange') || '30d';
      // Get drift analysis
      const driftAnalysis = await this.driftService.analyzeDrift({
        modelId: modelId || undefined,
        timeRange
      });
      return NextResponse.json(driftAnalysis);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/admin/ml-monitoring/alerts/acknowledge - Acknowledge alerts
   */
  async acknowledgeAlerts(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 50,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse request body
      const { alertIds, action, notes } = await request.json();
      // Acknowledge alerts
      const result = await this.monitoringService.acknowledgeAlerts(
        alertIds,
        user!.id,
        action,
        notes
      );
      return NextResponse.json({
        success: true,
        acknowledged: result.acknowledged,
        message: `Acknowledged ${result.acknowledged} alerts`
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/admin/ml-monitoring/experiments - Get experiment tracking data
   */
  async getExperiments(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Authentication and admin check
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      // Parse query parameters
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      // Get experiments
      const experiments = await this.monitoringService.getExperiments({
        status: status || undefined,
        limit,
        offset
      });
      return NextResponse.json(experiments);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `${ip}:${request.url}`;
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
}
// Export singleton instance
export const mlMonitoringController = new MLMonitoringController();
