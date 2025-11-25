import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File upload security configuration
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10; // Maximum 10 photos per job

/**
 * POST /api/jobs/upload-photos
 * 
 * Uploads photos for a job posting.
 * Returns URLs that can be used when creating the job.
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable', new Error('Configuration error'), {
        service: 'jobs',
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable', new Error('Configuration error'), {
        service: 'jobs',
      });
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Get current user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const photoFiles = formData.getAll('photos') as File[];

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo is required' },
        { status: 400 }
      );
    }

    if (photoFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} photos allowed` },
        { status: 400 }
      );
    }

    // Upload each photo to Supabase Storage
    const uploadedUrls: string[] = [];

    for (const file of photoFiles) {
      // File size validation
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Each photo must be less than 5MB' },
          { status: 400 }
        );
      }

      // File type validation - MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
          { status: 400 }
        );
      }

      // File extension validation
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        return NextResponse.json(
          { error: 'Invalid file extension. Only jpg, jpeg, png, webp, and gif are allowed.' },
          { status: 400 }
        );
      }

      // SECURITY: Sanitize filename to prevent path traversal attacks
      // Remove any path separators, special characters, and ensure safe filename
      const sanitizedBaseName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/\.\./g, '') // Remove path traversal attempts
        .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
        .substring(0, 100); // Limit filename length
      
      // Generate safe filename with user ID and timestamp to prevent collisions
      const safeFileName = `${sanitizedBaseName}-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const fileName = `job-photos/${safeFileName}`;

      // Upload to Supabase Storage (using Job-storage bucket that exists)
      const { data: uploadData, error: uploadError } = await supabase.storage
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
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          return NextResponse.json(
            { error: 'Storage bucket not configured. Please contact support.' },
            { status: 500 }
          );
        }
        
        // Check if it's a permissions error
        if (uploadError.message?.includes('permission') || uploadError.message?.includes('access')) {
          return NextResponse.json(
            { error: 'Permission denied. Please check your account settings.' },
            { status: 403 }
          );
        }
        
        // For other errors, skip this file but continue with others
        // We'll collect all errors and return them if all files fail
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Job-storage')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      } else {
        logger.error('Failed to get public URL for uploaded file', new Error('URL generation failed'), {
          service: 'jobs',
          fileName,
          userId: user.id,
        });
      }
    }

    if (uploadedUrls.length === 0) {
      // All uploads failed - provide more context
      logger.error('All photo uploads failed', new Error('All uploads failed'), {
        service: 'jobs',
        attemptedFiles: photoFiles.length,
        userId: user.id,
      });
      return NextResponse.json(
        { 
          error: 'Failed to upload photos. Please check that the storage bucket exists and you have proper permissions.',
          details: 'Ensure the Supabase storage bucket "Job-storage" is created and accessible.'
        },
        { status: 500 }
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
    });
  } catch (error) {
    logger.error('Error uploading job photos', error, {
      service: 'jobs',
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to upload photos. Please try again.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

