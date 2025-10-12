import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    // Get current user
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
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
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Each photo must be less than 5MB' },
          { status: 400 }
        );
      }

      const fileExt = file.name.split('.').pop();
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
        console.error('Upload error:', uploadError);
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
        post_type: 'work_showcase',
        title,
        help_category: category,
        images: uploadedUrls,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
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
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

