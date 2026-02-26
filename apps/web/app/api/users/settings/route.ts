/**
 * User Settings API Route
 * GET /api/users/settings - Get user settings
 * PUT /api/users/settings - Update user settings
 */
import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { userSettingsUpdateSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async () => {
  return NextResponse.json({
    success: true,
    data: {
      notifications: {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        new_jobs: true,
        bid_updates: true,
        messages: true,
        marketing: false,
      },
      privacy: {
        profile_visible: true,
        show_phone: false,
        show_email: false,
        show_location: true,
      },
      display: {
        theme: 'system',
        language: 'en',
        timezone: 'Europe/London',
        date_format: 'DD/MM/YYYY',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export const PUT = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  // Validate and sanitize input using Zod schema
  const validation = await validateRequest(request, userSettingsUpdateSchema);
  if ('headers' in validation) {
    return validation;
  }

  const settings = validation.data;

  logger.info('User settings updated', {
    service: 'users',
    userId: user.id,
    updatedSections: Object.keys(settings),
  });

  return NextResponse.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings,
    timestamp: new Date().toISOString(),
  });
});
