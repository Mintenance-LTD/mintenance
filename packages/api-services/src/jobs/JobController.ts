/**
 * Job Controller - Thin HTTP Layer
 * Handles HTTP requests and responses, delegates to service layer
 */
import { JobService } from './JobService';
import { JobRecord, JobSummary, JobDetail, CreateJobData, ListJobsParams, JobStatus } from './types';
import { logger } from '@mintenance/shared';
import { User } from '../users';
// Temporary types until proper imports are fixed
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<any>;
}
interface NextResponse {
  json(data: any, init?: ResponseInit): NextResponse;
}
// Mock NextResponse implementation
const NextResponse = {
  json(data: any, init?: ResponseInit): any {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};

// Mock auth function
async function getCurrentUserFromCookies(): Promise<User | null> {
  // TODO: Implement actual auth
  return {
    id: 'test-user',
    email: 'test@example.com',
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
// Mock CSRF function
async function requireCSRF(request: NextRequest): Promise<void> {
  // TODO: Implement CSRF check
}
// Mock rate limit
async function checkRateLimit(request: NextRequest, options: any) {
  return { allowed: true };
}
// Mock error handler
function handleAPIError(error: any): any {
  logger.error('API Error:', error);
  return NextResponse.json(
    { error: error.message || 'Internal server error' },
    { status: 500 }
  );
}
// Mock Supabase client
const serverSupabase = {} as any;
export class JobController {
  private jobService: JobService;
  constructor() {
    this.jobService = new JobService({
      supabase: serverSupabase,
      enableAIAssessment: true,
      enableNotifications: true,
      enableGeocoding: true,
    });
  }
  /**
   * GET /api/jobs - List jobs
   */
  async listJobs(request: NextRequest): Promise<any> {
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
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Parse query parameters
      const url = new URL(request.url);
      const params = {
        limit: parseInt(url.searchParams.get('limit') || '20'),
        cursor: url.searchParams.get('cursor') || undefined,
        status: url.searchParams.getAll('status') as JobStatus[],
        userId: user.id,
        userRole: user.role,
      };
      // Call service
      const result = await this.jobService.listJobs(params);
      // Return response
      return NextResponse.json(result);
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/jobs - Create job
   */
  async createJob(request: NextRequest): Promise<any> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 3600000, // 1 hour
        maxRequests: 10, // 10 jobs per hour
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Only homeowners can create jobs
      if (user.role !== 'homeowner' && user.role !== 'admin') {
        return NextResponse.json({ error: 'Only homeowners can create jobs' }, { status: 403 });
      }
      // Parse request body
      const data = await request.json();
      // Call service
      const job = await this.jobService.createJob(data, user);
      // Return response
      return NextResponse.json(job, { status: 201 });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/jobs/[id] - Get single job
   */
  async getJob(request: NextRequest, { params }: { params: { id: string } }): Promise<any> {
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
      // Authentication
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Call service
      const job = await this.jobService.getJob(params.id, user);
      // Return response
      return NextResponse.json(job);
    } catch (error) {
      if (error instanceof Error && error.message === 'Job not found') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return handleAPIError(error);
    }
  }
  /**
   * PUT /api/jobs/[id] - Update job
   */
  async updateJob(request: NextRequest, { params }: { params: { id: string } }): Promise<any> {
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
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Parse request body
      const data = await request.json();
      // Call service
      const job = await this.jobService.updateJob(params.id, data, user);
      // Return response
      return NextResponse.json(job);
    } catch (error) {
      if (error instanceof Error && error.message === 'Job not found') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return handleAPIError(error);
    }
  }
  /**
   * DELETE /api/jobs/[id] - Delete job
   */
  async deleteJob(request: NextRequest, { params }: { params: { id: string } }): Promise<any> {
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
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Call service
      await this.jobService.deleteJob(params.id, user);
      // Return response
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'Job not found') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
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
  private rateLimitResponse(rateLimitResult: any): any {
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
export const jobController = new JobController();
