import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';

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

      const fileName = `job-photos/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage (create job-photos bucket if it doesn't exist)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, try creating it (this might fail, but we'll try)
        console.error('Upload error:', uploadError);
        continue; // Skip this file but continue with others
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload photos. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error) {
    console.error('Error uploading job photos:', error);
    return NextResponse.json(
      { error: 'Failed to upload photos. Please try again.' },
      { status: 500 }
    );
  }
}

