import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { VideoCallInvitation } from '@mintenance/types';

/**
 * Send a video call invitation
 */
export async function sendCallInvitation(
  callId: string,
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<VideoCallInvitation> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const { data, error } = await supabase
    .from('video_call_invitations')
    .insert([{
      call_id: callId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    logger.error('Error sending call invitation', error);
    throw new Error('Failed to send invitation');
  }

  return {
    id: data.id,
    callId: data.call_id,
    fromUserId: data.from_user_id,
    toUserId: data.to_user_id,
    message: data.message,
    status: data.status,
    expiresAt: data.expires_at,
    createdAt: data.created_at
  };
}

/**
 * Update invitation status
 */
export async function updateInvitationStatus(
  invitationId: string,
  accept: boolean
): Promise<string | null> {
  const { error } = await supabase
    .from('video_call_invitations')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString()
    })
    .eq('id', invitationId);

  if (error) {
    logger.error('Error responding to invitation', error);
    throw new Error('Failed to respond to invitation');
  }

  if (accept) {
    const { data: invitation } = await supabase
      .from('video_call_invitations')
      .select('call_id')
      .eq('id', invitationId)
      .single();

    return invitation?.call_id ?? null;
  }

  return null;
}
