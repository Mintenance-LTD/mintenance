import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  await requireCSRF(request);
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const body = await request.json();

    const updated = await AdminCommunicationService.updateAnnouncement(id, body);

    if (!updated) {
      throw new InternalServerError('Failed to update announcement');
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
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  await requireCSRF(request);
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { id } = await params;

    const { error } = await serverSupabase
      .from('admin_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting announcement', { error: error.message, id });
      throw new InternalServerError('Failed to delete announcement');
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
    return handleAPIError(error);
  }
}

