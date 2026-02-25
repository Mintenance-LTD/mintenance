import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { validateURLs } from '@/lib/security/url-validation';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface PhotoRecord {
  photo_url: string;
  geolocation?: { lat: number; lng: number };
}

const verifyPhotosEnhancedSchema = z.object({
  escrowId: z.string().uuid('Invalid escrow ID'),
  jobId: z.string().uuid('Invalid job ID'),
  afterPhotoUrls: z.array(z.string().url('Invalid photo URL')).min(1, 'At least one photo is required'),
});

/**
 * POST /api/escrow/:id/verify-photos-enhanced
 * Enhanced photo verification with before/after comparison
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const escrowId = params.id as string;

    const validation = await validateRequest(request, verifyPhotosEnhancedSchema);
    if ('headers' in validation) return validation;

    const { jobId, afterPhotoUrls } = validation.data;

    // SECURITY: Validate photo URLs to prevent SSRF attacks
    const urlValidation = await validateURLs(afterPhotoUrls, true);
    if (urlValidation.invalid.length > 0) {
      logger.warn('Invalid photo URLs rejected in photo verification', { service: 'escrow-verify-photos-enhanced', userId: user.id, escrowId, invalidUrls: urlValidation.invalid });
      return NextResponse.json({ error: `Invalid photo URLs: ${urlValidation.invalid.map((i: { error: string }) => i.error).join(', ')}` }, { status: 400 });
    }

    const validatedAfterPhotoUrls = urlValidation.valid;

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, description, category, location')
      .eq('id', jobId)
      .single();

    if (jobError || !job) throw new NotFoundError('Job not found');

    const { data: beforePhotos } = await serverSupabase
      .from('job_photos_metadata')
      .select('photo_url, geolocation')
      .eq('job_id', jobId)
      .eq('photo_type', 'before');

    const beforeUrls = (beforePhotos || []).map((p: PhotoRecord) => p.photo_url);
    const jobLocation = job.location as { lat?: number; lng?: number } | null;
    const location = jobLocation?.lat && jobLocation?.lng ? { lat: jobLocation.lat, lng: jobLocation.lng } : { lat: 0, lng: 0 };

    const qualityResults = await Promise.all(validatedAfterPhotoUrls.map(url => PhotoVerificationService.validatePhotoQuality(url)));
    const allQualityPassed = qualityResults.every(r => r.passed);
    const averageQualityScore = qualityResults.reduce((sum, r) => sum + r.qualityScore, 0) / qualityResults.length;

    let comparisonResult = null;
    if (beforeUrls.length > 0) {
      comparisonResult = await PhotoVerificationService.compareBeforeAfter(beforeUrls, validatedAfterPhotoUrls, location);
    }

    const geolocationResults = await Promise.all(validatedAfterPhotoUrls.map(url => PhotoVerificationService.verifyGeolocation(url, location)));
    const allGeolocationVerified = geolocationResults.every(r => r.verified);

    const timestampResults = await Promise.all(validatedAfterPhotoUrls.map(url => PhotoVerificationService.verifyTimestamp(url)));
    const allTimestampVerified = timestampResults.every(r => r.verified);

    const verified = allQualityPassed && allGeolocationVerified && allTimestampVerified && (comparisonResult?.matches ?? true);

    await serverSupabase.from('escrow_transactions').update({
      photo_quality_passed: allQualityPassed,
      geolocation_verified: allGeolocationVerified,
      timestamp_verified: allTimestampVerified,
      before_after_comparison_score: comparisonResult?.comparisonScore || null,
      photo_verification_status: verified ? 'verified' : 'manual_review',
      updated_at: new Date().toISOString(),
    }).eq('id', escrowId);

    if (verified) {
      await HomeownerApprovalService.requestHomeownerApproval(escrowId, validatedAfterPhotoUrls);
    }

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
