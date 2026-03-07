import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';
import { checkJobCreationRateLimit } from '@/lib/rate-limiter';
import { BadRequestError, RateLimitError, ForbiddenError } from '@/lib/errors/api-error';
import { JobQueryService } from '@/lib/services/job-query-service';
import { JobCreationService } from '@/lib/services/job-creation-service';

import { withApiHandler } from '@/lib/api/with-api-handler';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});

const VALID_CATEGORIES = [
  'plumbing', 'electrical', 'hvac', 'general', 'appliance', 'landscaping',
  'roofing', 'painting', 'carpentry', 'cleaning', 'flooring', 'tiling',
  'plastering', 'guttering', 'fencing', 'damp', 'pest_control', 'other',
] as const;

const createJobSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be 200 characters or fewer')
    .transform(val => sanitizeText(val, 200)),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional()
    .transform(val => val ? sanitizeText(val, 5000) : val),
  status: z.string().optional().transform(val => val ? sanitizeText(val, 50) : val),
  category: z.enum(VALID_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }),
  }).optional(),
  budget: z.coerce.number().positive('Budget must be positive').max(1_000_000, 'Budget cannot exceed £1,000,000').optional(),
  budget_min: z.coerce.number().positive().max(1_000_000).optional(),
  budget_max: z.coerce.number().positive().max(1_000_000).optional(),
  show_budget_to_contractors: z.boolean().optional(),
  require_itemized_bids: z.boolean().optional(),
  location: z.string()
    .min(3, 'Location must be at least 3 characters')
    .max(256, 'Location must be 256 characters or fewer')
    .optional()
    .transform(val => val ? sanitizeText(val, 256) : val),
  photoUrls: z.array(z.string().url()).max(20, 'Maximum 20 photos allowed').optional(),
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

    // Phone verification for homeowners
    // Can be skipped via SKIP_PHONE_VERIFICATION=true env var (useful for testing/early access)
    const skipVerification = process.env.NODE_ENV === 'development'
      || process.env.SKIP_PHONE_VERIFICATION === 'true';

    if (user.role === 'homeowner' && !skipVerification) {
      const { HomeownerVerificationService } = await import('@/lib/services/verification/HomeownerVerificationService');
      const verificationStatus = await HomeownerVerificationService.isFullyVerified(user.id);

      if (!verificationStatus.canPostJobs) {
        throw new ForbiddenError('Phone verification required. Please verify your phone number before posting jobs');
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
    const parsed = createJobSchema.safeParse(cleanBody);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      logger.error('Job creation validation failed', {
        service: 'jobs',
        userId: user.id,
        validationErrors: errors,
      });
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const payload = parsed.data;
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
