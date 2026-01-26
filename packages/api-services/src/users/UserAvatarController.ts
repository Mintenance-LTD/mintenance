/**
 * User Avatar Controller
 * Handles POST /api/users/avatar and DELETE /api/users/avatar
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { createClient } from '@supabase/supabase-js';
import { UserService } from './UserService';
// Temporary logger until @mintenance/shared is available

// File upload constraints
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export class UserAvatarController {
  private userService: UserService;
  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    this.userService = new UserService(supabase);
  }
  /**
   * POST /api/users/avatar - Upload user avatar
   */
  async uploadAvatar(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserAvatarController] Uploading avatar');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: 'Invalid file type',
            message: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
          },
          { status: 400 }
        );
      }
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: 'File too large',
            message: 'Maximum file size is 5MB',
          },
          { status: 400 }
        );
      }
      // Validate file extension
      const fileName = file.name.toLowerCase();
      const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
      if (!hasValidExtension) {
        return NextResponse.json(
          {
            error: 'Invalid file extension',
            message: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
          },
          { status: 400 }
        );
      }
      // Convert file to buffer for processing
      const buffer = Buffer.from(await file.arrayBuffer());
      // Create a file object that the service can handle
      const fileData = {
        buffer,
        mimetype: file.type,
        originalname: file.name,
        size: file.size,
      };
      // Upload avatar
      const url = await this.userService.uploadAvatar(userId, fileData);
      const responseTime = Date.now() - startTime;
      logger.info('[UserAvatarController] Avatar uploaded', {
        userId,
        fileName: file.name,
        fileSize: file.size,
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: {
          url,
          message: 'Avatar uploaded successfully',
        },
      });
    } catch (error) {
      logger.error('[UserAvatarController] Failed to upload avatar', { error });
      return NextResponse.json(
        {
          error: 'Failed to upload avatar',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * DELETE /api/users/avatar - Delete user avatar
   */
  async deleteAvatar(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserAvatarController] Deleting avatar');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Delete avatar
      await this.userService.deleteAvatar(userId);
      const responseTime = Date.now() - startTime;
      logger.info('[UserAvatarController] Avatar deleted', {
        userId,
        responseTime
      });
      return NextResponse.json({
        success: true,
        message: 'Avatar deleted successfully',
      });
    } catch (error) {
      logger.error('[UserAvatarController] Failed to delete avatar', { error });
      return NextResponse.json(
        {
          error: 'Failed to delete avatar',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * GET /api/users/avatar - Get user avatar URL
   */
  async getAvatar(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserAvatarController] Getting avatar URL');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Check if requesting another user's avatar
      const { searchParams } = new URL(request.url);
      const targetUserId = searchParams.get('id') || userId;
      // Get user profile to get avatar URL
      const profile = await this.userService.getProfile(targetUserId);
      if (!profile) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      const responseTime = Date.now() - startTime;
      logger.info('[UserAvatarController] Avatar URL retrieved', {
        userId: targetUserId,
        hasAvatar: !!profile.profile_image_url,
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: {
          url: profile.profile_image_url || null,
          has_avatar: !!profile.profile_image_url,
        },
      });
    } catch (error) {
      logger.error('[UserAvatarController] Failed to get avatar', { error });
      return NextResponse.json(
        {
          error: 'Failed to get avatar',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * Handle GET, POST, and DELETE requests
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const method = request.method;
    switch (method) {
      case 'GET':
        return this.getAvatar(request);
      case 'POST':
        return this.uploadAvatar(request);
      case 'DELETE':
        return this.deleteAvatar(request);
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
    }
  }
}