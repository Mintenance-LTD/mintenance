/**
 * POST /api/assessments/photo-upload   (multipart/form-data)
 *
 * Server-mediated upload for assessment photographs.
 *
 * Why this exists: React Native's direct-to-Supabase upload never landed bytes
 * — the `assessment-photos` bucket had zero objects for its entire life, and
 * the walkthrough route already carries the same note. Both mobile photo paths
 * (the assessment wizard and the quick-AI single shot) previously did
 * `fetch(uri) -> blob -> arrayBuffer -> storage.upload` and swallowed the
 * failure into a `logger.warn`, so an assessment saved with zero photos looked
 * successful to the user. The phone now streams the file over the proven
 * Bearer-authed API and the server owns storage, exactly like
 * /api/assessments/walkthrough.
 *
 * The bucket is private (migration 20260726135946), so this returns signed
 * URLs. Callers persist them via POST /api/assessments/[id]/images, and render
 * paths should re-sign with `resignAssessmentUrls` rather than trusting a
 * stored URL forever.
 *
 * Form fields:
 *   photos        one or more image files (required)
 *   assessmentId  optional — when present the photos are filed under that
 *                 assessment and ownership is enforced; otherwise they land in
 *                 the caller's own quick-ai folder.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { imageKindFromBytes } from '@/lib/api/image-signature';
import { signAssessmentPath } from '@/lib/api/assessment-storage';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

const SERVICE = 'assessment-photo-upload';
const BUCKET = 'assessment-photos';
const MAX_PHOTOS = 12;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB, matching the walkthrough cap

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new BadRequestError('Expected multipart/form-data');
    }

    const files = form
      .getAll('photos')
      .filter(
        (f): f is File => typeof f === 'object' && f !== null && 'size' in f
      );

    if (files.length === 0) {
      throw new BadRequestError('At least one photo is required');
    }
    if (files.length > MAX_PHOTOS) {
      throw new BadRequestError(`At most ${MAX_PHOTOS} photos are allowed`);
    }

    // Optional anchor. When given, the caller must own the assessment —
    // otherwise anyone could file photos onto someone else's record.
    const rawAssessmentId = form.get('assessmentId');
    const assessmentId =
      typeof rawAssessmentId === 'string' && rawAssessmentId.trim()
        ? rawAssessmentId.trim()
        : null;

    if (assessmentId) {
      const { data: assessment } = await serverSupabase
        .from('building_assessments')
        .select('id, user_id')
        .eq('id', assessmentId)
        .maybeSingle();

      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }
      if (assessment.user_id !== user.id && user.role !== 'admin') {
        throw new ForbiddenError(
          'You do not have permission to add photos to this assessment'
        );
      }
    }

    const stamp = Date.now();
    const urls: string[] = [];
    const skipped: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;

      if (file.size > MAX_PHOTO_BYTES) {
        logger.warn('Assessment photo skipped — over size cap', {
          service: SERVICE,
          index: i,
          size: file.size,
        });
        skipped.push(i);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      // Derive the type from the bytes, never the client's header: the old
      // quick-AI path labelled every non-PNG upload image/jpeg, so a HEIC
      // photo was stored as JPEG and the vision call got undecodable bytes.
      const kind = imageKindFromBytes(buffer);
      if (!kind) {
        logger.warn('Assessment photo skipped — not a recognised image', {
          service: SERVICE,
          index: i,
        });
        skipped.push(i);
        continue;
      }

      const path = assessmentId
        ? `assessments/${assessmentId}/${stamp}-${i}.${kind.ext}`
        : `quick-ai/${user.id}/${stamp}-${i}.${kind.ext}`;

      const { error } = await serverSupabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: kind.contentType,
          upsert: true,
        });

      if (error) {
        logger.warn('Assessment photo store failed', {
          service: SERVICE,
          index: i,
          error: error.message,
        });
        skipped.push(i);
        continue;
      }

      const signed = await signAssessmentPath(path);
      if (!signed) {
        skipped.push(i);
        continue;
      }
      urls.push(signed);
    }

    // Unlike the old client path, a total failure is an error the caller can
    // act on rather than a warning nobody sees.
    if (urls.length === 0) {
      logger.error(
        'Assessment photo upload stored nothing',
        new Error('all photos failed'),
        { service: SERVICE, userId: user.id, attempted: files.length }
      );
      return NextResponse.json(
        {
          error: 'None of the photos could be uploaded',
          attempted: files.length,
        },
        { status: 502 }
      );
    }

    logger.info('Assessment photos uploaded', {
      service: SERVICE,
      userId: user.id,
      assessmentId,
      stored: urls.length,
      skipped: skipped.length,
    });

    return NextResponse.json(
      { urls, stored: urls.length, skipped },
      { status: 201 }
    );
  }
);
