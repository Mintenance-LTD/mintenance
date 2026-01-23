/**
 * Job Details Controller - Handles single job operations
 * GET /api/jobs/[id] - Get job details
 * PUT /api/jobs/[id] - Full update
 * PATCH /api/jobs/[id] - Partial update (status changes)
 * DELETE /api/jobs/[id] - Delete job
 */
import { JobService } from './JobService';
import type { Job } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import { JobDetailsService } from './JobDetailsService';
import { JobStatusService } from './JobStatusService';
// Temporary types until proper imports
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<unknown>;
}
// Mock NextResponse
const NextResponse = {
  json(data: Record<string, unknown>, init?: ResponseInit): unknown {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};
// Temporary user type
interface User {
  id: string;
  email: string;
  role: string;
}
// Mock functions - to be replaced with actual implementations
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'test-user', email: 'test@example.com', role: 'homeowner' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // TODO: Implement CSRF check
}
async function checkRateLimit(request: NextRequest, options: Record<string, unknown>) {
  return { allowed: true };
}
function handleAPIError(error: unknown): unknown {
  logger.error('API Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Mock Supabase client
const serverSupabase = {} as any;
export class JobDetailsController {
  private jobService: JobService;
  private jobDetailsService: JobDetailsService;
  private jobStatusService: JobStatusService;
  constructor() {
    const config = {
      supabase: serverSupabase,
      enableAIAssessment: true,
      enableNotifications: true,
      enableGeocoding: true,
    };
    this.jobService = new JobService(config);
    this.jobDetailsService = new JobDetailsService(config);
    this.jobStatusService = new JobStatusService(config);
  }
  /**
   * GET /api/jobs/[id] - Get job details with full relationships
   */
  async getJob(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<unknown> {
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
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required to view job' },
          { status: 401 }
        );
      }
      // Get job with enhanced details
      const job = await this.jobDetailsService.getJobWithDetails(
        params.id,
        user
      );
      // Track view if contractor
      if (user.role === 'contractor') {
        await this.jobDetailsService.trackJobView(params.id, user.id);
      }
      return NextResponse.json(job);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * PUT /api/jobs/[id] - Full update of job
   */
  async updateJob(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<unknown> {
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
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse and validate request body
      const data = await request.json();
      // Perform full update
      const updatedJob = await this.jobDetailsService.updateJobFull(
        params.id,
        data,
        user
      );
      // Run AI analysis if requested
      if (data.analyzeWithAI && data.images?.length) {
        await this.jobDetailsService.runAIAnalysis(
          params.id,
          data.images,
          data.runBuildingSurvey
        );
      }
      return NextResponse.json(updatedJob);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * PATCH /api/jobs/[id] - Partial update (mainly status changes)
   */
  async patchJob(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<unknown> {
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
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse request body
      const data = await request.json();
      // Handle status changes specially
      if (data.status) {
        const updatedJob = await this.jobStatusService.updateJobStatus(
          params.id,
          data.status,
          user,
          data.reason
        );
        // Trigger notifications based on status change
        await this.jobStatusService.handleStatusChangeNotifications(
          params.id,
          data.status,
          user
        );
        return NextResponse.json(updatedJob);
      }
      // For other partial updates
      const updatedJob = await this.jobDetailsService.updateJobPartial(
        params.id,
        data,
        user
      );
      return NextResponse.json(updatedJob);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * DELETE /api/jobs/[id] - Soft delete job
   */
  async deleteJob(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<unknown> {
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
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Soft delete the job
      await this.jobDetailsService.deleteJob(params.id, user);
      return NextResponse.json(
        { message: 'Job deleted successfully' },
        { status: 200 }
      );
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `${ip}:${request.url}`;
  }
  /**
   * Create rate limit response
   */
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
export const jobDetailsController = new JobDetailsController();
