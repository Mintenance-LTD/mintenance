import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/**
 * POST /api/jobs/:id/photos/after
 * Upload after photos at completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);
    const { id: jobId } = await params;

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to upload photos');
    }

    // Verify user is contractor for this job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id, category')
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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Job-storage')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        logger.error('Upload error', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from('Job-storage').getPublicUrl(fileName);
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

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
      validation: validationResult,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
