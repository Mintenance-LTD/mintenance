/**
 * User Settings Controller
 * Handles GET /api/users/settings and PUT /api/users/settings
 */
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';
import { createClient } from '@supabase/supabase-js';
import { UserService, type UserSettings } from './UserService';
// Temporary logger until @mintenance/shared is available

export class UserSettingsController {
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
   * GET /api/users/settings - Get current user's settings
   */
  async getSettings(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserSettingsController] Getting user settings');
      // Get user ID from request (from auth middleware)
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Get settings
      const settings = await this.userService.getSettings(userId);
      const responseTime = Date.now() - startTime;
      logger.info('[UserSettingsController] Settings retrieved', {
        userId,
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('[UserSettingsController] Failed to get settings', { error });
      return NextResponse.json(
        {
          error: 'Failed to get settings',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
  /**
   * PUT /api/users/settings - Update current user's settings
   */
  async updateSettings(request: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();
      logger.info('[UserSettingsController] Updating user settings');
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
      // Validate settings structure
      const updates: Partial<UserSettings> = {};
      // Handle notification settings
      if (body.notifications) {
        const allowedNotificationFields = [
          'email_notifications',
          'push_notifications',
          'sms_notifications',
          'new_jobs',
          'bid_updates',
          'messages',
          'marketing',
        ];
        const notificationUpdates: Record<string, unknown> = {};
        for (const field of allowedNotificationFields) {
          if (body.notifications[field] !== undefined) {
            notificationUpdates[field] = body.notifications[field];
          }
        }
        if (Object.keys(notificationUpdates).length > 0) {
          updates.notifications = notificationUpdates as any;
        }
      }
      // Handle privacy settings
      if (body.privacy) {
        const allowedPrivacyFields = [
          'profile_visible',
          'show_phone',
          'show_email',
          'show_location',
        ];
        const privacyUpdates: Record<string, unknown> = {};
        for (const field of allowedPrivacyFields) {
          if (body.privacy[field] !== undefined) {
            privacyUpdates[field] = body.privacy[field];
          }
        }
        if (Object.keys(privacyUpdates).length > 0) {
          updates.privacy = privacyUpdates as any;
        }
      }
      // Handle display settings
      if (body.display) {
        const allowedDisplayFields = [
          'theme',
          'language',
          'timezone',
          'date_format',
        ];
        const displayUpdates: Record<string, unknown> = {};
        for (const field of allowedDisplayFields) {
          if (body.display[field] !== undefined) {
            displayUpdates[field] = body.display[field];
          }
        }
        // Validate theme value
        if (displayUpdates.theme && !['light', 'dark', 'system'].includes(displayUpdates.theme as string)) {
          return NextResponse.json(
            { error: 'Invalid theme value. Must be "light", "dark", or "system"' },
            { status: 400 }
          );
        }
        if (Object.keys(displayUpdates).length > 0) {
          updates.display = displayUpdates as any;
        }
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: 'No valid settings to update' },
          { status: 400 }
        );
      }
      // Update settings
      const settings = await this.userService.updateSettings(userId, updates as any);
      const responseTime = Date.now() - startTime;
      logger.info('[UserSettingsController] Settings updated', {
        userId,
        categories: Object.keys(updates),
        responseTime
      });
      return NextResponse.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      logger.error('[UserSettingsController] Failed to update settings', { error });
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
          error: 'Failed to update settings',
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
        return this.getSettings(request);
      case 'PUT':
        return this.updateSettings(request);
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
    }
  }
}
