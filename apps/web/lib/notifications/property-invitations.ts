import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function syncPropertyInvitationNotifications(actor: {
  id: string;
  role?: string;
}) {
  if (actor.role !== 'homeowner') return;
  const { error } = await serverSupabase.rpc(
    'sync_property_invitation_notifications',
    { p_user: actor.id }
  );
  if (error)
    logger.warn('Could not refresh property invitation notifications', {
      service: 'notifications',
      code: error.code,
    });
}
