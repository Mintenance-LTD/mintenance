import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  validateVideoUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';

const MAX_FILE_SIZE = MAX_FILE_SIZES.video;

/**
 * POST /api/jobs/:id/photos/video
 * Upload video walkthrough (optional)
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Verify user is contractor for this job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.contractor_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized to upload video for this job');
    }

    const formData = await request.formData();
    const rawVideoFile = formData.get('video');
    const videoFile =
      typeof rawVideoFile === 'object' &&
      rawVideoFile !== null &&
      'size' in rawVideoFile &&
      'arrayBuffer' in rawVideoFile
        ? rawVideoFile
        : null;

    if (!videoFile) {
      throw new BadRequestError('Video file is required');
    }

    // Validate actual bytes, not the client-declared MIME type or filename.
    const validation = await validateVideoUpload(videoFile, MAX_FILE_SIZE);
    if (!validation.valid || !validation.detectedType) {
      throw new BadRequestError(validation.error || 'Invalid video file');
    }

    // Use a server-generated key; never put user-controlled names in storage.
    const fileExt = validation.detectedType.split('/')[1] || 'mp4';
    const safeFileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`;

    // Upload to storage
    const fileName = `job-photos/${jobId}/video/${safeFileName}`;
    const { error: uploadError } = await serverSupabase.storage
      .from('Job-storage')
      .upload(fileName, videoFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: validation.detectedType,
      });

    if (uploadError) {
      logger.error('Upload error', uploadError);
      throw uploadError;
    }

    // Phase 2 storage hardening: issue a signed URL instead of a public URL
    // so the video stays reachable once `Job-storage` flips to `public=false`.
    const videoUrl = await signJobStoragePath(fileName);
    if (!videoUrl) {
      await serverSupabase.storage.from('Job-storage').remove([fileName]);
      throw new Error('Failed to get video URL');
    }

    // Save metadata
    const { error: metadataError } = await serverSupabase
      .from('job_photos_metadata')
      .insert({
      job_id: jobId,
      photo_url: videoUrl,
      photo_type: 'video',
      timestamp: new Date().toISOString(),
      verified: false,
      created_by: user.id,
      });

    if (metadataError) {
      // Do not leave an untracked object in storage if the metadata write
      // fails; callers must be able to retry safely.
      await serverSupabase.storage.from('Job-storage').remove([fileName]);
      logger.error('Failed to persist video metadata', metadataError, {
        service: 'jobs.photos.video',
        jobId,
        userId: user.id,
      });
      throw new Error('Failed to record uploaded video');
    }

    return NextResponse.json({
      success: true,
      photoId: fileName,
      url: videoUrl,
    });
  }
);
