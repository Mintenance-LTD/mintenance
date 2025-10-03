import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { sanitizeText } from '../utils/sanitize';
import { sanitizeForSQL, isValidSearchTerm } from '../utils/sqlSanitization';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed';
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  // Video call specific fields
  callId?: string;
  callDuration?: number;
  // Populated fields
  senderName?: string;
  senderRole?: string;
}

export interface MessageThread {
  jobId: string;
  jobTitle: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: {
    id: string;
    name: string;
    role: string;
  }[];
}

export class MessagingService {
  private static activeChannels = new Map<string, {
    channel: RealtimeChannel;
    createdAt: number;
  }>();
  private static readonly MAX_ACTIVE_CHANNELS = 50;

  /**
   * Send a message in a job conversation
   */
  static async sendMessage(
    jobId: string,
    receiverId: string,
    messageText: string,
    senderId: string,
    messageType: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed' = 'text',
    attachmentUrl?: string,
    callId?: string,
    callDuration?: number
  ): Promise<Message> {
    const context = {
      service: 'MessagingService',
      method: 'sendMessage',
      userId: senderId,
      params: { jobId, receiverId, messageType },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      // Validation
      ServiceErrorHandler.validateRequired(jobId, 'Job ID', context);
      ServiceErrorHandler.validateRequired(receiverId, 'Receiver ID', context);
      ServiceErrorHandler.validateRequired(messageText, 'Message text', context);
      ServiceErrorHandler.validateRequired(senderId, 'Sender ID', context);

      const safeMessageText = sanitizeText(messageText);
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            job_id: jobId,
            sender_id: senderId,
            receiver_id: receiverId,
            message_text: safeMessageText,
            message_type: messageType,
            attachment_url: attachmentUrl,
            call_id: callId,
            call_duration: callDuration,
            read: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `
        )
        .single();

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      // Create notification for recipient
      await this.createMessageNotification(data, receiverId);

      return this.formatMessage(data);
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to send message');
    }

    return result.data;
  }

  /**
   * Get messages for a job conversation
   */
  static async getJobMessages(
    jobId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map(this.formatMessage).reverse(); // Reverse to get chronological order
    } catch (error) {
      logger.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Get message threads for a user (conversations list)
   */
  static async getUserMessageThreads(userId: string): Promise<MessageThread[]> {
    try {
      // Get jobs where user is involved (as homeowner or contractor)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(
          `
          id, title, homeowner_id, contractor_id,
          homeowner:users!jobs_homeowner_id_fkey(first_name, last_name, role),
          contractor:users!jobs_contractor_id_fkey(first_name, last_name, role)
        `
        )
        .or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);

      if (jobsError) throw jobsError;

      const threads: MessageThread[] = [];

      for (const job of jobs) {
        // Get last message for this job
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(
            `
            *,
            sender:users!messages_sender_id_fkey(first_name, last_name, role)
          `
          )
          .eq('job_id', job.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get unread count for current user
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('receiver_id', userId)
          .eq('read', false);

        // Determine other participant
        const otherParticipant =
          job.homeowner_id === userId ? job.contractor : job.homeowner;

        threads.push({
          jobId: job.id,
          jobTitle: job.title,
          lastMessage: lastMessage?.[0]
            ? this.formatMessage(lastMessage[0])
            : undefined,
          unreadCount: unreadCount || 0,
          participants: [
            {
              id: job.homeowner_id,
              name: `${job.homeowner?.first_name || ''} ${job.homeowner?.last_name || ''}`.trim(),
              role: job.homeowner?.role || 'homeowner',
            },
            job.contractor && {
              id: job.contractor_id,
              name: `${job.contractor?.first_name || ''} ${job.contractor?.last_name || ''}`.trim(),
              role: job.contractor?.role || 'contractor',
            },
          ].filter(Boolean),
        });
      }

      return threads.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || '0';
        const bTime = b.lastMessage?.createdAt || '0';
        return bTime.localeCompare(aTime);
      });
    } catch (error) {
      logger.error('Error fetching message threads:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    jobId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('job_id', jobId)
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time messages for a job
   */
  static subscribeToJobMessages(
    jobId: string,
    onNewMessage: (message: Message) => void,
    onMessageUpdate: (message: Message) => void = () => {},
    onError: (error: any) => void = (error) =>
      logger.error('Real-time subscription error:', error)
  ): () => void {
    const channelKey = `messages_${jobId}`;

    try {
      // Clean up old channels if limit reached
      if (this.activeChannels.size >= this.MAX_ACTIVE_CHANNELS) {
        this.cleanupOldestChannel();
      }

      // Clean up existing channel if any
      if (this.activeChannels.has(channelKey)) {
        const existing = this.activeChannels.get(channelKey);
        existing?.channel.unsubscribe();
        this.activeChannels.delete(channelKey); // CRITICAL: Remove from Map to prevent memory leak
      }

      const channel = supabase
        .channel(`messages:job_id=eq.${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `job_id=eq.${jobId}`,
          },
          async (payload: any) => {
            try {
              // Fetch the complete message with sender info
              const { data, error } = await supabase
                .from('messages')
                .select(
                  `
                  *,
                  sender:users!messages_sender_id_fkey(first_name, last_name, role)
                `
                )
                .eq('id', payload.new.id)
                .single();

              if (error) {
                logger.error('Error fetching new message:', error);
                onError(error);
                return;
              }

              if (data) {
                onNewMessage(this.formatMessage(data));
              }
            } catch (error) {
              logger.error('Error processing new message:', error);
              onError(error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `job_id=eq.${jobId}`,
          },
          async (payload: any) => {
            try {
              const { data, error } = await supabase
                .from('messages')
                .select(
                  `
                  *,
                  sender:users!messages_sender_id_fkey(first_name, last_name, role)
                `
                )
                .eq('id', payload.new.id)
                .single();

              if (error) {
                logger.error('Error fetching updated message:', error);
                onError(error);
                return;
              }

              if (data) {
                onMessageUpdate(this.formatMessage(data));
              }
            } catch (error) {
              logger.error('Error processing message update:', error);
              onError(error);
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`Successfully subscribed to messages for job ${jobId}`);
          } else if (status === 'CLOSED') {
            logger.warn(`Real-time subscription closed for job ${jobId}`);
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`Real-time subscription error for job ${jobId}`);
            onError(new Error('Real-time subscription failed'));
          }
        });

      this.activeChannels.set(channelKey, {
        channel,
        createdAt: Date.now()
      });

      // Return cleanup function
      return () => {
        try {
          channel.unsubscribe();
          this.activeChannels.delete(channelKey); // CRITICAL: Remove from Map on cleanup
          logger.info(`Unsubscribed from messages for job ${jobId}`);
        } catch (error) {
          logger.error('Error unsubscribing from messages:', error);
        }
      };
    } catch (error) {
      logger.error('Error setting up real-time subscription:', error);
      onError(error);
      return () => {}; // Return no-op cleanup function
    }
  }

  /**
   * Cleanup the oldest channel to prevent unbounded memory growth
   * @private
   */
  private static cleanupOldestChannel(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, data] of this.activeChannels.entries()) {
      if (data.createdAt < oldestTime) {
        oldestTime = data.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const channel = this.activeChannels.get(oldestKey);
      if (channel) {
        channel.channel.unsubscribe();
        this.activeChannels.delete(oldestKey);
        logger.warn(`Cleaned up oldest channel: ${oldestKey}`);
      }
    }
  }

  /**
   * Get unread message count for user
   */
  static async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error getting unread message count:', error);
      return 0;
    }
  }

  /**
   * Delete a message (soft delete - mark as deleted)
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Only allow sender to delete their own messages
      const { error } = await supabase
        .from('messages')
        .update({
          message_text: '[Message deleted]',
          message_type: 'text',
          attachment_url: null,
        })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Search messages in a job conversation
   */
  static async searchJobMessages(
    jobId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Message[]> {
    try {
      // Validate search term
      if (!isValidSearchTerm(searchTerm)) {
        logger.warn('Invalid search term rejected:', { searchTerm: searchTerm.substring(0, 50) });
        return [];
      }

      // Sanitize and escape SQL wildcards to prevent SQL injection
      const sanitizedSearchTerm = sanitizeForSQL(searchTerm);
      if (!sanitizedSearchTerm) {
        return [];
      }

      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `
        )
        .eq('job_id', jobId)
        .ilike('message_text', `%${sanitizedSearchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(this.formatMessage);
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Create notification for new message
   */
  private static async createMessageNotification(
    message: any,
    receiverId: string
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert([
        {
          user_id: receiverId,
          title: 'New Message',
          message: `${message.sender?.first_name || 'Someone'} sent you a message`,
          type: 'message',
          action_url: `/jobs/${message.job_id}/messages`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      logger.error('Error creating message notification:', error);
    }
  }

  /**
   * Format message data for consistent interface
   */
  private static formatMessage(data: any): Message {
    const d = data || {};
    return {
      id: d.id || '',
      jobId: d.job_id || '',
      senderId: d.sender_id || '',
      receiverId: d.receiver_id || '',
      messageText: d.message_text || '',
      messageType: d.message_type || 'text',
      attachmentUrl: d.attachment_url,
      callId: d.call_id,
      callDuration: d.call_duration,
      read: Boolean(d.read),
      createdAt: d.created_at || new Date().toISOString(),
      senderName: d.sender
        ? `${d.sender.first_name || ''} ${d.sender.last_name || ''}`.trim()
        : 'Unknown User',
      senderRole: d.sender?.role,
    };
  }

  /**
   * Send video call invitation message
   */
  static async sendVideoCallInvitation(
    jobId: string,
    receiverId: string,
    senderId: string,
    callId: string
  ): Promise<Message> {
    const messageText = 'Wants to start a video call with you';

    return this.sendMessage(
      jobId,
      receiverId,
      messageText,
      senderId,
      'video_call_invitation',
      undefined,
      callId
    );
  }

  /**
   * Send video call started message
   */
  static async sendVideoCallStarted(
    jobId: string,
    receiverId: string,
    senderId: string,
    callId: string
  ): Promise<Message> {
    const messageText = 'Video call started';

    return this.sendMessage(
      jobId,
      receiverId,
      messageText,
      senderId,
      'video_call_started',
      undefined,
      callId
    );
  }

  /**
   * Send video call ended message
   */
  static async sendVideoCallEnded(
    jobId: string,
    receiverId: string,
    senderId: string,
    callId: string,
    duration: number
  ): Promise<Message> {
    const durationText = this.formatCallDuration(duration);
    const messageText = `Video call ended (${durationText})`;

    return this.sendMessage(
      jobId,
      receiverId,
      messageText,
      senderId,
      'video_call_ended',
      undefined,
      callId,
      duration
    );
  }

  /**
   * Send video call missed message
   */
  static async sendVideoCallMissed(
    jobId: string,
    receiverId: string,
    senderId: string,
    callId: string
  ): Promise<Message> {
    const messageText = 'Missed video call';

    return this.sendMessage(
      jobId,
      receiverId,
      messageText,
      senderId,
      'video_call_missed',
      undefined,
      callId
    );
  }

  /**
   * Get video call messages for a job
   */
  static async getVideoCallMessages(jobId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `
        )
        .eq('job_id', jobId)
        .in('message_type', ['video_call_invitation', 'video_call_started', 'video_call_ended', 'video_call_missed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.formatMessage);
    } catch (error) {
      logger.error('Error fetching video call messages:', error);
      throw error;
    }
  }

  /**
   * Format call duration for display
   */
  private static formatCallDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Get user conversations (alias for getUserMessageThreads)
   */
  static async getConversations(userId: string): Promise<MessageThread[]> {
    return this.getUserMessageThreads(userId);
  }

  /**
   * Mark message as read (alias for markMessagesAsRead)
   */
  static async markAsRead(jobId: string, userId: string): Promise<void> {
    return this.markMessagesAsRead(jobId, userId);
  }

  /**
   * Clean up all active message subscriptions
   */
  static cleanup(): void {
    this.activeChannels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.activeChannels.clear();
  }
}
