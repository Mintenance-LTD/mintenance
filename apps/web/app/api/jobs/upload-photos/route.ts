import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import {
  validateImageUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// File upload security configuration
const MAX_FILE_SIZE = MAX_FILE_SIZES.jobPhoto; // 10MB with magic number validation
const MAX_FILES = 10; // Maximum 10 photos per job

/**
 * POST /api/jobs/upload-photos
 *
 * Uploads photos for a job posting.
 * Returns URLs that can be used when creating the job.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable',
        new Error('Configuration error'),
        {
          service: 'jobs',
        }
      );
      throw new InternalServerError(
        'Server configuration error. Please contact support.'
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable',
        new Error('Configuration error'),
        {
          service: 'jobs',
        }
      );
      throw new InternalServerError(
        'Server configuration error. Please contact support.'
      );
    }

    // Parse form data
    const formData = await request.formData();
    let photoFiles = formData.getAll('photos') as File[];

    // Backward compatibility: mobile clients may send as 'file' (singular)
    if (photoFiles.length === 0) {
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        photoFiles = [singleFile];
      }
    }

    if (photoFiles.length === 0) {
      throw new BadRequestError('At least one photo is required');
    }

    if (photoFiles.length > MAX_FILES) {
      throw new BadRequestError(`Maximum ${MAX_FILES} photos allowed`);
    }

    // IDOR fix (2026-07-06 audit #4): the storage path is prefixed with the
    // client-supplied `job_id`, and the upload uses the service-role client
    // (which bypasses RLS), so without this check any authenticated user could
    // write files into any job's storage prefix. When a job_id is supplied it
    // must be a UUID (rejected before it can reach Postgres and error there)
    // and the caller must be that job's homeowner or assigned contractor
    // (admins exempt). job_id is normally absent here — photos are uploaded
    // pre-creation and attached when the job is POSTed.
    let jobId: string | null = null;
    const rawJobId = formData.get('job_id');
    if (typeof rawJobId === 'string' && rawJobId.length > 0) {
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(rawJobId)) {
        throw new BadRequestError('Invalid job_id');
      }

      const { data: jobRow, error: jobLookupError } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, contractor_id')
        .eq('id', rawJobId)
        .single();

      if (jobLookupError || !jobRow) {
        logger.warn('Job lookup failed for photo upload', {
          service: 'jobs',
          jobId: rawJobId,
          userId: user.id,
          error: jobLookupError?.message,
        });
        throw new BadRequestError('Invalid job reference');
      }

      const isParticipant =
        jobRow.homeowner_id === user.id || jobRow.contractor_id === user.id;
      if (!isParticipant && user.role !== 'admin') {
        throw new ForbiddenError('You do not have access to this job');
      }
      jobId = rawJobId;
    }

    // Upload each photo to Supabase Storage
    const uploadedUrls: string[] = [];
    const failedFiles: string[] = [];

    for (const file of photoFiles) {
      // SECURITY: Validate file using magic number (actual file content)
      // This prevents malicious files disguised as images
      const validation = await validateImageUpload(file, MAX_FILE_SIZE);

      if (!validation.valid) {
        logger.warn('[SECURITY] File upload blocked', {
          fileName: file.name,
          declaredType: file.type,
          error: validation.error,
          userId: user.id,
        });

        throw new BadRequestError(validation.error || 'Invalid file');
      }

      // Log warnings if MIME type or extension mismatch detected
      if (validation.warnings && validation.warnings.length > 0) {
        logger.warn('[SECURITY] File validation warnings', {
          fileName: file.name,
          warnings: validation.warnings,
          detectedType: validation.detectedType,
          userId: user.id,
        });
      }

      // Get file extension from detected type (not from filename!)
      const fileExt = validation.detectedType?.split('/')[1] || 'jpg';

      // SECURITY: Sanitize filename to prevent path traversal attacks
      // Remove any path separators, special characters, and ensure safe filename
      const sanitizedBaseName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/\.\./g, '') // Remove path traversal attempts
        .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
        .substring(0, 100); // Limit filename length

      // Generate safe filename with user ID and timestamp to prevent collisions
      const safeFileName = `${sanitizedBaseName}-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Include job_id in path if provided (ownership verified above).
      const fileName = jobId
        ? `${jobId}/${safeFileName}`
        : `job-photos/${safeFileName}`;

      // Upload to Supabase Storage (using Job-storage bucket that exists)
      const { error: uploadError } = await serverSupabase.storage
        .from('Job-storage')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error for file', uploadError, {
          service: 'jobs',
          fileName: file.name,
          userId: user.id,
        });

        // Check if it's a bucket not found error
        if (
          uploadError.message?.includes('bucket') ||
          uploadError.message?.includes('not found')
        ) {
          throw new InternalServerError(
            'Storage bucket not configured. Please contact support.'
          );
        }

        // Check if it's a permissions error
        if (
          uploadError.message?.includes('permission') ||
          uploadError.message?.includes('access')
        ) {
          throw new BadRequestError(
            'Permission denied. Please check your account settings.'
          );
        }

        // For other errors, track failed file and continue with others
        failedFiles.push(file.name);
        continue;
      }

      // Phase 2 storage hardening: issue a signed URL instead of a public URL
      // so the object stays reachable once `Job-storage` flips to private.
      const signedUrl = await signJobStoragePath(fileName);

      if (signedUrl) {
        uploadedUrls.push(signedUrl);
      } else {
        logger.error(
          'Failed to sign URL for uploaded file',
          new Error('Signed URL generation failed'),
          {
            service: 'jobs',
            fileName,
            userId: user.id,
          }
        );
        failedFiles.push(file.name);
      }
    }

    if (uploadedUrls.length === 0) {
      // All uploads failed - provide more context
      logger.error(
        'All photo uploads failed',
        new Error('All uploads failed'),
        {
          service: 'jobs',
          attemptedFiles: photoFiles.length,
          userId: user.id,
        }
      );
      throw new InternalServerError(
        'Failed to upload photos. Please check that the storage bucket exists and you have proper permissions.'
      );
    }

    // If some files failed but at least one succeeded, log a warning
    if (uploadedUrls.length < photoFiles.length) {
      logger.warn('Partial photo upload success', {
        service: 'jobs',
        successful: uploadedUrls.length,
        attempted: photoFiles.length,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      warning:
        failedFiles.length > 0
          ? `${failedFiles.length} of ${photoFiles.length} photos failed to upload: ${failedFiles.join(', ')}`
          : undefined,
    });
  }
);
