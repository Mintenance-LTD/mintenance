import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  is_active: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

/**
 * PUT /api/admin/announcements/[id]
 * Update an announcement
 */
export const PUT = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const { id } = params;
    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid announcement data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await AdminCommunicationService.updateAnnouncement(id, parsed.data);

    if (!updated) {
      throw new InternalServerError('Failed to update announcement');
    }

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
  }
);

/**
 * DELETE /api/admin/announcements/[id]
 * Delete an announcement
 */
export const DELETE = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const { id } = params;

    const { error } = await serverSupabase
      .from('admin_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting announcement', { error: error.message, id });
      throw new InternalServerError('Failed to delete announcement');
    }

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
  }
);
