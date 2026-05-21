import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
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
} from '@/lib/idempotency';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/**
 * POST /api/jobs/:id/photos/after
 * Upload after photos at completion
 *
 * Audit P2 (2026-05-10): added explicit `roles: ['contractor', 'admin']`
 * to the wrapper. Functional behaviour is unchanged — the manual
 * `job.contractor_id !== user.id && user.role !== 'admin'` check below
 * still fires per-request and enforces the assignment relationship.
 * The roles array is defence-in-depth so a future refactor that drops
 * the manual check can't accidentally widen access to homeowners.
 */
export const POST = withApiHandler(
  { roles: ['contractor', 'admin'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Idempotency — opt-in via the `Idempotency-Key` header. After
    // photos auto-trigger job completion + notify the homeowner +
    // send the "Job Completed - Review Required" email. Without
    // idempotency, a network retry could double-fire those side
    // effects even though the second photo upload would no-op
    // (status already 'completed'). AUDIT_PUNCH_LIST P2 #75.
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'photos_after',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<unknown>(
      idempotencyKey,
      'photos_after'
    );
    if (idem?.isDuplicate && idem.cachedResult) {
      logger.info('Duplicate photos_after — returning cached result', {
        service: 'jobs.photos',
        idempotencyKey,
        userId: user.id,
        jobId,
      });
      return NextResponse.json(idem.cachedResult);
    }

    // Verify user is contractor for this job (include location for geolocation check)
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, contractor_id, homeowner_id, category, status, title, latitude, longitude'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.contractor_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized to upload photos for this job');
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
    const angleTypes = formData.getAll('angleTypes') as string[];

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
          `You must be at the job location to upload after photos. ` +
            `You are approximately ${Math.round(geoResult.distance)}m away ` +
            `(maximum allowed: 100m).`
        );
      }
    }

    const uploadedPhotos: Array<{
      url: string;
      qualityScore: number;
      angleType?: string;
    }> = [];
    const rejectedPhotos: Array<{ url: string; reason: string }> = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const angleType = angleTypes[i] || 'wide';

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
      const fileName = `job-photos/${jobId}/after/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadError } =
        await serverSupabase.storage
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
        url: photoUrl,
        qualityScore: qualityResult.qualityScore,
        angleType,
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

    // Validate photo requirements for job category
    const photos = uploadedPhotos.map((p) => ({
      url: p.url,
      angleType: p.angleType,
      qualityScore: p.qualityScore,
    }));
    const validationResult =
      await PhotoVerificationService.validatePhotoRequirements(
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
          logger.warn('Auto-complete skipped: no contractor assigned', {
            service: 'jobs',
            jobId,
          });
          canAutoComplete = false;
        } else {
          // Safety: verify escrow payment is held.
          const { data: escrowCheck } = await serverSupabase
            .from('escrow_transactions')
            .select('id')
            .eq('job_id', jobId)
            .eq('status', 'held')
            .limit(1)
            .single();

          if (!escrowCheck) {
            logger.warn('Auto-complete skipped: no escrow payment held', {
              service: 'jobs',
              jobId,
            });
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

            // R7 #8 neighbour referral: if the homeowner redeemed a
            // referral and this is their first completed job, credit
            // £20 to both parties. Non-fatal if it fails.
            try {
              const { NeighbourhoodReferralService } =
                await import('@/lib/services/referrals/NeighbourhoodReferralService');
              await NeighbourhoodReferralService.applyRewardOnFirstJob(
                job.homeowner_id,
                jobId
              );
            } catch (refErr) {
              logger.warn('Referral reward hook failed', {
                service: 'jobs',
                jobId,
                err: refErr instanceof Error ? refErr.message : String(refErr),
              });
            }

            // R6 #5 deferred: tenant + payer fan-out on completion. The
            // homeowner + contractor pings still happen in the Promise.all
            // block below; this only notifies the NEW R6 roles so rental
            // tenants and landlord payers learn the job is done.
            try {
              const { notifyStakeholders } =
                await import('@/lib/services/notifications/JobStakeholderNotifier');
              const titleSafe = job.title || 'your job';
              await notifyStakeholders({
                jobId,
                type: 'job_completed',
                onlyRoles: ['payer', 'tenant'],
                titleFor: (role) =>
                  role === 'tenant'
                    ? 'Work finished at your home'
                    : 'Work completed',
                messageFor: (role) =>
                  role === 'tenant'
                    ? `The contractor has finished work on "${titleSafe}". If anything needs attention, let your landlord know.`
                    : `Work on "${titleSafe}" has been marked complete. Review the photos and release payment when you're happy.`,
                actionUrlFor: () => `/jobs/${jobId}`,
                emailTenants: true,
                tenantJobStatus: 'completed',
                skipUserId: user.id,
              });
            } catch (fanoutErr) {
              logger.warn('Stakeholder fan-out on job completion failed', {
                service: 'jobs',
                jobId,
                err:
                  fanoutErr instanceof Error
                    ? fanoutErr.message
                    : String(fanoutErr),
              });
            }

            // Notify homeowner to review and contractor of completion
            // Audit P2 (2026-05-10): capture the homeowner notification
            // id from Promise.all so the email send below can flip
            // `email_sent = true` on that row. Contractor copy is
            // in-app only — no matching email, so no id capture needed.
            const homeownerJobTitle = job.title || 'your job';
            const [homeownerNotifId] = await Promise.all([
              NotificationService.createNotification({
                userId: job.homeowner_id,
                title: 'How did your contractor do?',
                message: `${homeownerJobTitle} is done. Two taps to leave a review and release payment.`,
                type: 'job_completed',
                actionUrl: `/jobs/${jobId}`,
              }),
              NotificationService.createNotification({
                userId: user.id,
                title: 'Sign-off pending',
                message: `After photos are in for "${homeownerJobTitle}". Homeowner has 7 days — we'll auto-release if they don't.`,
                type: 'job_completed',
                actionUrl: `/contractor/jobs/${jobId}`,
              }),
            ]);

            // Send email to homeowner about job completion
            try {
              const { data: homeownerProfile } = await serverSupabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', job.homeowner_id)
                .single();

              const { data: contractorProfile } = await serverSupabase
                .from('profiles')
                .select('first_name, last_name, company_name')
                .eq('id', user.id)
                .single();

              const { data: escrowRow } = await serverSupabase
                .from('escrow_transactions')
                .select('amount')
                .eq('job_id', jobId)
                .in('status', ['held', 'release_pending'])
                .limit(1)
                .maybeSingle();
              const escrowAmount = escrowRow?.amount
                ? Number(escrowRow.amount) || undefined
                : undefined;

              if (homeownerProfile?.email) {
                const homeownerName =
                  homeownerProfile.first_name && homeownerProfile.last_name
                    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`
                    : 'there';
                const contractorName = contractorProfile
                  ? contractorProfile.first_name && contractorProfile.last_name
                    ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
                    : contractorProfile.company_name || 'Your contractor'
                  : 'Your contractor';

                const emailOk = await EmailService.sendJobCompletedEmail(
                  homeownerProfile.email,
                  {
                    homeownerName,
                    contractorName,
                    jobTitle: job.title || 'Job',
                    viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/jobs/${jobId}`,
                    amount: escrowAmount,
                  }
                );
                if (emailOk && homeownerNotifId) {
                  await NotificationService.markEmailSent(homeownerNotifId);
                }
              }
            } catch (emailError) {
              logger.error('Failed to send job completed email', emailError, {
                service: 'jobs',
                jobId,
              });
            }

            logger.info('Job auto-completed after photo upload', {
              service: 'jobs',
              jobId,
            });
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

    const responseData = {
      success: true,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
      validation: validationResult,
      jobCompleted,
    };

    await storeIdempotencyResult(
      idempotencyKey,
      'photos_after',
      responseData,
      user.id,
      { jobId, count: uploadedPhotos.length, jobCompleted }
    );

    return NextResponse.json(responseData);
  }
);
