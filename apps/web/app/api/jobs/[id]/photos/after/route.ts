import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';
import { logger } from '@mintenance/shared';

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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;

    // Verify user is contractor for this job
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, contractor_id, category')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.contractor_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const photoFiles = formData.getAll('photos') as File[];
    const geolocationStr = formData.get('geolocation') as string | null;
    const angleTypes = formData.getAll('angleTypes') as string[];

    if (photoFiles.length === 0) {
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
    }

    if (photoFiles.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} photos allowed` }, { status: 400 });
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
        return NextResponse.json({ error: 'Each photo must be less than 10MB' }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
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
    logger.error('Error uploading after photos', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

