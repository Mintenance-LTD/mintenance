import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/**
 * POST /api/jobs/:id/photos/after
 * Upload after photos at completion
 */
export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const jobId = params.id as string;

  // Verify user is contractor for this job (include location for geolocation check)
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('id, contractor_id, homeowner_id, category, status, title, latitude, longitude')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new NotFoundError('Job not found');
  }

  if (job.contractor_id !== user.id && user.role !== 'admin') {
    throw new ForbiddenError('Not authorized to upload photos for this job');
  }

  const formData = await request.formData();
  const photoFiles = formData.getAll('photos') as File[];
  const geolocationStr = formData.get('geolocation') as string | null;
  const angleTypes = formData.getAll('angleTypes') as string[];

  if (photoFiles.length === 0) {
    throw new BadRequestError('At least one photo is required');
  }

  if (photoFiles.length > MAX_FILES) {
    throw new BadRequestError(`Maximum ${MAX_FILES} photos allowed`);
  }

  let geolocation: { lat: number; lng: number; accuracy?: number } | undefined;
  if (geolocationStr) {
    try {
      geolocation = JSON.parse(geolocationStr);
    } catch (e) {
      logger.warn('Invalid geolocation format', { geolocationStr });
    }
  }

  // Verify geolocation against job location if both are available
  let geolocationVerified = false;
  if (geolocation && job.latitude && job.longitude) {
    const geoResult = await PhotoVerificationService.verifyGeolocation(
      '', // URL not needed when passing geolocation directly
      { lat: job.latitude, lng: job.longitude },
      geolocation
    );
    geolocationVerified = geoResult.withinThreshold;
    if (!geoResult.withinThreshold) {
      logger.warn('Photo uploaded outside job location threshold', {
        service: 'jobs',
        jobId,
        distance: geoResult.distance,
        threshold: 100,
      });
    }
  }

  const uploadedPhotos: Array<{ url: string; qualityScore: number; angleType?: string }> = [];

  for (let i = 0; i < photoFiles.length; i++) {
    const file = photoFiles[i];
    const angleType = angleTypes[i] || 'wide';

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('Each photo must be less than 10MB');
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new BadRequestError('Invalid file type');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      throw new BadRequestError('Invalid file extension');
    }

    // Upload to storage
    const fileName = `job-photos/${jobId}/after/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await serverSupabase.storage
      .from('Job-storage')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logger.error('Upload error', uploadError);
      continue;
    }

    const { data: urlData } = serverSupabase.storage.from('Job-storage').getPublicUrl(fileName);
    if (!urlData?.publicUrl) {
      continue;
    }

    // Validate photo quality
    const qualityResult = await PhotoVerificationService.validatePhotoQuality(urlData.publicUrl);

    // Save metadata
    await serverSupabase.from('job_photos_metadata').insert({
      job_id: jobId,
      photo_url: urlData.publicUrl,
      photo_type: 'after',
      geolocation: geolocation || null,
      geolocation_verified: geolocation ? geolocationVerified : null,
      timestamp: new Date().toISOString(),
      verified: qualityResult.passed,
      quality_score: qualityResult.qualityScore,
      angle_type: angleType,
      created_by: user.id,
    });

    uploadedPhotos.push({
      url: urlData.publicUrl,
      qualityScore: qualityResult.qualityScore,
      angleType,
    });
  }

  if (uploadedPhotos.length === 0) {
    throw new Error('Failed to upload photos');
  }

  // Validate photo requirements for job category
  const photos = uploadedPhotos.map(p => ({
    url: p.url,
    angleType: p.angleType,
    qualityScore: p.qualityScore,
  }));
  const validationResult = await PhotoVerificationService.validatePhotoRequirements(
    job.category || 'general',
    photos
  );

  // Auto-complete: mark job as completed after successful after photo upload
  // Safety checks: verify contractor is assigned and escrow payment exists
  let jobCompleted = false;
  if (job.status === 'in_progress') {
    try {
      // Safety: verify contractor is assigned
      let canAutoComplete = true;
      if (!job.contractor_id) {
        logger.warn('Auto-complete skipped: no contractor assigned', { service: 'jobs', jobId });
        canAutoComplete = false;
      } else {
        // Safety: verify escrow payment is held
        const { data: escrowCheck } = await serverSupabase
          .from('escrow_transactions')
          .select('id')
          .eq('job_id', jobId)
          .eq('status', 'held')
          .limit(1)
          .single();

        if (!escrowCheck) {
          logger.warn('Auto-complete skipped: no escrow payment held', { service: 'jobs', jobId });
          canAutoComplete = false;
        }
      }

      if (canAutoComplete) {
        const { error: completeError } = await serverSupabase
          .from('jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        if (!completeError) {
          jobCompleted = true;

          // Notify homeowner to review and contractor of completion
          await Promise.all([
            NotificationService.createNotification({
              userId: job.homeowner_id,
              title: 'Job Completed - Review Required',
              message: `Work on "${job.title || 'your job'}" is complete. Review the before/after photos and approve.`,
              type: 'job_completed',
              actionUrl: `/jobs/${jobId}`,
            }),
            NotificationService.createNotification({
              userId: user.id,
              title: 'Job Marked as Completed',
              message: `Your after photos for "${job.title || 'the job'}" have been submitted. The job is now marked as completed and awaiting homeowner review.`,
              type: 'job_completed',
              actionUrl: `/contractor/jobs/${jobId}`,
            }),
          ]);

          logger.info('Job auto-completed after photo upload', { service: 'jobs', jobId });
        }
      }
    } catch (completionError) {
      logger.error('Auto-completion failed after photo upload', {
        service: 'jobs',
        jobId,
        error: completionError,
      });
      // Don't fail the photo upload if completion fails
    }
  }

  return NextResponse.json({
    success: true,
    photos: uploadedPhotos,
    count: uploadedPhotos.length,
    validation: validationResult,
    jobCompleted,
  });
});
