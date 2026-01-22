/**
 * User Profile Controller
 * Handles GET /api/users/profile and PUT /api/users/profile
 */
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import { createClient } from '@supabase/supabase-js';
import { UserService } from './UserService';
// Temporary logger until @mintenance/shared is available

export class UserProfileController {
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
   * GET /api/users/profile - Get current user's profile
   * GET /api/users/profile?id={userId} - Get specific user's profile (public info only)
   */
  async getProfile(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserProfileController] Getting user profile');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Check if requesting another user's profile
      const { searchParams } = new URL(request.url);
      const targetUserId = searchParams.get('id') || userId;
      // Get profile
      const profile = await this.userService.getProfile(targetUserId);
      if (!profile) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      // If requesting another user's profile, filter sensitive data
      if (targetUserId !== userId) {
        // Remove sensitive fields for public view
        const publicProfile = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          profile_image_url: profile.profile_image_url,
          company_name: profile.company_name,
          bio: profile.bio,
          location: profile.location,
          role: profile.role,
          created_at: profile.created_at,
          stats: profile.stats,
        };
        const responseTime = Date.now() - startTime;
        logger.info('[UserProfileController] Public profile retrieved', {
          userId: targetUserId,
          responseTime
        });
        return NextResponse.json({
          success: true,
          data: publicProfile,
        });
      }
      const responseTime = Date.now() - startTime;
      logger.info('[UserProfileController] Profile retrieved', {
        userId,
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('[UserProfileController] Failed to get profile', { error });
      return NextResponse.json(
        {
          error: 'Failed to get profile',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * PUT /api/users/profile - Update current user's profile
   */
  async updateProfile(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserProfileController] Updating user profile');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Parse request body
      const body = await request.json() as Record<string, any>;
      // Validate allowed fields
      const allowedFields = [
        'first_name',
        'last_name',
        'phone',
        'company_name',
        'bio',
        'location',
      ];
      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }
      // Update profile
      const profile = await this.userService.updateProfile(userId, updates);
      const responseTime = Date.now() - startTime;
      logger.info('[UserProfileController] Profile updated', {
        userId,
        fields: Object.keys(updates),
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('[UserProfileController] Failed to update profile', { error });
      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to update profile',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * Handle both GET and PUT requests
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const method = request.method;
    switch (method) {
      case 'GET':
        return this.getProfile(request);
      case 'PUT':
        return this.updateProfile(request);
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
    }
  }
}
