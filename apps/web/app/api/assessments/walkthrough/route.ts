import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { checkAICostBudget } from '@/lib/ai/cost-budget';
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';
import { validateImageUrls } from '@/app/api/building-surveyor/assess/_image-validation';
import { assessWalkthrough } from '@/lib/services/building-surveyor/video/walkthrough-assessment';
import type { AssessmentContext } from '@/lib/services/building-surveyor/types';
import {
  persistWalkthroughRow,
  scheduleWalkthroughTraining,
} from './_persist-and-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A walkthrough fans N frames through GPT-4 Vision (bounded concurrency), so it
// can run materially longer than a single-photo assess. 300s is the ceiling.
export const maxDuration = 300;

const MIN_FRAMES = 2; // fewer than 2 is just a photo assess — use /building-surveyor/assess
const MAX_FRAMES = 20; // cost ceiling: 20 GPT-4o vision calls per walkthrough

const walkthroughSchema = z
  .object({
    frameUrls: z.array(z.string().url()).min(MIN_FRAMES).max(MAX_FRAMES),
    propertyId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    domain: z.string().optional(),
    // Context is passed straight to the surveyor pipeline; keep it permissive.
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => Boolean(b.propertyId || b.jobId), {
    message: 'propertyId or jobId is required to anchor the walkthrough',
  });

function cacheKeyFor(frameUrls: string[]): string {
  return crypto
    .createHash('sha256')
    .update([...frameUrls].sort().join('|'))
    .digest('hex');
}

/**
 * POST /api/assessments/walkthrough
 *
 * VLM-native video walkthrough (no SAM2). The mobile client extracts keyframes
 * on-device, uploads them, and posts the frame URLs here. Each frame runs
 * through the normal surveyor pipeline; the per-frame results are merged into
 * ONE property survey and persisted as a single building_assessments row.
 *
 * Training capture is PER FRAME (cheap DB writes, each frame's findings paired
 * with that frame's own pixels). The student VLM shadow fires exactly ONCE, on
 * the lead (most-severe) frame — apples-to-apples, one Modal cold-start, not N.
 */
export const POST = withApiHandler(
  { auth: true, rateLimit: { maxRequests: 3 } },
  async (request, { user }) => {
    // Per-user rolling AI cost cap — a walkthrough is N vision calls, so this
    // guard matters more here than on a single assess.
    const budget = await checkAICostBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json(
        {
          error:
            budget.reason === 'monthly_cap_exceeded'
              ? 'Monthly AI usage limit reached. Please contact support to increase your quota.'
              : 'Daily AI usage limit reached. Please try again tomorrow or contact support.',
          code: budget.reason,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = walkthroughSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid walkthrough request'
      );
    }
    const {
      frameUrls,
      propertyId,
      jobId,
      domain: bodyDomain,
      context,
    } = parsed.data;

    // HTTPS + SSRF validation (same gate as the photo assess route).
    validateImageUrls(frameUrls, {
      BadRequestError,
      logger,
      userId: user.id,
    });

    // Tenant ownership: authorize the property anchor (mirrors videos/upload).
    if (propertyId) {
      const { authorized } = await PropertyTeamService.authorize(
        user.id,
        propertyId,
        'view'
      );
      if (!authorized) {
        logger.warn('Walkthrough denied — property access', {
          service: 'assessment-walkthrough',
          userId: user.id,
          propertyId,
        });
        throw new ForbiddenError('You do not have access to this property');
      }
    }

    const domain = bodyDomain ?? 'building';
    const cacheKey = cacheKeyFor(frameUrls);

    // Fan out across frames and merge into one property survey.
    const { assessment, perFrameAssessments, frameCount, framesAssessed } =
      await assessWalkthrough(
        frameUrls,
        context as AssessmentContext | undefined
      );

    if (!assessment || perFrameAssessments.length === 0) {
      logger.warn('Walkthrough produced no usable frame assessment', {
        service: 'assessment-walkthrough',
        userId: user.id,
        frameCount,
      });
      return NextResponse.json(
        {
          error:
            'Could not assess any frame in the walkthrough. Please re-record with better lighting and steadier framing.',
          frameCount,
          framesAssessed,
        },
        { status: 422 }
      );
    }

    // Persist ONE merged row. Mirror the proven assess-route insert columns.
    const assessmentId = await persistWalkthroughRow({
      userId: user.id,
      jobId,
      propertyId,
      domain,
      cacheKey,
      assessment,
    });

    if (!assessmentId) {
      throw new Error('Failed to persist walkthrough assessment');
    }

    // Save the frame images against the row (best-effort).
    try {
      await serverSupabase.from('assessment_images').insert(
        frameUrls.map((url, index) => ({
          assessment_id: assessmentId,
          image_url: url,
          image_index: index,
        }))
      );
    } catch (imgErr) {
      logger.warn('Failed to save walkthrough frame images', {
        service: 'assessment-walkthrough',
        assessmentId,
        error: imgErr instanceof Error ? imgErr.message : String(imgErr),
      });
    }

    // Training corpus (per-frame) + ONE lead-frame student shadow, scheduled on
    // after() so the work outlives the response.
    scheduleWalkthroughTraining({
      assessmentId,
      perFrameAssessments,
      context: context as AssessmentContext | undefined,
      openaiApiKey: getConfig().openaiApiKey,
    });

    logger.info('Walkthrough assessment completed', {
      service: 'assessment-walkthrough',
      userId: user.id,
      assessmentId,
      frameCount,
      framesAssessed,
      findings: assessment.findings?.length ?? 0,
      primaryDamage: assessment.damageAssessment.damageType,
    });

    return NextResponse.json({
      ...assessment,
      assessmentId,
      frameCount,
      framesAssessed,
    });
  }
);
