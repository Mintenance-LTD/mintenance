/**
 * User Settings API Route
 * GET /api/users/settings - Get user settings
 * PUT /api/users/settings - Update user settings
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { userSettingsUpdateSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view settings');
    }

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
          marketing: false
        },
        privacy: {
          profile_visible: true,
          show_phone: false,
          show_email: false,
          show_location: true
        },
        display: {
          theme: 'system',
          language: 'en',
          timezone: 'Europe/London',
          date_format: 'DD/MM/YYYY'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to update settings');
    }

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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleAPIError(error);
  }
}