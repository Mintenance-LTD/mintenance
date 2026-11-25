import { SOCIAL_NOTIFICATION_TYPES } from '@mintenance/types';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { annotatePaymentAlerts } from './payment-alerts';
import { resolveInboxActions, type InboxRow } from './inbox-actions';
import { syncPropertyInvitationNotifications } from './property-invitations';

const pageSize = 25;
const cursorSchema = z.object({
  before: z.iso.datetime({ offset: true }),
  beforeId: z.uuid(),
});

export async function fetchWebUnreadCount(userId: string): Promise<number> {
  const { data, error } = await serverSupabase.rpc(
    'web_notification_unread_count',
    {
      p_user: userId,
      p_excluded_types: SOCIAL_NOTIFICATION_TYPES,
    }
  );
  if (error) throw error;
  return Number(data);
}

export async function fetchWebNotificationInbox(
  actor: { id: string; role?: string },
  params: URLSearchParams
) {
  const cursor =
    params.has('before') || params.has('beforeId')
      ? cursorSchema.safeParse(Object.fromEntries(params))
      : null;
  if (cursor && !cursor.success)
    throw new BadRequestError('Invalid notification cursor');

  if (!cursor) await syncPropertyInvitationNotifications(actor);

  const [page, unreadCount] = await Promise.all([
    serverSupabase.rpc('web_notification_inbox', {
      p_user: actor.id,
      p_excluded_types: SOCIAL_NOTIFICATION_TYPES,
      p_limit: pageSize + 1,
      p_before: cursor?.data.before ?? null,
      p_before_id: cursor?.data.beforeId ?? null,
    }),
    fetchWebUnreadCount(actor.id),
  ]);
  if (page.error) throw page.error;
  const rows = (page.data ?? []) as InboxRow[];
  const visible = rows.slice(0, pageSize);
  const last = visible.at(-1);
  const resolved = await resolveInboxActions(serverSupabase, actor, visible);
  const notifications = await annotatePaymentAlerts(
    serverSupabase,
    actor.id,
    resolved
  );
  return {
    notifications,
    unreadCount,
    nextCursor:
      last && rows.length > pageSize
        ? { before: last.created_at, beforeId: last.id }
        : null,
  };
}

export async function updateWebNotificationGroup(
  userId: string,
  id: string,
  remove: boolean
) {
  if (!z.uuid().safeParse(id).success)
    throw new BadRequestError('Invalid notification ID');
  if (!(await updateWebNotificationGroups(userId, [id], remove)))
    throw new NotFoundError('Notification not found');
}

export async function updateWebNotificationGroups(
  userId: string,
  ids: string[],
  remove: boolean
) {
  const { data, error } = await serverSupabase.rpc(
    'update_web_notification_group',
    {
      p_user: userId,
      p_notifications: ids,
      p_delete: remove,
    }
  );
  if (error) throw error;
  return data === true;
}
