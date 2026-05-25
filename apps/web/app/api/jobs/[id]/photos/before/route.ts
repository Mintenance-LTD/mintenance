import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateImageUpload } from '@/lib/utils/fileValidation';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';

// 2026-05-26 audit-52 P1: HEIC/HEIF added. iPhone defaults to HEIC for
// camera captures and PhotoUploadService sends image/heic for .heic
// assets — without this both before- and after-photo uploads from iOS
// were rejected with "Invalid file type", which silently broke the
// required before-photo gate (Start Job) and the after-photo completion
// trigger. validateImageUpload (magic-number check above) already
// accepts HEIC; the route-local allowlists are the only blocker.
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];
const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'heif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/**
 * POST /api/jobs/:id/photos/before
 * Upload before photos at job start
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Idempotency — opt-in via the `Idempotency-Key` header. Without
    // a client-supplied key, every request gets a unique generated
    // key (no caching). With a key, a network retry that ships the
    // same multipart body returns the cached response instead of
    // re-uploading + re-inserting metadata rows. Mobile clients
    // already retry on transient 5xx; this prevents duplicate
    // job_photos_metadata rows on retry. AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'photos_before',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<unknown>(
      idempotencyKey,
      'photos_before'
    );
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate photos_before — returning cached result', {
        service: 'jobs.photos',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    return await releaseOnError(idempotencyKey, 'photos_before', async () => {
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
        throw new ForbiddenError(
          'Not authorized to upload photos for this job'
        );
      }

      const formData = await request.formData();
      // Accept both 'photos' (web) and 'photo' (mobile) field names
      let photoFiles = formData.getAll('photos') as File[];
      if (photoFiles.length === 0) {
        const singlePhoto = formData.get('photo') as File | null;
        if (singlePhoto) {
          photoFiles = [singlePhoto];
        }
      }

      // Accept geolocation from 'geolocation' field (web) or 'metadata' JSON (mobile)
      let geolocationStr = formData.get('geolocation') as string | null;
      if (!geolocationStr) {
        const metadataStr = formData.get('metadata') as string | null;
        if (metadataStr) {
          try {
            const metadata = JSON.parse(metadataStr);
            if (metadata.geolocation) {
              // Normalize mobile format { latitude, longitude } to { lat, lng }
              const geo = metadata.geolocation;
              geolocationStr = JSON.stringify({
                lat: geo.lat ?? geo.latitude,
                lng: geo.lng ?? geo.longitude,
              });
            }
          } catch {
            /* ignore invalid metadata */
          }
        }
      }

      if (photoFiles.length === 0) {
        throw new BadRequestError('At least one photo is required');
      }

      if (photoFiles.length > MAX_FILES) {
        throw new BadRequestError(`Maximum ${MAX_FILES} photos allowed`);
      }

      let geolocation:
        | { lat: number; lng: number; accuracy?: number }
        | undefined;
      if (geolocationStr) {
        try {
          geolocation = JSON.parse(geolocationStr);
        } catch (e) {
          logger.warn('Invalid geolocation format', { geolocationStr });
        }
      }

      // Verify geolocation against job location if both are available.
      // ENFORCEMENT: if geolocation IS provided and job has coordinates, the
      // contractor MUST be within 100m. If no geolocation was captured (user
      // denied permission) we fall through — geolocation is best-effort.
      let geolocationVerified = false;
      if (geolocation && job.latitude && job.longitude) {
        const geoResult = await PhotoVerificationService.verifyGeolocation(
          '',
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
          throw new BadRequestError(
            `You must be at the job location to upload before photos. ` +
              `You are approximately ${Math.round(geoResult.distance)}m away ` +
              `(maximum allowed: 100m).`
          );
        }
      }

      const uploadedPhotos: Array<{ url: string; qualityScore: number }> = [];
      const rejectedPhotos: Array<{ url: string; reason: string }> = [];

      for (const file of photoFiles) {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          throw new BadRequestError('Each photo must be less than 10MB');
        }

        // SECURITY: Validate actual file bytes (magic numbers), not just client-declared MIME
        const magicValidation = await validateImageUpload(file);
        if (!magicValidation.valid) {
          throw new BadRequestError(
            magicValidation.error ?? 'Invalid image file'
          );
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

        // Phase 2 storage hardening: issue a signed URL (1yr TTL) instead of a
        // public URL so the object stays reachable once `Job-storage` flips to
        // `public=false`. See apps/web/lib/api/job-storage.ts for context.
        const photoUrl = await signJobStoragePath(fileName);
        if (!photoUrl) {
          continue;
        }

        // Validate photo quality (brightness, sharpness, resolution)
        const qualityResult =
          await PhotoVerificationService.validatePhotoQuality(photoUrl);

        // ENFORCEMENT: reject photos that fail quality check.
        // Delete the uploaded file from storage so we don't accumulate garbage.
        if (!qualityResult.passed) {
          await serverSupabase.storage.from('Job-storage').remove([fileName]);
          rejectedPhotos.push({
            url: photoUrl,
            reason: qualityResult.issues.join('; ') || 'Photo quality too low',
          });
          logger.warn('Photo rejected: quality check failed', {
            service: 'jobs',
            jobId,
            qualityScore: qualityResult.qualityScore,
            issues: qualityResult.issues,
          });
          continue;
        }

        // Save metadata
        await serverSupabase.from('job_photos_metadata').insert({
          job_id: jobId,
          photo_url: photoUrl,
          photo_type: 'before',
          geolocation: geolocation || null,
          geolocation_verified: geolocation ? geolocationVerified : null,
          timestamp: new Date().toISOString(),
          verified: qualityResult.passed,
          quality_score: qualityResult.qualityScore,
          created_by: user.id,
        });

        uploadedPhotos.push({
          url: photoUrl,
          qualityScore: qualityResult.qualityScore,
        });
      }

      if (uploadedPhotos.length === 0) {
        if (rejectedPhotos.length > 0) {
          throw new BadRequestError(
            `All ${rejectedPhotos.length} photo(s) were rejected. ` +
              `Reasons: ${rejectedPhotos.map((p) => p.reason).join(' | ')}. ` +
              `Please retake photos with better lighting, focus, and resolution (min 800x600).`
          );
        }
        throw new Error('Failed to upload photos');
      }

      const responseData = {
        success: true,
        photos: uploadedPhotos,
        count: uploadedPhotos.length,
        rejected: rejectedPhotos.length,
        ...(rejectedPhotos.length > 0 && { rejectedPhotos }),
      };

      await storeIdempotencyResult(
        idempotencyKey,
        'photos_before',
        responseData,
        user.id,
        { jobId, count: uploadedPhotos.length }
      );

      return NextResponse.json(responseData);
    });
  }
);
