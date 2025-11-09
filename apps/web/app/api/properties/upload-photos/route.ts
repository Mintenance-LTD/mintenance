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
const MAX_FILES = 10; // Maximum 10 photos per property

/**
 * POST /api/properties/upload-photos
 * 
 * Uploads photos for a property.
 * Returns URLs that can be used when creating the property.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
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

    // Only homeowners can upload property photos
    if (user.role !== 'homeowner') {
      return NextResponse.json(
        { error: 'Only homeowners can upload property photos.' },
        { status: 403 }
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
      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        uploadErrors.push(`${file.name}: Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        uploadErrors.push(`${file.name}: File too large. Maximum size is 5MB.`);
        continue;
      }

      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        uploadErrors.push(`${file.name}: Invalid file extension.`);
        continue;
      }

      // Generate unique filename
      const fileName = `property-photos/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage (using Job-storage bucket that exists)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Job-storage')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error for file:', file.name, uploadError);
        uploadErrors.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Job-storage')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedPhotos.push({ url: urlData.publicUrl, category });
      } else {
        uploadErrors.push(`${file.name}: Failed to get public URL`);
      }
    }

    if (uploadedPhotos.length === 0) {
      // All uploads failed - provide more context
      console.error('All property photo uploads failed. Attempted to upload:', photoFiles.length, 'files');
      return NextResponse.json(
        { 
          error: 'Failed to upload photos. Please check that the storage bucket exists and you have proper permissions.',
          details: 'Ensure the Supabase storage bucket "Job-storage" is created and accessible.',
          uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined
        },
        { status: 500 }
      );
    }
    
    // If some files failed but at least one succeeded, log a warning
    if (uploadedPhotos.length < photoFiles.length) {
      console.warn(
        `Only ${uploadedPhotos.length} of ${photoFiles.length} property photos uploaded successfully.`,
        { errors: uploadErrors }
      );
    }

    return NextResponse.json({ 
      urls: uploadedPhotos.map(p => p.url), // Keep for backward compatibility
      photos: uploadedPhotos, // New format with categories
      uploaded: uploadedPhotos.length,
      total: photoFiles.length,
      ...(uploadErrors.length > 0 && { warnings: uploadErrors })
    });

  } catch (error) {
    console.error('Error uploading property photos:', error);
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

