import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  await requireCSRF(request);
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await AdminCommunicationService.updateAnnouncement(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'update_announcement',
      'communication',
      `Updated announcement: ${updated.title}`,
      'announcement',
      id
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating announcement', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  await requireCSRF(request);
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await serverSupabase
      .from('admin_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting announcement', { error: error.message, id });
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'delete_announcement',
      'communication',
      `Deleted announcement: ${id}`,
      'announcement',
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting announcement', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

