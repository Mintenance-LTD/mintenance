/**
 * Message Service - Core messaging operations
 */
import { MessageType, MessageAttachment, Message, MessageReaction } from './types';
import { logger } from '@mintenance/shared';
interface SendMessageParams {
  threadId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}
interface GetMessagesParams {
  threadId: string;
  limit: number;
  before?: string;
  after?: string;
}
interface EditMessageParams {
  messageId: string;
  userId: string;
  content: string;
}
interface DeleteMessageParams {
  messageId: string;
  userId: string;
}
interface AddReactionParams {
  messageId: string;
  userId: string;
  emoji: string;
}
export class MessageService {
  private supabase: any;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Send a message
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    try {
      // Get thread to determine receiver
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select('*')
        .eq('id', params.threadId)
        .single();
      if (!thread) {
        throw new Error('Thread not found');
      }
      // Determine receiver if not specified
      let receiverId = params.receiverId;
      if (!receiverId && thread.job_id) {
        // For job-based threads, find the other participant
        const { data: job } = await this.supabase
          .from('jobs')
          .select('homeowner_id, contractor_id')
          .eq('id', thread.job_id)
          .single();
        if (job) {
          receiverId = job.homeowner_id === params.senderId
            ? job.contractor_id
            : job.homeowner_id;
        }
      }
      // Create message
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          thread_id: params.threadId,
          job_id: thread.job_id,
          sender_id: params.senderId,
          receiver_id: receiverId,
          message_text: params.content,
          message_type: params.type,
          metadata: params.metadata,
          read: false,
          edited: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      // Save attachments if present
      if (params.attachments && params.attachments.length > 0) {
        await this.saveAttachments(message.id, params.attachments);
      }
      // Update thread's last message
      await this.updateThreadLastMessage(params.threadId, message.id);
      return this.formatMessage(message);
    } catch (error) {
      logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
  /**
   * Get messages for a thread
   */
  async getThreadMessages(params: GetMessagesParams): Promise<Message[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id, first_name, last_name, role, profile_image_url
          ),
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .eq('thread_id', params.threadId)
        .order('created_at', { ascending: false })
        .limit(params.limit);
      if (params.before) {
        query = query.lt('created_at', params.before);
      }
      if (params.after) {
        query = query.gt('created_at', params.after);
      }
      const { data, error } = await query;
      if (error) throw error;
      // Reverse to get chronological order
      return (data || []).reverse().map((msg: any) => this.formatMessage(msg));
    } catch (error) {
      logger.error('Error getting thread messages:', error);
      return [];
    }
  }
  /**
   * Edit a message
   */
  async editMessage(params: EditMessageParams): Promise<Message> {
    try {
      // Check ownership
      const { data: existing } = await this.supabase
        .from('messages')
        .select('*')
        .eq('id', params.messageId)
        .eq('sender_id', params.userId)
        .single();
      if (!existing) {
        throw new Error('Message not found or access denied');
      }
      // Update message
      const { data: message, error } = await this.supabase
        .from('messages')
        .update({
          message_text: params.content,
          edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', params.messageId)
        .select(`
          *,
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .single();
      if (error) throw error;
      // Log edit history
      await this.logMessageEdit(params.messageId, params.userId, existing.message_text);
      return this.formatMessage(message);
    } catch (error) {
      logger.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  }
  /**
   * Delete a message
   */
  async deleteMessage(params: DeleteMessageParams): Promise<{ threadId: string }> {
    try {
      // Check ownership or admin rights
      const { data: message } = await this.supabase
        .from('messages')
        .select('thread_id, sender_id')
        .eq('id', params.messageId)
        .single();
      if (!message) {
        throw new Error('Message not found');
      }
      if (message.sender_id !== params.userId) {
        // Check if user is admin
        const { data: user } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', params.userId)
          .single();
        if (user?.role !== 'admin') {
          throw new Error('Access denied');
        }
      }
      // Soft delete message
      const { error } = await this.supabase
        .from('messages')
        .update({
          deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: params.userId
        })
        .eq('id', params.messageId);
      if (error) throw error;
      return { threadId: message.thread_id };
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }
  /**
   * Add reaction to a message
   */
  async addReaction(params: AddReactionParams): Promise<MessageReaction> {
    try {
      // Check if reaction already exists
      const { data: existing } = await this.supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', params.messageId)
        .eq('user_id', params.userId)
        .eq('emoji', params.emoji)
        .single();
      if (existing) {
        // Remove reaction if it exists (toggle)
        await this.supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
        return null as any;
      }
      // Add new reaction
      const { data: reaction, error } = await this.supabase
        .from('message_reactions')
        .insert({
          message_id: params.messageId,
          user_id: params.userId,
          emoji: params.emoji,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return {
        emoji: reaction.emoji,
        userId: reaction.user_id,
        createdAt: reaction.created_at
      };
    } catch (error) {
      logger.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }
  /**
   * Mark thread messages as read
   */
  async markThreadAsRead(threadId: string, userId: string): Promise<number> {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('receiver_id', userId)
        .eq('read', false)
        .select();
      if (error) throw error;
      return messages?.length || 0;
    } catch (error) {
      logger.error('Error marking thread as read:', error);
      return 0;
    }
  }
  /**
   * Get unread counts for threads
   */
  async getUnreadCounts(userId: string, threadIds: string[]): Promise<Record<string, number>> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('thread_id')
        .in('thread_id', threadIds)
        .eq('receiver_id', userId)
        .eq('read', false);
      const counts: Record<string, number> = {};
      for (const threadId of threadIds) {
        counts[threadId] = (data || []).filter((m: any) => m.thread_id === threadId).length;
      }
      return counts;
    } catch (error) {
      logger.error('Error getting unread counts:', error);
      return {};
    }
  }
  /**
   * Get total unread count for user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);
      return count || 0;
    } catch (error) {
      logger.error('Error getting total unread count:', error);
      return 0;
    }
  }
  /**
   * Search messages
   */
  async searchMessages(params: {
    userId: string;
    query: string;
    threadId?: string;
    limit?: number;
  }): Promise<Message[]> {
    try {
      let searchQuery = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id, first_name, last_name, role
          ),
          thread:message_threads!messages_thread_id_fkey(*)
        `)
        .ilike('message_text', `%${params.query}%`)
        .limit(params.limit || 20);
      // Filter by thread if specified
      if (params.threadId) {
        searchQuery = searchQuery.eq('thread_id', params.threadId);
      } else {
        // Only search in threads user has access to
        const { data: threads } = await this.supabase
          .from('message_threads')
          .select('id')
          .or(`participant_ids.cs.{${params.userId}}`);
        const threadIds = (threads || []).map((t: any) => t.id);
        searchQuery = searchQuery.in('thread_id', threadIds);
      }
      const { data } = await searchQuery
        .order('created_at', { ascending: false });
      return (data || []).map((msg: any) => this.formatMessage(msg));
    } catch (error) {
      logger.error('Error searching messages:', error);
      return [];
    }
  }
  // ============= Private Helper Methods =============
  private formatMessage(raw: any): Message {
    return {
      id: raw.id,
      threadId: raw.thread_id,
      senderId: raw.sender_id,
      receiverId: raw.receiver_id,
      content: raw.message_text || raw.content || '',
      type: raw.message_type || MessageType.TEXT,
      attachments: raw.attachments || [],
      metadata: raw.metadata,
      read: Boolean(raw.read),
      edited: Boolean(raw.edited),
      editedAt: raw.edited_at,
      createdAt: raw.created_at,
      reactions: raw.reactions?.map((r: any) => ({
        emoji: r.emoji,
        userId: r.user_id,
        createdAt: r.created_at
      })) || []
    };
  }
  private async saveAttachments(messageId: string, attachments: MessageAttachment[]): Promise<void> {
    try {
      const attachmentRecords = attachments.map(att => ({
        message_id: messageId,
        url: att.url,
        filename: att.filename,
        size: att.size,
        mime_type: att.mimeType,
        thumbnail_url: att.thumbnailUrl,
        created_at: new Date().toISOString()
      }));
      await this.supabase
        .from('message_attachments')
        .insert(attachmentRecords);
    } catch (error) {
      logger.error('Error saving attachments:', error);
    }
  }
  private async updateThreadLastMessage(threadId: string, messageId: string): Promise<void> {
    try {
      await this.supabase
        .from('message_threads')
        .update({
          last_message_id: messageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);
    } catch (error) {
      logger.error('Error updating thread last message:', error);
    }
  }
  private async logMessageEdit(messageId: string, userId: string, oldContent: string): Promise<void> {
    try {
      await this.supabase
        .from('message_edit_history')
        .insert({
          message_id: messageId,
          edited_by: userId,
          old_content: oldContent,
          edited_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error logging message edit:', error);
    }
  }
}