import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf-validator';
import { logger } from '@mintenance/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File upload security configuration
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/contractor/upload-photos
 * 
 * Uploads photos to contractor portfolio.
 * Following Single Responsibility Principle - only handles photo uploads.
 * 
 * @filesize Target: <200 lines
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent upload abuse
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.upload);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for photo upload', {
        service: 'contractor',
        endpoint: '/api/contractor/upload-photos',
      });
      return rateLimitResult.response!;
    }

    // CSRF protection - prevent cross-site attacks
    if (!(await requireCSRF(request))) {
      logger.warn('CSRF validation failed for photo upload', {
        service: 'contractor',
        endpoint: '/api/contractor/upload-photos',
      });
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Get current user
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      logger.warn('Unauthorized photo upload attempt', {
        service: 'contractor',
        endpoint: '/api/contractor/upload-photos',
        userId: user?.id,
      });
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in as contractor.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const photoFiles = formData.getAll('photos') as File[];

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo is required' },
        { status: 400 }
      );
    }

    // Upload each photo to Supabase Storage
    const uploadedUrls: string[] = [];

    for (const file of photoFiles) {
      // File size validation
      if (file.size > MAX_FILE_SIZE) {
        logger.warn('File size exceeded', {
          service: 'contractor',
          userId: user.id,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE,
        });
        return NextResponse.json(
          { error: 'Each photo must be less than 5MB' },
          { status: 400 }
        );
      }

      // File type validation - MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        logger.warn('Invalid file type uploaded', {
          service: 'contractor',
          userId: user.id,
          fileType: file.type,
          fileName: file.name,
        });
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
          { status: 400 }
        );
      }

      // File extension validation
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        logger.warn('Invalid file extension', {
          service: 'contractor',
          userId: user.id,
          fileExtension: fileExt,
          fileName: file.name,
        });
        return NextResponse.json(
          { error: 'Invalid file extension. Only jpg, jpeg, png, webp, and gif are allowed.' },
          { status: 400 }
        );
      }

      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `portfolio/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contractor-portfolio')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error', uploadError, {
          service: 'contractor',
          userId: user.id,
          fileName: file.name,
          filePath,
        });
        continue; // Skip this file but continue with others
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contractor-portfolio')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any photos' },
        { status: 500 }
      );
    }

    // Create contractor_post entry
    const { data, error } = await supabase
      .from('contractor_posts')
      .insert({
        contractor_id: user.id,
        post_type: 'portfolio',
        title,
        project_category: category,
        media_urls: uploadedUrls,
        thumbnail_url: uploadedUrls[0], // First image as thumbnail
        is_public: true,
        is_featured: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Database insert error', error, {
        service: 'contractor',
        userId: user.id,
        uploadedCount: uploadedUrls.length,
      });
      return NextResponse.json(
        { error: 'Failed to save photos to portfolio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      uploadedCount: uploadedUrls.length,
    });
  } catch (error) {
    logger.error('Photo upload error', error, {
      service: 'contractor',
      endpoint: '/api/contractor/upload-photos',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

