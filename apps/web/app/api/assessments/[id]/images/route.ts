/**
 * POST /api/assessments/[id]/images
 *
 * Attaches storage URLs to an existing assessment after the mobile
 * client has uploaded them. Two-step flow:
 *   1) POST /api/assessments  -> { assessment.id }
 *   2) (client) upload photos to assessment-photos/<id>/<n>.jpg
 *   3) POST /api/assessments/<id>/images { urls: [...] }
 *
 * Storage uploads stay client-side (the bucket has its own RLS) but
 * the metadata insert is now server-only so a malicious caller cannot
 * attach image rows to an assessment they do not own.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

const bodySchema = z
  .object({
    urls: z.array(z.string().url()).min(1).max(40),
    /** Starting index — defaults to current image_count for the assessment. */
    start_index: z.number().int().min(0).optional(),
  })
  .strict();

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const assessmentId = params.id;
    if (!assessmentId || typeof assessmentId !== 'string') {
      throw new BadRequestError('Assessment id is required');
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Ownership check — admins can also attach (handy for back-fills).
    const { data: assessment, error: ownerError } = await serverSupabase
      .from('building_assessments')
      .select('id, user_id')
      .eq('id', assessmentId)
      .maybeSingle();

    if (ownerError || !assessment) {
      throw new NotFoundError('Assessment not found');
    }
    if (assessment.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to attach images to this assessment'
      );
    }

    // Resolve the starting image_index. If the caller didn't provide one,
    // append after whatever already exists so re-runs don't collide.
    let startIndex = parsed.data.start_index;
    if (startIndex == null) {
      const { count } = await serverSupabase
        .from('assessment_images')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId);
      startIndex = count ?? 0;
    }

    const imageRows = parsed.data.urls.map((url, idx) => ({
      assessment_id: assessmentId,
      image_url: url,
      image_index: startIndex + idx,
    }));

    const { error: insertError } = await serverSupabase
      .from('assessment_images')
      .insert(imageRows);

    if (insertError) {
      logger.error('Assessment images insert failed', insertError, {
        service: 'assessments',
        assessmentId,
        userId: user.id,
        urlCount: parsed.data.urls.length,
      });
      throw new InternalServerError('Failed to attach images');
    }

    logger.info('Assessment images attached', {
      service: 'assessments',
      assessmentId,
      userId: user.id,
      attached: parsed.data.urls.length,
      startIndex,
    });

    return NextResponse.json(
      { attached: parsed.data.urls.length, start_index: startIndex },
      { status: 201 }
    );
  }
);
