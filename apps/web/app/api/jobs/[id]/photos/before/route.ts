import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateImageUpload } from '@/lib/utils/fileValidation';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/**
 * POST /api/jobs/:id/photos/before
 * Upload before photos at job start
 */
export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const jobId = params.id as string;

  // Verify user is contractor for this job (include location for geolocation check)
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('id, contractor_id, latitude, longitude')
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

  const uploadedPhotos: Array<{ url: string; qualityScore: number }> = [];

  for (const file of photoFiles) {
    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('Each photo must be less than 10MB');
    }

    // SECURITY: Validate actual file bytes (magic numbers), not just client-declared MIME
    const magicValidation = await validateImageUpload(file);
    if (!magicValidation.valid) {
      throw new BadRequestError(magicValidation.error ?? 'Invalid image file');
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new BadRequestError('Invalid file type');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
      throw new BadRequestError('Invalid file extension');
    }

    // Upload to storage
    const fileName = `job-photos/${jobId}/before/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await serverSupabase.storage
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
      photo_type: 'before',
      geolocation: geolocation || null,
      geolocation_verified: geolocation ? geolocationVerified : null,
      timestamp: new Date().toISOString(),
      verified: qualityResult.passed,
      quality_score: qualityResult.qualityScore,
      created_by: user.id,
    });

    uploadedPhotos.push({
      url: urlData.publicUrl,
      qualityScore: qualityResult.qualityScore,
    });
  }

  if (uploadedPhotos.length === 0) {
    throw new Error('Failed to upload photos');
  }

  return NextResponse.json({
    success: true,
    photos: uploadedPhotos,
    count: uploadedPhotos.length,
  });
});
