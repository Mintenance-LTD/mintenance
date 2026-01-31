import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { validateImageUpload, createValidationErrorResponse, generateSecureFilename } from '@/lib/security/file-validator';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter-enhanced';

/**
 * POST /api/upload
 * Upload an image to Supabase storage
 * SECURITY: Uses magic number validation to prevent malicious file uploads
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Enhanced rate limiting with user-tier based limits
    // Uses configuration from rate-limits.ts: authenticated=10, premium=25, admin=50
    const rateLimitResult = await checkRateLimit(request, {
      path: '/api/upload'
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded. Please wait before uploading more files.' },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Get authenticated user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to upload files');
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    // SECURITY: Validate file using magic number (actual file content)
    // This prevents malicious files disguised as images by checking file signatures
    const validation = await validateImageUpload(file);

    if (!validation.valid) {
      logger.warn('[SECURITY] File upload blocked', {
        fileName: file.name,
        declaredType: file.type,
        errors: validation.errors,
        userId: user.id,
      });

      const errorResponse = createValidationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Log warnings if any detected (e.g., small file size, type mismatch)
    if (validation.warnings && validation.warnings.length > 0) {
      logger.warn('[SECURITY] File validation warnings', {
        fileName: file.name,
        warnings: validation.warnings,
        userId: user.id,
      });
    }

    const supabase = serverSupabase();

    // SECURITY: Generate secure filename (prevents path traversal and filename-based attacks)
    const secureFilename = generateSecureFilename(file.name);
    const fileName = `${user.id}/${secureFilename}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload file to storage', uploadError, {
        service: 'upload',
        userId: user.id,
        fileName,
      });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(uploadData.path);

    logger.info('File uploaded successfully', {
      service: 'upload',
      userId: user.id,
      fileName,
      path: uploadData.path,
      url: urlData.publicUrl,
    });

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
