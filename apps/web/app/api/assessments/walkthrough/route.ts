import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { checkAICostBudget } from '@/lib/ai/cost-budget';
import { isSupportedImage } from '@/lib/api/image-signature';
import { signAssessmentPath } from '@/lib/api/assessment-storage';
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';
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
const MAX_FRAME_BYTES = 8 * 1024 * 1024; // 8MB/frame — a keyframe is well under this
const FRAME_BUCKET = 'assessment-photos';

// isSupportedImage now lives in @/lib/api/image-signature so the assessment
// photo-upload route enforces exactly the same signature check.

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

    // NOTE: this extraction + frame-count validation was dropped in the
    // `main` merge (e7edaff6e) that reconciled the multipart handler with an
    // older URL-based branch, leaving `files` undefined. Restored here.
    const files = form
      .getAll('frames')
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (!propertyId && !jobId) {
      throw new BadRequestError(
        'propertyId or jobId is required to anchor the walkthrough'
      );
    }
    if (files.length < MIN_FRAMES) {
      throw new BadRequestError(`At least ${MIN_FRAMES} frames are required`);
    }
    if (files.length > MAX_FRAMES) {
      throw new BadRequestError(`At most ${MAX_FRAMES} frames are allowed`);
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

    // The room arrives in client-supplied context, so it is a claim, not an
    // anchor. Persisting it unchecked would let anyone file a survey against
    // another property's room. Only a room that genuinely belongs to the
    // property we just authorised is kept; anything else is dropped and the
    // assessment stays property-scoped.
    let roomId: string | undefined;
    const claimedRoomId = context?.room?.id;
    if (claimedRoomId && propertyId) {
      const { data: room } = await serverSupabase
        .from('property_rooms')
        .select('id')
        .eq('id', claimedRoomId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (room?.id) {
        roomId = room.id;
      } else {
        logger.warn('Walkthrough room ignored — not part of this property', {
          service: SERVICE,
          propertyId,
          claimedRoomId,
          userId: user.id,
        });
      }
    }

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
      roomId,
      domain,
      cacheKey,
      assessment,
    });
    if (!assessmentId) {
      throw new Error('Failed to persist walkthrough assessment');
    }

    // Link the frames to the row. Still non-fatal — the survey itself is worth
    // keeping — but no longer silent.
    //
    // 2026-07-28: this failed on EVERY walkthrough and nobody could tell.
    // assessment_images_image_index_check capped image_index at < 4 (inherited
    // from the 4-photo assessment flow) while a walkthrough inserts up to 20
    // frames in ONE statement, so the whole batch failed atomically. Worse, the
    // try/catch below could never have reported it: supabase-js returns
    // `{ error }` rather than throwing, and the return value was discarded, so
    // the catch never fired and not even a warning was written. Production
    // ended up with 53 frames in the bucket and zero rows here — which is why
    // a finding could not show the image it came from. The constraint is fixed
    // in migration 20260728…; this makes the next failure visible.
    const { error: imgErr } = await serverSupabase
      .from('assessment_images')
      .insert(
        frameUrls.map((url, index) => ({
          assessment_id: assessmentId,
          image_url: url,
          image_index: index,
        }))
      );

    if (imgErr) {
      logger.error(
        'Failed to link walkthrough frames to the assessment',
        new Error(imgErr.message),
        {
          service: SERVICE,
          assessmentId,
          frameCount: frameUrls.length,
          code: imgErr.code,
          // Without these rows the survey renders with no source images.
          impact: 'assessment saved without its frames',
        }
      );
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
 * Upload keyframe files to the assessment-photos bucket under quick-ai/.
 * Runs with the service role, so client-side storage RLS is not involved. A
 * frame that fails to store is logged and skipped (a bad frame must not sink
 * the walk); the surviving URLs are returned in order.
 *
 * The bucket went private in migration 20260726135946, so these are signed
 * URLs. They are persisted into assessment_images as well as consumed by the
 * vision call, so they take the long default TTL; read paths re-sign via
 * resignAssessmentUrls rather than trusting a stored URL forever.
 */
async function uploadFramesToStorage(
  files: File[],
  folderId: string
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const file = files[i]!;
      // SEC-002 hardening: skip oversize or non-image frames rather than
      // stamping arbitrary bytes with image/jpeg. Skips count like failed
      // uploads — the caller's MIN_FRAMES gate rejects the walk if too many
      // frames drop out.
      if (file.size > MAX_FRAME_BYTES) {
        logger.warn('Walkthrough frame skipped — over size cap', {
          service: SERVICE,
          index: i,
          size: file.size,
        });
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!isSupportedImage(buffer)) {
        logger.warn('Walkthrough frame skipped — not a recognised image', {
          service: SERVICE,
          index: i,
        });
        continue;
      }
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
      const signed = await signAssessmentPath(path);
      if (!signed) {
        logger.warn('Walkthrough frame could not be signed', {
          service: SERVICE,
          index: i,
        });
        continue;
      }
      urls.push(signed);
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
