import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { signJobStoragePath } from '@/lib/api/job-storage';
import { logger } from '@mintenance/shared';
import {
  validateImageUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';
import { ForbiddenError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const supabase = serverSupabase;

// File upload security configuration
const MAX_FILE_SIZE = MAX_FILE_SIZES.profileImage;
const MAX_FILES = 10; // Maximum 10 photos per property

/**
 * POST /api/properties/upload-photos
 *
 * Uploads photos for a property.
 * Returns URLs that can be used when creating the property.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Only homeowners can upload property photos
    if (user.role !== 'homeowner') {
      throw new ForbiddenError('Only homeowners can upload property photos.');
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable',
        new Error('Missing env var'),
        {
          service: 'property_photos',
        }
      );
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable',
        new Error('Missing env var'),
        {
          service: 'property_photos',
        }
      );
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const photoFiles = formData.getAll('photos') as File[];
    const categories = formData.getAll('categories') as string[];

    if (!photoFiles || photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      );
    }

    if (photoFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} photos allowed` },
        { status: 400 }
      );
    }

    // Validate and upload each file
    const uploadedPhotos: Array<{ url: string; category: string }> = [];
    const uploadErrors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const category = categories[i] || 'other';
      // Validate the actual bytes, not the client-declared MIME type or
      // filename extension.
      const validation = await validateImageUpload(file, MAX_FILE_SIZE);
      if (!validation.valid) {
        uploadErrors.push(`${file.name}: ${validation.error || 'Invalid file'}`);
        continue;
      }

      // Use a server-generated key; never put user-controlled names in the
      // storage path.
      const fileExt = validation.detectedType?.split('/')[1] || 'jpg';
      const fileName = `property-photos/${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase Storage (using Job-storage bucket that exists)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Job-storage')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: validation.detectedType,
        });

      if (uploadError) {
        logger.error('Upload error for file', uploadError, {
          service: 'property_photos',
          userId: user.id,
          fileName: file.name,
        });
        uploadErrors.push(`${file.name}: Upload failed`);
        continue;
      }

      // Phase 2 storage hardening: issue a signed URL instead of a public URL
      // so the photo stays reachable once `Job-storage` flips to private.
      const signedUrl = await signJobStoragePath(fileName);

      if (signedUrl) {
        uploadedPhotos.push({ url: signedUrl, category });
      } else {
        uploadErrors.push(`${file.name}: Failed to sign URL`);
      }

      void uploadData; // suppress unused variable warning
    }

    if (uploadedPhotos.length === 0) {
      // All uploads failed - provide more context
      logger.error(
        'All property photo uploads failed',
        new Error('All uploads failed'),
        {
          service: 'property_photos',
          userId: user.id,
          attemptedFiles: photoFiles.length,
          uploadErrors: uploadErrors.length,
        }
      );
      return NextResponse.json(
        {
          error:
            'Failed to upload photos. Please check that the storage bucket exists and you have proper permissions.',
          details:
            'Ensure the Supabase storage bucket "Job-storage" is created and accessible.',
          uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
        },
        { status: 500 }
      );
    }

    // If some files failed but at least one succeeded, log a warning
    if (uploadedPhotos.length < photoFiles.length) {
      logger.warn('Partial property photo upload success', {
        service: 'property_photos',
        userId: user.id,
        successful: uploadedPhotos.length,
        total: photoFiles.length,
        errors: uploadErrors.length,
      });
    }

    return NextResponse.json({
      urls: uploadedPhotos.map((p) => p.url), // Keep for backward compatibility
      photos: uploadedPhotos, // New format with categories
      uploaded: uploadedPhotos.length,
      total: photoFiles.length,
      ...(uploadErrors.length > 0 && { warnings: uploadErrors }),
    });
  }
);
