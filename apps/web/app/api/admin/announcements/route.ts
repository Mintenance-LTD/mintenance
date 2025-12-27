import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
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
    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { title, content, announcement_type, target_audience, priority, is_published, expires_at, created_by } = body;

    if (!title || !content || !created_by) {
      throw new BadRequestError('Title, content, and created_by are required');
    }

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

