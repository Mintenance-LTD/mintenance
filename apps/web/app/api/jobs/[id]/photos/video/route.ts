import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/jobs/:id/photos/video
 * Upload video walkthrough (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id: jobId } = await params;

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to upload video');
    }

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
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      throw new BadRequestError('Video file is required');
    }

    // Validate file
    if (videoFile.size > MAX_FILE_SIZE) {
      throw new BadRequestError('Video must be less than 100MB');
    }

    if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      throw new BadRequestError('Invalid video type. Only MP4, WebM, and QuickTime are allowed.');
    }

    const fileExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';

    // SECURITY: Sanitize filename to prevent path traversal attacks
    // Remove any path separators, special characters, and ensure safe filename
    const sanitizedBaseName = videoFile.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\.\./g, '') // Remove path traversal attempts
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 100); // Limit filename length

    // Generate safe filename with user ID and timestamp to prevent collisions
    const safeFileName = `${sanitizedBaseName}-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage
    const fileName = `job-photos/${jobId}/video/${safeFileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Job-storage')
      .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logger.error('Upload error', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('Job-storage').getPublicUrl(fileName);
    if (!urlData?.publicUrl) {
      throw new Error('Failed to get video URL');
    }

    // Save metadata
    await serverSupabase.from('job_photos_metadata').insert({
      job_id: jobId,
      photo_url: urlData.publicUrl,
      photo_type: 'video',
      timestamp: new Date().toISOString(),
      verified: false,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
