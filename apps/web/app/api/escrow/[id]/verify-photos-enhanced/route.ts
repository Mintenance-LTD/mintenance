import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import {
  extractJobStoragePath,
  signJobStoragePath,
} from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { validateURLs } from '@/lib/security/url-validation';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface PhotoRecord {
  photo_url: string;
  storage_path: string | null;
}

const verifyPhotosEnhancedSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  jobId: z.string().uuid('Invalid job ID'),
  afterPhotoUrls: z
    .array(z.string().url('Invalid photo URL'))
    .min(1, 'At least one photo is required')
    .max(20),
});

/**
 * POST /api/escrow/:id/verify-photos-enhanced
 * Enhanced photo verification with before/after comparison
 */
export const POST = withApiHandler(
  { roles: ['contractor', 'admin'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const escrowId = params.id as string;

    const validation = await validateRequest(
      request,
      verifyPhotosEnhancedSchema
    );
    if ('headers' in validation) return validation;

    const { jobId: bodyJobId, afterPhotoUrls } = validation.data;

    // AUTHZ (audit S1 — IDOR fix): this route updates escrow_transactions by id
    // and can flip photo_verification_status to 'verified' + trigger homeowner
    // approval / release. It previously had NO ownership check, so any
    // authenticated user could push another party's escrow toward payout.
    // Verify the caller is the escrow's payee (the contractor doing the work)
    // or an admin, and derive the job from the escrow itself rather than
    // trusting the client-supplied jobId (which was never tied to the escrow).
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, payee_id, status')
      .eq('id', escrowId)
      .single();
    if (escrowError || !escrow) throw new NotFoundError('Escrow not found');
    if (user.role !== 'admin' && escrow.payee_id !== user.id) {
      throw new ForbiddenError(
        'Not authorized to verify photos for this escrow'
      );
    }
    const jobId = escrow.job_id as string;
    if (bodyJobId && bodyJobId !== jobId) {
      logger.warn(
        'verify-photos-enhanced body jobId does not match escrow job; using escrow job',
        {
          service: 'escrow-verify-photos-enhanced',
          userId: user.id,
          escrowId,
          bodyJobId,
          escrowJobId: jobId,
        }
      );
    }

    // SECURITY: Validate photo URLs to prevent SSRF attacks
    const urlValidation = await validateURLs(afterPhotoUrls, true);
    if (urlValidation.invalid.length > 0) {
      logger.warn('Invalid photo URLs rejected in photo verification', {
        service: 'escrow-verify-photos-enhanced',
        userId: user.id,
        escrowId,
        invalidUrls: urlValidation.invalid,
      });
      return NextResponse.json(
        {
          error: `Invalid photo URLs: ${urlValidation.invalid.map((i: { error: string }) => i.error).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const paths = afterPhotoUrls.map(extractJobStoragePath);
    if (paths.some((path) => !path) || new Set(paths).size !== paths.length) {
      throw new BadRequestError('Distinct photos from this job are required');
    }
    // Older uploads stored only the signed URL. Compare its exact-origin object
    // identity within this job; never trust an arbitrary client URL as evidence.
    const evidence: Array<{
      id: string;
      photo_url: string;
      storage_path: string;
    }> = [];
    let cursor: string | null = null;
    for (;;) {
      let query = serverSupabase
        .from('job_photos_metadata')
        .select('id, photo_url, storage_path')
        .eq('job_id', jobId)
        .eq('photo_type', 'after')
        .eq('verified', true)
        .order('id')
        .limit(200);
      if (cursor) query = query.gt('id', cursor);
      const { data: page, error: evidenceError } = await query;
      if (evidenceError || !page)
        throw new InternalServerError('Unable to load completion photos');
      if (page.length === 0) break;
      for (const photo of page) {
        const path =
          photo.storage_path ?? extractJobStoragePath(photo.photo_url);
        if (path && paths.includes(path))
          evidence.push({ ...photo, storage_path: path });
      }
      const next = page[page.length - 1].id;
      if (cursor && next <= cursor)
        throw new InternalServerError('Unable to paginate completion photos');
      cursor = next;
    }
    if (!evidence || evidence.length !== paths.length) {
      throw new BadRequestError(
        'Photos must belong to this job and pass upload validation'
      );
    }
    const signed = await Promise.all(
      evidence.map((photo) => signJobStoragePath(photo.storage_path!))
    );
    if (signed.some((url) => !url))
      throw new InternalServerError('Unable to access completion photos');
    const validatedAfterPhotoUrls = signed as string[];

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(
        'id, title, description, category, latitude, longitude, completed_at'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) throw new NotFoundError('Job not found');

    const { data: beforePhotos, error: beforeError } = await serverSupabase
      .from('job_photos_metadata')
      .select('photo_url, storage_path')
      .eq('job_id', jobId)
      .eq('photo_type', 'before');

    if (beforeError)
      throw new InternalServerError('Unable to load before photos');
    const beforeUrls = await Promise.all(
      (beforePhotos || []).map(async (photo: PhotoRecord) => {
        const path =
          photo.storage_path ?? extractJobStoragePath(photo.photo_url);
        if (!path)
          throw new ConflictError('Before-photo storage binding is missing');
        const signedUrl = await signJobStoragePath(path);
        if (!signedUrl)
          throw new InternalServerError('Unable to access before photos');
        return signedUrl;
      })
    );
    const location = {
      lat: job.latitude ?? 0,
      lng: job.longitude ?? 0,
    };
    const hasLocation = job.latitude != null && job.longitude != null;

    const qualityResults = await Promise.all(
      validatedAfterPhotoUrls.map((url) =>
        PhotoVerificationService.validatePhotoQuality(url)
      )
    );
    const allQualityPassed = qualityResults.every((r) => r.passed);
    const averageQualityScore =
      qualityResults.reduce((sum, r) => sum + r.qualityScore, 0) /
      qualityResults.length;

    let comparisonResult = null;
    if (beforeUrls.length > 0) {
      comparisonResult = await PhotoVerificationService.compareBeforeAfter(
        beforeUrls,
        validatedAfterPhotoUrls,
        location,
        {
          before: (beforePhotos || []).map((photo) => photo.photo_url),
          after: evidence.map((photo) => photo.photo_url),
        }
      );
    }

    const geolocationResults = await Promise.all(
      evidence.map((photo) =>
        PhotoVerificationService.verifyGeolocation(photo.photo_url, location)
      )
    );
    const allGeolocationVerified =
      hasLocation && geolocationResults.every((r) => r.verified);

    const timestampResults = await Promise.all(
      evidence.map((photo) =>
        PhotoVerificationService.verifyTimestamp(photo.photo_url)
      )
    );
    const allTimestampVerified = timestampResults.every((r) => r.verified);

    const verified =
      allQualityPassed &&
      allGeolocationVerified &&
      allTimestampVerified &&
      (comparisonResult?.matches ?? true);

    const { data: committed, error: verificationError } =
      await serverSupabase.rpc('record_completion_photo_verification', {
        p_job_id: jobId,
        p_escrow_id: escrowId,
        p_actor_id: user.id,
        p_expected_completed_at: job.completed_at,
        p_photo_ids: evidence.map((photo) => photo.id),
        p_quality_passed: allQualityPassed,
        p_geolocation_verified: allGeolocationVerified,
        p_timestamp_verified: allTimestampVerified,
        p_comparison_score: comparisonResult?.comparisonScore ?? null,
        p_verified: verified,
      });
    if (verificationError?.code === '42501')
      throw new ForbiddenError('Not authorized to verify this completion');
    if (verificationError?.code === '23514')
      throw new ConflictError(verificationError.message);
    if (verificationError || committed !== true)
      throw new InternalServerError(
        'Unable to confirm photo verification. Please retry.'
      );

    return NextResponse.json({
      success: true,
      verification: {
        qualityPassed: allQualityPassed,
        averageQualityScore,
        geolocationVerified: allGeolocationVerified,
        timestampVerified: allTimestampVerified,
        beforeAfterComparison: comparisonResult,
        status: verified ? 'verified' : 'manual_review',
      },
    });
  }
);
