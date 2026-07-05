import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { checkAICostBudget } from '@/lib/ai/cost-budget';
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';
import { validateImageUrls } from '@/app/api/building-surveyor/assess/_image-validation';
import { authorizeAssessmentAnchors } from '@/app/api/building-surveyor/assess/_anchor-authorization';
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
const FRAME_BUCKET = 'assessment-photos';

const SERVICE = 'assessment-walkthrough';

/**
 * POST /api/assessments/walkthrough  (multipart/form-data)
 *
 * VLM-native video walkthrough (no SAM2). The mobile client extracts keyframes
 * on-device and POSTs the frame IMAGES here as multipart files — the server
 * uploads them to storage with the service role (no client-side storage RLS),
 * runs each frame through the surveyor VLM, merges the per-frame findings into
 * ONE property survey, and persists a single building_assessments row.
 *
 * Why server-mediated upload: client-side direct-to-Supabase uploads from React
 * Native never landed bytes (0 objects ever in the bucket), while every
 * server-mediated upload works. The phone now only sends files over the proven
 * Bearer-authed API; the server owns storage.
 *
 * Form fields: frames (1+ image files), propertyId | jobId (anchor), domain?,
 * context? (JSON string).
 */
export const POST = withApiHandler(
  { auth: true, rateLimit: { maxRequests: 3 } },
  async (request, { user }) => {
    // Per-user rolling AI cost cap — a walkthrough is N vision calls.
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

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new BadRequestError(
        'Expected multipart/form-data with frame images'
      );
    }

    const propertyId = (form.get('propertyId') as string | null) || undefined;
    const jobId = (form.get('jobId') as string | null) || undefined;
    const domain = (form.get('domain') as string | null) || 'building';
    const contextRaw = form.get('context') as string | null;
    let context: AssessmentContext | undefined;
    if (contextRaw) {
      try {
        context = JSON.parse(contextRaw) as AssessmentContext;
      } catch {
        throw new BadRequestError('context must be valid JSON');
      }
    }

    // Tenant ownership: authorize BOTH anchors. The propertyId check mirrors
    // videos/upload; the jobId check closes SEC-001 (CWE-639) — without it any
    // authenticated user could persist an assessment bound to someone else's
    // job via the service-role client.
    await authorizeAssessmentAnchors({
      userId: user.id,
      jobId,
      propertyId,
      service: 'assessment-walkthrough',
    });

    // Upload the frames server-side (service role → no client storage RLS).
    const folderId = `${propertyId ?? jobId}-${Date.now()}`;
    const frameUrls = await uploadFramesToStorage(files, folderId);
    if (frameUrls.length < MIN_FRAMES) {
      logger.error('Walkthrough frame upload failed server-side', {
        service: SERVICE,
        userId: user.id,
        received: files.length,
        stored: frameUrls.length,
      });
      return NextResponse.json(
        { error: 'Failed to store walkthrough frames. Please try again.' },
        { status: 502 }
      );
    }

    const cacheKey = crypto
      .createHash('sha256')
      .update([...frameUrls].sort().join('|'))
      .digest('hex');

    // Fan out across frames and merge into one property survey.
    const { assessment, perFrameAssessments, frameCount, framesAssessed } =
      await assessWalkthrough(frameUrls, context);

    if (!assessment || perFrameAssessments.length === 0) {
      logger.warn('Walkthrough produced no usable frame assessment', {
        service: SERVICE,
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
        service: SERVICE,
        assessmentId,
        error: imgErr instanceof Error ? imgErr.message : String(imgErr),
      });
    }

    // Training corpus (per-frame) + ONE lead-frame student shadow, after().
    scheduleWalkthroughTraining({
      assessmentId,
      perFrameAssessments,
      context,
      openaiApiKey: getConfig().openaiApiKey,
    });

    logger.info('Walkthrough assessment completed', {
      service: SERVICE,
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

/**
 * Upload keyframe files to the public assessment-photos bucket under quick-ai/.
 * Runs with the service role, so client-side storage RLS is not involved. A
 * frame that fails to store is logged and skipped (a bad frame must not sink
 * the walk); the surviving public URLs are returned in order.
 */
async function uploadFramesToStorage(
  files: File[],
  folderId: string
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const buffer = Buffer.from(await files[i]!.arrayBuffer());
      const path = `quick-ai/${folderId}/${i}.jpg`;
      const { error } = await serverSupabase.storage
        .from(FRAME_BUCKET)
        .upload(path, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) {
        logger.warn('Walkthrough frame store failed', {
          service: SERVICE,
          index: i,
          error: error.message,
        });
        continue;
      }
      const { data } = serverSupabase.storage
        .from(FRAME_BUCKET)
        .getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch (err) {
      logger.warn('Walkthrough frame store error', {
        service: SERVICE,
        index: i,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return urls;
}
