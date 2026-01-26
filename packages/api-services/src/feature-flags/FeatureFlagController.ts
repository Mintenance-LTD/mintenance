/**
 * Feature Flag Controller - Manage feature flags and rollout strategies
 */
import { FeatureFlagService } from './FeatureFlagService';
import { logger } from '@mintenance/shared';
import { FeatureFlagMetricsService } from './FeatureFlagMetricsService';
import { RollbackService } from './RollbackService';
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
  return { id: 'user-123', email: 'user@example.com', role: 'homeowner' };
}
async function requireAdmin(user: User | null): Promise<void> {
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
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
  logger.error('Feature Flag Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
export enum FeatureFlag {
  SAM3_PRESENCE_DETECTION = 'sam3_presence_detection',
  YOLO_SKIP_OPTIMIZATION = 'yolo_skip_optimization',
  HYBRID_INFERENCE = 'hybrid_inference',
  INTERNAL_MODEL_PRIMARY = 'internal_model_primary',
  DRIFT_DETECTION = 'drift_detection',
  AUTO_ROLLBACK = 'auto_rollback',
  NEW_UI_DASHBOARD = 'new_ui_dashboard',
  ENHANCED_SEARCH = 'enhanced_search',
  AI_RECOMMENDATIONS = 'ai_recommendations',
  SMART_PRICING = 'smart_pricing'
}
export class FeatureFlagController {
  private flagService: FeatureFlagService;
  private metricsService: FeatureFlagMetricsService;
  private rollbackService: RollbackService;
  constructor() {
    const config = {
      supabase: {} as any,
    };
    this.flagService = new FeatureFlagService(config);
    this.metricsService = new FeatureFlagMetricsService(config);
    this.rollbackService = new RollbackService(config);
  }
  /**
   * GET /api/feature-flags - Get feature flags and metrics
   */
  async getFlags(request: NextRequest): Promise<Response> {
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
      // Parse query parameters
      const url = new URL(request.url);
      const flagName = url.searchParams.get('flag');
      const includeMetrics = url.searchParams.get('metrics') === 'true';
      const userId = url.searchParams.get('userId');
      // Get user context for personalization
      const user = await getCurrentUserFromCookies();
      if (flagName) {
        // Get specific flag
        const flag = await this.flagService.getFlag(
          flagName as FeatureFlag,
          user?.id || userId
        );
        if (!flag) {
          return NextResponse.json(
            { error: 'Feature flag not found' },
            { status: 404 }
          );
        }
        let response: Record<string, unknown> = { flag };
        if (includeMetrics) {
          const metrics = await this.metricsService.getFlagMetrics(
            flagName as FeatureFlag,
            { timeRange: '7d' }
          );
          response.metrics = metrics;
        }
        return NextResponse.json(response);
      }
      // Get all flags for user
      const flags = await this.flagService.getAllFlags(user?.id || userId);
      let response: Record<string, unknown> = { flags };
      if (includeMetrics) {
        const metrics = await this.metricsService.getOverallMetrics({
          timeRange: '7d'
        });
        response.metrics = metrics;
      }
      response.timestamp = new Date().toISOString();
      return NextResponse.json(response);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/feature-flags - Create or update a feature flag
   */
  async createOrUpdateFlag(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Admin only
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      const data = await request.json();
      const {
        name,
        description,
        enabled,
        rolloutPercentage,
        rolloutStrategy,
        targetingRules,
        metadata
      } = data;
      if (!name) {
        return NextResponse.json(
          { error: 'Flag name is required' },
          { status: 400 }
        );
      }
      const flag = await this.flagService.createOrUpdateFlag({
        name: name as FeatureFlag,
        description,
        enabled: enabled ?? false,
        rolloutPercentage: rolloutPercentage ?? 0,
        rolloutStrategy: rolloutStrategy ?? 'percentage',
        targetingRules: targetingRules ?? [],
        metadata: metadata ?? {},
        updatedBy: user!.id,
        updatedAt: new Date().toISOString()
      });
      // Log flag change
      await this.flagService.logFlagChange(
        name as FeatureFlag,
        'update',
        user!.id,
        { previous: null, current: flag }
      );
      return NextResponse.json({
        success: true,
        flag,
        message: 'Feature flag updated successfully'
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/feature-flags/metrics - Record feature flag metrics
   */
  async recordMetrics(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting - more lenient for metrics
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 100,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const data = await request.json();
      const { flag, metrics, userId, sessionId, metadata } = data;
      if (!flag || !metrics) {
        return NextResponse.json(
          { error: 'Flag and metrics are required' },
          { status: 400 }
        );
      }
      // Record metrics
      const result = await this.metricsService.recordMetrics({
        flagName: flag as FeatureFlag,
        userId,
        sessionId,
        metrics,
        metadata,
        timestamp: new Date().toISOString()
      });
      // Check for automatic rollback triggers
      if (await this.shouldTriggerAutoRollback(flag, metrics)) {
        await this.triggerAutoRollback(flag, metrics);
      }
      return NextResponse.json({
        success: true,
        id: result.id,
        message: 'Metrics recorded successfully'
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/feature-flags/rollback - Trigger feature flag rollback
   */
  async rollbackFlag(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 5,
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // Admin only
      const user = await getCurrentUserFromCookies();
      await requireAdmin(user);
      const data = await request.json();
      const { flag, reason, automatic = false, metrics } = data;
      if (!flag || !reason) {
        return NextResponse.json(
          { error: 'Flag and reason are required' },
          { status: 400 }
        );
      }
      // Perform rollback
      const rollbackResult = await this.rollbackService.rollback({
        flagName: flag as FeatureFlag,
        reason,
        automatic,
        metrics,
        triggeredBy: user!.id,
        timestamp: new Date().toISOString()
      });
      // Send notifications
      await this.rollbackService.sendNotifications(
        flag as FeatureFlag,
        reason,
        rollbackResult
      );
      return NextResponse.json({
        success: true,
        rollbackId: rollbackResult.id,
        message: `Feature flag ${flag} rolled back successfully`,
        result: rollbackResult
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/feature-flags/targeting-rules - Get targeting rules for a flag
   */
  async getTargetingRules(request: NextRequest): Promise<Response> {
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
      const url = new URL(request.url);
      const flagName = url.searchParams.get('flag');
      if (!flagName) {
        return NextResponse.json(
          { error: 'Flag name is required' },
          { status: 400 }
        );
      }
      const rules = await this.flagService.getTargetingRules(flagName as FeatureFlag);
      return NextResponse.json({
        flag: flagName,
        rules,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/feature-flags/evaluate - Evaluate feature flags for a user
   */
  async evaluateFlags(request: NextRequest): Promise<Response> {
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
      const data = await request.json();
      const { userId, attributes, flags } = data;
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }
      // Evaluate specific flags or all flags
      const flagList = flags || Object.values(FeatureFlag);
      const evaluations: Record<string, any> = {};
      for (const flag of flagList) {
        evaluations[flag] = await this.flagService.evaluateFlag(
          flag as FeatureFlag,
          userId,
          attributes
        );
      }
      // Track evaluations
      await this.metricsService.trackEvaluations(userId, evaluations);
      return NextResponse.json({
        userId,
        evaluations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/feature-flags/experiments - Get A/B test experiments
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
      const url = new URL(request.url);
      const flagName = url.searchParams.get('flag');
      const status = url.searchParams.get('status');
      const experiments = await this.flagService.getExperiments({
        flagName: flagName as FeatureFlag | undefined,
        status: status || undefined
      });
      return NextResponse.json({
        experiments,
        count: experiments.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `feature-flags:${ip}`;
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
  private async shouldTriggerAutoRollback(
    flag: string,
    metrics: unknown
  ): Promise<boolean> {
    // Check if auto-rollback is enabled
    const autoRollbackEnabled = await this.flagService.isAutoRollbackEnabled(
      flag as FeatureFlag
    );
    if (!autoRollbackEnabled) {
      return false;
    }
    // Check metrics against thresholds
    const thresholds = await this.flagService.getRollbackThresholds(
      flag as FeatureFlag
    );
    // Check error rate
    if (metrics.errorRate && thresholds.maxErrorRate) {
      if (metrics.errorRate > thresholds.maxErrorRate) {
        return true;
      }
    }
    // Check latency
    if (metrics.latency && thresholds.maxLatency) {
      if (metrics.latency > thresholds.maxLatency) {
        return true;
      }
    }
    // Check conversion rate drop
    if (metrics.conversionRate && thresholds.minConversionRate) {
      if (metrics.conversionRate < thresholds.minConversionRate) {
        return true;
      }
    }
    return false;
  }
  private async triggerAutoRollback(flag: string, metrics: unknown): Promise<void> {
    logger.warn(`Auto-rollback triggered for flag ${flag}`, metrics);
    await this.rollbackService.rollback({
      flagName: flag as FeatureFlag,
      reason: 'Automatic rollback due to metrics threshold exceeded',
      automatic: true,
      metrics,
      triggeredBy: 'system',
      timestamp: new Date().toISOString()
    });
  }
}
// Export singleton instance
export const featureFlagController = new FeatureFlagController();
