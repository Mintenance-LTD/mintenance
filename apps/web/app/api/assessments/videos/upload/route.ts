import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
          severity: 'pending_review',
          confidence: 0,
          safety_score: 0,
          compliance_score: 0,
          insurance_risk_score: 0,
          urgency: 'normal',
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

    // Trigger building surveyor AI assessment asynchronously
    // The agent processes video frames and updates the assessment record.
    // Mobile polls GET /api/assessments/:id/status for results.
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/building-surveyor/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: [videoUrl],
          context:
            'Video walkthrough assessment — extract key frames and analyze for building damage.',
          propertyId: propertyId || undefined,
          domain: 'building',
        }),
      }).catch((err) => {
        // Fire-and-forget: assessment will remain in 'processing' if this fails.
        // The cron agent-processor can pick it up later.
        logger.warn('Failed to trigger AI assessment for video', {
          service: 'assessment-video',
          assessmentId: dbAssessmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch {
      // Non-critical — assessment is saved, AI can be triggered later
    }

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
