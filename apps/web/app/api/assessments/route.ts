/**
 * POST /api/assessments
 *
 * Homeowner-facing endpoint for creating a property assessment plus its
 * linked images, replacing the direct-Supabase inserts the mobile
 * `PropertyAssessmentScreen` previously did. The admin endpoint at
 * `/api/admin/building-assessments` is moderation-only and not suitable
 * for end-user submissions.
 *
 * Inserts into `building_assessments` (with the required NOT NULL
 * defaults — severity 'early', urgency 'monitor', etc. — that the AI
 * pipeline overwrites later when it analyses the photos), then
 * fan-inserts `assessment_images` for each provided URL. Returns the
 * created assessment id so the client can fire the AI-analysis hook.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

const gpsSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict()
  .optional()
  .nullable();

const roomMetadataSchema = z
  .object({
    room: z.string().max(120).optional().nullable(),
    floor: z.union([z.number().int(), z.string()]).optional().nullable(),
  })
  .passthrough()
  .optional()
  .nullable();

const createAssessmentSchema = z
  .object({
    property_id: z.string().uuid().optional().nullable(),
    assessment_data: z.record(z.string(), z.unknown()),
    gps: gpsSchema,
    room_metadata: roomMetadataSchema,
    image_urls: z.array(z.string().url()).max(40).optional(),
  })
  .strict();

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const parsed = createAssessmentSchema.safeParse(raw);
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

    const { property_id, assessment_data, gps, room_metadata, image_urls } =
      parsed.data;

    // 2026-04-30 audit P1 follow-up: merge into the in-flight video-
    // walkthrough row when it exists. The mobile assessment flow opens
    // VideoCapture before the user submits — VideoCapture uploads with
    // only `propertyId`, which causes /api/assessments/videos/upload
    // to mint a temporary `damage_type='video_walkthrough'` row in
    // `validation_status='processing'`. Submitting the full assessment
    // then created a SECOND row, so the live DB ended up with two
    // rows per assessment and the AI pipeline only enriched one of
    // them. Detect that situation here and UPDATE-in-place so each
    // assessment yields exactly one row.
    let existingVideoRowId: string | null = null;
    if (property_id) {
      const { data: existingVideo } = await serverSupabase
        .from('building_assessments')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', property_id)
        .eq('damage_type', 'video_walkthrough')
        .eq('validation_status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingVideo?.id) {
        existingVideoRowId = existingVideo.id;
      }
    }

    // P0 / 2026-04-30 audit: ownership check. The endpoint previously
    // accepted any property_id without verifying the caller has access,
    // creating a cross-tenant data-integrity risk (assessment row written
    // against another homeowner's property). PropertyTeamService.authorize
    // returns true for the owner OR an accepted team member with 'view'
    // rights, which mirrors the matrix the PUT/DELETE property routes use.
    if (property_id) {
      const { authorized } = await PropertyTeamService.authorize(
        user.id,
        property_id,
        'view'
      );
      if (!authorized) {
        logger.warn('Assessment create denied — property access', {
          service: 'assessments',
          userId: user.id,
          propertyId: property_id,
        });
        throw new ForbiddenError('You do not have access to this property');
      }
    }

    let assessmentId: string;

    if (existingVideoRowId) {
      // Promote the in-flight video-walkthrough row to a full assessment.
      // We deliberately keep validation_status at the row's current
      // value (likely 'processing') so the AI agent picks it up and
      // overwrites the placeholder damage_type / severity later — the
      // data flow is identical to a fresh row, just one row not two.
      const updateRow: Record<string, unknown> = {
        damage_type: 'general_damage',
        damage_type_canonical: 'general_damage',
        assessment_data: {
          ...assessment_data,
          merged_from_video_walkthrough: true,
        },
      };
      if (gps) {
        updateRow.latitude = gps.latitude;
        updateRow.longitude = gps.longitude;
      }
      if (
        room_metadata &&
        (room_metadata.room || room_metadata.floor != null)
      ) {
        updateRow.room_metadata = room_metadata;
      }

      const { error: updateError } = await serverSupabase
        .from('building_assessments')
        .update(updateRow)
        .eq('id', existingVideoRowId)
        .eq('user_id', user.id);

      if (updateError) {
        // Don't fall back to insert silently — that re-creates the
        // dual-row problem. Surface the merge failure so the mobile
        // client can retry deterministically.
        logger.error('Video-walkthrough merge failed', updateError, {
          service: 'assessments',
          userId: user.id,
          existingVideoRowId,
        });
        throw new InternalServerError(
          'Failed to merge into existing video-walkthrough assessment'
        );
      }

      assessmentId = existingVideoRowId;
      logger.info('Assessment merged into video-walkthrough row', {
        service: 'assessments',
        assessmentId,
        userId: user.id,
      });
    } else {
      const insertRow: Record<string, unknown> = {
        user_id: user.id,
        property_id: property_id ?? null,
        domain: 'building',
        damage_type: 'general_damage',
        damage_type_canonical: 'general_damage',
        severity: 'early',
        confidence: 0,
        safety_score: 0,
        compliance_score: 0,
        insurance_risk_score: 0,
        urgency: 'monitor',
        assessment_data,
        validation_status: 'pending',
      };

      if (gps) {
        insertRow.latitude = gps.latitude;
        insertRow.longitude = gps.longitude;
      }
      if (
        room_metadata &&
        (room_metadata.room || room_metadata.floor != null)
      ) {
        insertRow.room_metadata = room_metadata;
      }

      const { data: assessment, error: insertError } = await serverSupabase
        .from('building_assessments')
        .insert(insertRow)
        .select('id')
        .single();

      if (insertError || !assessment?.id) {
        logger.error('Assessment insert failed', insertError, {
          service: 'assessments',
          userId: user.id,
        });
        throw new InternalServerError('Failed to create assessment');
      }
      assessmentId = assessment.id;
    }

    let imageCount = 0;
    if (image_urls && image_urls.length > 0) {
      const imageRows = image_urls.map((url, idx) => ({
        assessment_id: assessmentId,
        image_url: url,
        image_index: idx,
      }));

      const { error: imageError } = await serverSupabase
        .from('assessment_images')
        .insert(imageRows);

      if (imageError) {
        // Log but don't fail the create — the assessment row is saved
        // and the AI pipeline can re-attach images later. Surfacing this
        // would force the user to re-enter the whole form.
        logger.error(
          'Assessment images insert failed (non-fatal)',
          imageError,
          {
            service: 'assessments',
            assessmentId,
            userId: user.id,
            urlCount: image_urls.length,
          }
        );
      } else {
        imageCount = image_urls.length;
      }
    }

    logger.info('Assessment created', {
      service: 'assessments',
      assessmentId,
      userId: user.id,
      imageCount,
      hasGps: !!gps,
      mergedFromVideo: existingVideoRowId !== null,
    });

    return NextResponse.json(
      {
        assessment: { id: assessmentId, image_count: imageCount },
        merged_from_video_walkthrough: existingVideoRowId !== null,
      },
      { status: existingVideoRowId ? 200 : 201 }
    );
  }
);
