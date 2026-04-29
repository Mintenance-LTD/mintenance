import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJobRequestSchema } from '@mintenance/api-contracts';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { checkJobCreationRateLimit } from '@/lib/rate-limiter';
import {
  BadRequestError,
  RateLimitError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import { JobQueryService } from '@/lib/services/job-query-service';
import { JobCreationService } from '@/lib/services/job-creation-service';

import { withApiHandler } from '@/lib/api/with-api-handler';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
  propertyId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  category: z.string().optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
});

// The job-create schema lives in @mintenance/api-contracts so web +
// mobile validate against the same shape. Sanitization happens in the
// handler below — packages/api-contracts is intentionally pure Zod
// (no DOMPurify) per the package's design comment.
//
// `.strict()` is applied inside createJobRequestSchema (SECURITY:
// rejects unknown keys to block mass-assignment).

export const GET = withApiHandler(
  { csrf: false },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    // Support both array status (web) and single status (mobile)
    const statusParams = url.searchParams.getAll('status');
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: statusParams.length > 0 ? statusParams : undefined,
      propertyId: url.searchParams.get('propertyId') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      minBudget: url.searchParams.get('minBudget') ?? undefined,
      maxBudget: url.searchParams.get('maxBudget') ?? undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError('Invalid query parameters');
    }

    const {
      limit,
      cursor,
      status,
      propertyId,
      search,
      category,
      minBudget,
      maxBudget,
    } = parsed.data;
    const { items, nextCursor } = await JobQueryService.getInstance().listJobs(
      { id: user.id, role: user.role },
      {
        limit,
        cursor,
        status,
        propertyId,
        search,
        category,
        minBudget,
        maxBudget,
      }
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

    // Phone verification for homeowners
    // Can be skipped via SKIP_PHONE_VERIFICATION=true env var (useful for testing/early access)
    const skipVerification =
      process.env.NODE_ENV === 'development' ||
      process.env.SKIP_PHONE_VERIFICATION === 'true';

    if (user.role === 'homeowner' && !skipVerification) {
      const { HomeownerVerificationService } =
        await import('@/lib/services/verification/HomeownerVerificationService');
      const verificationStatus =
        await HomeownerVerificationService.isFullyVerified(user.id);

      if (!verificationStatus.canPostJobs) {
        throw new ForbiddenError(
          'Phone verification required. Please verify your phone number before posting jobs'
        );
      }
    }

    // Parse and validate input using Zod schema
    // Strip null values first (client sends property_id: null for unset fields)
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const cleanBody = Object.fromEntries(
      Object.entries(rawBody).filter(([, v]) => v !== null)
    );
    const parsed = createJobRequestSchema.safeParse(cleanBody);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      logger.error('Job creation validation failed', {
        service: 'jobs',
        userId: user.id,
        validationErrors: errors,
      });
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Apply web-only sanitization on top of the validated payload.
    // The shared schema deliberately keeps sanitize-text out of the
    // contract so mobile (which has no DOM) doesn't pull DOMPurify.
    const { priority, ...rest } = parsed.data;
    const payload = {
      ...rest,
      title: sanitizeText(rest.title, 200),
      description: rest.description
        ? sanitizeText(rest.description, 5000)
        : rest.description,
      status: rest.status ? sanitizeText(rest.status, 50) : rest.status,
      location: rest.location
        ? sanitizeText(rest.location, 256)
        : rest.location,
      urgency: rest.urgency ?? priority,
    };
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
