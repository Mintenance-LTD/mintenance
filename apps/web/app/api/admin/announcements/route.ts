import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { sanitizeText, sanitizeMessage } from '@/lib/sanitizer';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const publishedOnly = request.nextUrl.searchParams.get('publishedOnly') === 'true';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

    const { announcements, total } = await AdminCommunicationService.getAllAnnouncements({
      publishedOnly,
      limit,
      offset,
    });

    return NextResponse.json({ announcements, total });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const body = await request.json();

    // Create validation schema with sanitization
    const announcementSchema = z.object({
      title: z.string().min(1).max(200).transform(val => sanitizeText(val, 200)),
      content: z.string().min(1).max(5000).transform(val => sanitizeMessage(val)),
      announcement_type: z.enum(['general', 'maintenance', 'security', 'feature']).optional(),
      target_audience: z.enum(['all', 'homeowners', 'contractors', 'admins']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      is_published: z.boolean().optional(),
      expires_at: z.string().nullable().optional(),
      created_by: z.string().uuid(),
    });

    const parsed = announcementSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid announcement data: ' + parsed.error.message);
    }

    const { title, content, announcement_type, target_audience, priority, is_published, expires_at, created_by } = parsed.data;

    const announcement = await AdminCommunicationService.createAnnouncement({
      title,
      content,
      announcement_type: announcement_type || 'general',
      target_audience: target_audience || 'all',
      priority: priority || 'normal',
      is_published: is_published || false,
      expires_at: expires_at || null,
      created_by,
    });

    if (!announcement) {
      throw new InternalServerError('Failed to create announcement');
    }

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'create_announcement',
      'communication',
      `Created announcement: ${title}`,
      'announcement',
      announcement.id
    );

    return NextResponse.json(announcement);
  } catch (error) {
    return handleAPIError(error);
  }
}

