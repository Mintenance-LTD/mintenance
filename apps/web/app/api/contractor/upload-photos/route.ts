import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

    for (const file of photoFiles) {
      if (file.size > MAX_FILE_SIZE) {
        logger.warn('File size exceeded', { service: 'contractor', userId: user.id, fileSize: file.size });
        return NextResponse.json({ error: 'Each photo must be less than 5MB' }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        logger.warn('Invalid file type uploaded', { service: 'contractor', userId: user.id, fileType: file.type });
        return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' }, { status: 400 });
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        logger.warn('Invalid file extension', { service: 'contractor', userId: user.id, fileExtension: fileExt });
        return NextResponse.json({ error: 'Invalid file extension. Only jpg, jpeg, png, webp, and gif are allowed.' }, { status: 400 });
      }

      // SECURITY: Sanitize filename to prevent path traversal attacks
      const sanitizedBaseName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.\./g, '')
        .replace(/^\.+|\.+$/g, '')
        .substring(0, 100);

      const safeFileName = `${sanitizedBaseName}-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `portfolio/${safeFileName}`;

      const { error: uploadError } = await serverSupabase.storage
        .from('contractor-portfolio')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        logger.error('Upload error', uploadError, { service: 'contractor', userId: user.id, fileName: file.name, filePath });
        continue; // Skip this file but continue with others
      }

      const { data: { publicUrl } } = serverSupabase.storage.from('contractor-portfolio').getPublicUrl(filePath);
      uploadedUrls.push(publicUrl);
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
      logger.error('Database insert error', error, { service: 'contractor', userId: user.id });
      return NextResponse.json({ error: 'Failed to save photos to portfolio' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, uploadedCount: uploadedUrls.length });
  }
);
