import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  validateImageUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';

/**
 * POST /api/contractor/upload-photos
 * Uploads photos to contractor portfolio.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const photoFiles = formData.getAll('photos') as File[];

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    if (photoFiles.length === 0) {
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];
    const uploadedPaths: string[] = [];

    for (const file of photoFiles) {
      const validation = await validateImageUpload(file, MAX_FILE_SIZES.profileImage);
      if (!validation.valid) {
        logger.warn('Invalid portfolio image', {
          service: 'contractor',
          userId: user.id,
          fileSize: file.size,
          validationError: validation.error,
        });
        return NextResponse.json({
          error: validation.error || 'Invalid image file',
        }, { status: 400 });
      }

      // SECURITY: Sanitize filename to prevent path traversal attacks
      const sanitizedBaseName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.\./g, '')
        .replace(/^\.+|\.+$/g, '')
        .substring(0, 100);

      const fileExt = validation.detectedType?.split('/')[1] || 'jpg';
      const safeFileName = `${sanitizedBaseName}-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `portfolio/${safeFileName}`;

      const { error: uploadError } = await serverSupabase.storage
        .from('contractor-portfolio')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: validation.detectedType,
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error', uploadError, { service: 'contractor', userId: user.id, fileName: file.name, filePath });
        continue; // Skip this file but continue with others
      }

      const { data: { publicUrl } } = serverSupabase.storage.from('contractor-portfolio').getPublicUrl(filePath);
      uploadedUrls.push(publicUrl);
      uploadedPaths.push(filePath);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'Failed to upload any photos' }, { status: 500 });
    }

    const { data, error } = await serverSupabase
      .from('contractor_posts')
      .insert({
        contractor_id: user.id,
        post_type: 'portfolio',
        title,
        project_category: category,
        media_urls: uploadedUrls,
        thumbnail_url: uploadedUrls[0],
        is_public: true,
        is_featured: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      const { error: cleanupError } = await serverSupabase.storage
        .from('contractor-portfolio')
        .remove(uploadedPaths);
      if (cleanupError) {
        logger.warn('Failed to clean up portfolio files after database failure', {
          service: 'contractor',
          userId: user.id,
          cleanupError,
        });
      }
      logger.error('Database insert error', error, { service: 'contractor', userId: user.id });
      return NextResponse.json({ error: 'Failed to save photos to portfolio' }, { status: 500 });
    }

    // 2026-05-20 audit fix: also append the uploaded URLs to
    // profiles.portfolio_images. The canonical portfolio source is
    // now `contractor_posts` (folded by /api/contractors/[id]), but
    // some legacy surfaces still read `profiles.portfolio_images`
    // directly. Keeping that field in sync avoids ghost-empty
    // portfolios on the consumers that haven't migrated yet.
    // Failure is logged but non-fatal — the canonical insert above
    // already succeeded.
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('portfolio_images')
      .eq('id', user.id)
      .single();
    const existingPortfolioImages = Array.isArray(profile?.portfolio_images)
      ? profile.portfolio_images
      : [];
    const nextPortfolioImages = Array.from(
      new Set([...existingPortfolioImages, ...uploadedUrls])
    );
    const { error: profileUpdateError } = await serverSupabase
      .from('profiles')
      .update({ portfolio_images: nextPortfolioImages })
      .eq('id', user.id);
    if (profileUpdateError) {
      logger.warn('Failed to sync contractor portfolio images to profile', {
        service: 'contractor',
        userId: user.id,
        error: profileUpdateError.message,
      });
    }

    return NextResponse.json({ success: true, data, uploadedCount: uploadedUrls.length });
  }
);
