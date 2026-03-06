import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeJobDescription, sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { checkJobCreationRateLimit } from '@/lib/rate-limiter';
import { BadRequestError, RateLimitError, ForbiddenError } from '@/lib/errors/api-error';
import { JobQueryService } from '@/lib/services/job-query-service';
import { JobCreationService } from '@/lib/services/job-creation-service';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').transform(val => sanitizeText(val, 200)),
  description: z.string().max(5000).optional().transform(val => val ? sanitizeJobDescription(val) : val),
  status: z.string().optional().transform(val => val ? sanitizeText(val, 50) : val),
  category: z.string().max(128).optional().transform(val => val ? sanitizeText(val, 128) : val),
  budget: z.coerce.number().positive().optional(),
  budget_min: z.coerce.number().positive().optional(),  // Minimum budget (range)
  budget_max: z.coerce.number().positive().optional(),  // Maximum budget (range)
  show_budget_to_contractors: z.boolean().optional(),  // Whether to show exact budget
  require_itemized_bids: z.boolean().optional(),  // Whether to require itemization
  location: z.string().max(256).optional().transform(val => val ? sanitizeText(val, 256) : val),
  photoUrls: z.array(z.string().url()).optional(),
  requiredSkills: z.array(z.string().max(100)).max(10).optional(),
  property_id: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const GET = withApiHandler(
  { csrf: false },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: url.searchParams.getAll('status') ?? undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError('Invalid query parameters');
    }

    const { limit, cursor, status } = parsed.data;
    const { items, nextCursor } = await JobQueryService.getInstance().listJobs(
      { id: user.id, role: user.role },
      { limit, cursor, status }
    );

    return NextResponse.json({ jobs: items, nextCursor });
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request: NextRequest, { user }) => {
    // Rate limiting: 10 jobs per hour per user
    const skipRateLimit = process.env.NODE_ENV === 'development';

    if (!skipRateLimit) {
      const rateLimitResult = await checkJobCreationRateLimit(user.id);

      if (!rateLimitResult.allowed) {
        logger.warn('Job creation rate limit exceeded', {
          service: 'jobs',
          userId: user.id,
          remaining: rateLimitResult.remaining,
          retryAfter: rateLimitResult.retryAfter,
        });

        throw new RateLimitError(rateLimitResult.retryAfter);
      }
    }

    // Phone verification for homeowners (only skipped in development)
    // SECURITY: SKIP_PHONE_VERIFICATION env var is ignored — verification is mandatory in production
    const skipVerification = process.env.NODE_ENV === 'development';

    if (user.role === 'homeowner' && !skipVerification) {
      const { HomeownerVerificationService } = await import('@/lib/services/verification/HomeownerVerificationService');
      const verificationStatus = await HomeownerVerificationService.isFullyVerified(user.id);

      if (!verificationStatus.canPostJobs) {
        throw new ForbiddenError('Phone verification required. Please verify your phone number before posting jobs');
      }
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, createJobSchema);
    if ('headers' in validation) {
      logger.error('Job creation validation failed', {
        service: 'jobs',
        userId: user.id,
      });
      return validation;
    }

    const payload = validation.data;
    const job = await JobCreationService.getInstance().createJob(user, payload);

    logger.info('Job created successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: job.id,
      title: job.title,
      photoCount: payload.photoUrls?.length || 0,
    });

    return NextResponse.json({ job }, { status: 201 });
  }
);
