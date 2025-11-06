import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

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
    logger.error('Error fetching announcements', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, announcement_type, target_audience, priority, is_published, expires_at, created_by } = body;

    if (!title || !content || !created_by) {
      return NextResponse.json({ error: 'Title, content, and created_by are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
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
    logger.error('Error creating announcement', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

