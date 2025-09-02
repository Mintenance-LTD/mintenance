import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';


export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  // Populated fields
  senderName?: string;
  senderRole?: string;
}

export interface MessageThread {
  jobId: string;
  jobTitle: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export class MessagingService {
  private static activeChannels = new Map<string, RealtimeChannel>();

  /**
   * Send a message in a job conversation
   */
  static async sendMessage(
    jobId: string,
    receiverId: string,
    messageText: string,
    senderId: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    attachmentUrl?: string
  ): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          job_id: jobId,
          sender_id: senderId,
          receiver_id: receiverId,
          message_text: messageText,
          message_type: messageType,
          attachment_url: attachmentUrl,
          read: false,
          created_at: new Date().toISOString(),
        }])
        .select(`
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `)
        .single();

      if (error) throw error;

      // Create notification for recipient
      await this.createMessageNotification(data, receiverId);

      return this.formatMessage(data);
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
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
        .select(`
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `)
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
        .select(`
          id, title, homeowner_id, contractor_id,
          homeowner:users!jobs_homeowner_id_fkey(first_name, last_name, role),
          contractor:users!jobs_contractor_id_fkey(first_name, last_name, role)
        `)
        .or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);

      if (jobsError) throw jobsError;

      const threads: MessageThread[] = [];

      for (const job of jobs) {
        // Get last message for this job
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(first_name, last_name, role)
          `)
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
        const otherParticipant = job.homeowner_id === userId 
          ? job.contractor 
          : job.homeowner;

        threads.push({
          jobId: job.id,
          jobTitle: job.title,
          lastMessage: lastMessage?.[0] ? this.formatMessage(lastMessage[0]) : undefined,
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
            }
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
  static async markMessagesAsRead(jobId: string, userId: string): Promise<void> {
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
    onMessageUpdate: (message: Message) => void = () => {}
  ): () => void {
    const channelKey = `messages_${jobId}`;
    
    // Clean up existing channel if any
    if (this.activeChannels.has(channelKey)) {
      this.activeChannels.get(channelKey)?.unsubscribe();
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
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(first_name, last_name, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onNewMessage(this.formatMessage(data));
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
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(first_name, last_name, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onMessageUpdate(this.formatMessage(data));
          }
        }
      )
      .subscribe();

    this.activeChannels.set(channelKey, channel);

    // Return cleanup function
    return () => {
      channel.unsubscribe();
      this.activeChannels.delete(channelKey);
    };
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
          attachment_url: null
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
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name, role)
        `)
        .eq('job_id', jobId)
        .ilike('message_text', `%${searchTerm}%`)
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
  private static async createMessageNotification(message: any, receiverId: string): Promise<void> {
    try {
      await supabase.from('notifications').insert([{
        user_id: receiverId,
        title: 'New Message',
        message: `${message.sender?.first_name || 'Someone'} sent you a message`,
        type: 'message',
        action_url: `/jobs/${message.job_id}/messages`,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      logger.error('Error creating message notification:', error);
    }
  }

  /**
   * Format message data for consistent interface
   */
  private static formatMessage(data: any): Message {
    return {
      id: data.id,
      jobId: data.job_id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      messageText: data.message_text,
      messageType: data.message_type,
      attachmentUrl: data.attachment_url,
      read: data.read,
      createdAt: data.created_at,
      senderName: data.sender ? 
        `${data.sender.first_name || ''} ${data.sender.last_name || ''}`.trim() : 
        'Unknown User',
      senderRole: data.sender?.role,
    };
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