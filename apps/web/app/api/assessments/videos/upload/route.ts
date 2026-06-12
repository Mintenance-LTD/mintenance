import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Upload + initial processing

/**
 * POST /api/assessments/videos/upload
 *
 * Upload a property assessment video. Stores in Supabase Storage,
 * creates a building_assessments record with status 'processing',
 * and (when available) triggers the building surveyor AI agent
 * to analyze extracted frames.
 *
 * Mobile client: VideoService.queueVideo() → this route
 * Polling: GET /api/assessments/:id/status
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const assessmentId = formData.get('assessmentId') as string | null;
    const propertyId = formData.get('propertyId') as string | null;

    if (!videoFile) {
      throw new BadRequestError('Video file is required');
    }

    if (videoFile.size > MAX_FILE_SIZE) {
      throw new BadRequestError('Video must be less than 100MB');
    }

    if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      throw new BadRequestError(
        'Invalid video type. Only MP4, WebM, and QuickTime are allowed.'
      );
    }

    // 2026-04-30 audit P0-3: must have one anchor (real assessment id or
    // property id). Refuse to spawn an orphan assessment row.
    if (!assessmentId && !propertyId) {
      throw new BadRequestError(
        'assessmentId or propertyId is required to attach the video'
      );
    }

    // 2026-04-30 audit: tenant ownership check on propertyId. The
    // assessment id path already filters by user_id below, so an
    // unauthorised assessment update silently no-ops; the property path
    // had no check at all before this.
    if (propertyId) {
      const { authorized } = await PropertyTeamService.authorize(
        user.id,
        propertyId,
        'view'
      );
      if (!authorized) {
        logger.warn('Video upload denied — property access', {
          service: 'assessment-video',
          userId: user.id,
          propertyId,
        });
        throw new ForbiddenError('You do not have access to this property');
      }
    }

    const fileExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
    const safeFileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = assessmentId
      ? `assessments/${assessmentId}/videos/${safeFileName}`
      : `assessments/unlinked/${user.id}/${safeFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await serverSupabase.storage
      .from('Job-storage')
      .upload(storagePath, videoFile, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logger.error('Video upload failed', uploadError, {
        service: 'assessment-video',
        userId: user.id,
      });
      throw new Error('Failed to upload video');
    }

    // Phase 2 storage hardening: issue a signed URL so the video stays
    // reachable once `Job-storage` flips to `public=false`.
    const videoUrl = await signJobStoragePath(storagePath);

    if (!videoUrl) {
      throw new Error('Failed to sign video URL');
    }

    // Create or update assessment record
    let dbAssessmentId = assessmentId;

    if (assessmentId) {
      // Link video to existing assessment
      const { error: updateError } = await serverSupabase
        .from('building_assessments')
        .update({
          video_url: videoUrl,
          validation_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId)
        .eq('user_id', user.id);

      if (updateError) {
        logger.warn('Failed to link video to assessment — creating new', {
          service: 'assessment-video',
          assessmentId,
          error: updateError.message,
        });
        dbAssessmentId = null;
      }
    }

    if (!dbAssessmentId) {
      // Create new assessment record for standalone video upload
      const { data: newAssessment, error: insertError } = await serverSupabase
        .from('building_assessments')
        .insert({
          user_id: user.id,
          property_id: propertyId || null,
          domain: 'building',
          damage_type: 'video_walkthrough',
          // Placeholder values constrained by the building_assessments
          // CHECKs — the AI pipeline overwrites them after analysis.
          severity: 'early',
          confidence: 0,
          safety_score: 0,
          compliance_score: 0,
          insurance_risk_score: 0,
          urgency: 'monitor',
          video_url: videoUrl,
          assessment_data: {
            source: 'mobile_video',
            video_uploaded_at: new Date().toISOString(),
          },
          validation_status: 'processing',
        })
        .select('id')
        .single();

      if (insertError) {
        logger.error('Failed to create assessment for video', insertError, {
          service: 'assessment-video',
          userId: user.id,
        });
        throw new Error('Failed to create assessment record');
      }

      dbAssessmentId = newAssessment.id;
    }

    // 2026-04-30 audit P0-3: previously triggered an unauthenticated
    // fire-and-forget POST to /api/building-surveyor/assess with a string
    // `context` field. Both shapes were wrong: the route requires auth
    // (rejects the call as 401) and `context` is an object schema, not a
    // string (Zod 400). Mobile already calls triggerAIAnalysis() with a
    // valid bearer + correct shape after photo uploads — the cron
    // agent-processor picks up assessments left in 'processing'. Drop
    // the broken trigger here rather than let it pretend to work.

    logger.info('Video uploaded for assessment', {
      service: 'assessment-video',
      assessmentId: dbAssessmentId,
      videoUrl,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      assessmentId: dbAssessmentId,
      videoUrl,
      status: 'processing',
    });
  }
);
