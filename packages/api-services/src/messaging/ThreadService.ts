/**
 * Thread Service - Manage message threads and conversations
 */
import { MessageThread, ThreadParticipant, MessageType } from './types';
import { logger } from '@mintenance/shared';
interface CreateThreadParams {
  jobId?: string;
  creatorId: string;
  participantIds?: string[];
  metadata?: Record<string, unknown>;
}
interface GetThreadsParams {
  userId: string;
  limit: number;
  cursor?: string;
  archived?: boolean;
}
export class ThreadService {
  private supabase: unknown;
  constructor(config: { supabase: unknown }) {
    this.supabase = config.supabase;
  }
  /**
   * Create a new thread
   */
  async createThread(params: CreateThreadParams): Promise<MessageThread> {
    try {
      let participantIds = params.participantIds || [];
      // For job-based threads, get participants from job
      if (params.jobId) {
        const { data: job } = await this.supabase
          .from('jobs')
          .select('homeowner_id, contractor_id')
          .eq('id', params.jobId)
          .single();
        if (job) {
          participantIds = [job.homeowner_id];
          if (job.contractor_id) {
            participantIds.push(job.contractor_id);
          }
        }
      }
      // Ensure creator is in participants
      if (!participantIds.includes(params.creatorId)) {
        participantIds.push(params.creatorId);
      }
      // Check if thread already exists for this job
      if (params.jobId) {
        const existing = await this.findExistingJobThread(params.jobId);
        if (existing) {
          return existing;
        }
      }
      // Create thread
      const { data: thread, error } = await this.supabase
        .from('message_threads')
        .insert({
          job_id: params.jobId,
          participant_ids: participantIds,
          created_by: params.creatorId,
          metadata: params.metadata,
          archived: false,
          muted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      // Get participants details
      const participants = await this.getParticipantDetails(participantIds);
      return {
        id: thread.id,
        jobId: thread.job_id,
        type: thread.type || (thread.job_id ? 'job' : 'direct'),
        participants,
        unreadCount: 0,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        archived: thread.archived,
        muted: thread.muted
      };
    } catch (error) {
      logger.error('Error creating thread:', error);
      throw new Error('Failed to create thread');
    }
  }
  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<MessageThread> {
    try {
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select(`
          *,
          last_message:messages!message_threads_last_message_id_fkey(
            id, message_text, message_type, created_at,
            sender:users!messages_sender_id_fkey(id, first_name, last_name)
          )
        `)
        .eq('id', threadId)
        .single();
      if (!thread) {
        throw new Error('Thread not found');
      }
      const participants = await this.getParticipantDetails(thread.participant_ids || []);
      return {
        id: thread.id,
        jobId: thread.job_id,
        type: thread.type || (thread.job_id ? 'job' : 'direct'),
        participants,
        lastMessage: thread.last_message ? {
          id: thread.last_message.id,
          threadId: thread.id,
          senderId: thread.last_message.sender.id,
          content: thread.last_message.message_text,
          type: thread.last_message.message_type as MessageType,
          read: true,
          edited: false,
          createdAt: thread.last_message.created_at
        } : undefined,
        unreadCount: 0,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        archived: thread.archived,
        muted: thread.muted
      };
    } catch (error) {
      logger.error('Error getting thread:', error);
      throw error;
    }
  }
  /**
   * Get user's threads
   */
  async getUserThreads(params: GetThreadsParams): Promise<MessageThread[]> {
    try {
      let query = this.supabase
        .from('message_threads')
        .select(`
          *,
          last_message:messages!message_threads_last_message_id_fkey(
            id, message_text, message_type, created_at,
            sender:users!messages_sender_id_fkey(id, first_name, last_name)
          ),
          job:jobs!message_threads_job_id_fkey(
            id, title, status
          )
        `)
        .contains('participant_ids', [params.userId])
        .eq('archived', params.archived || false)
        .order('updated_at', { ascending: false })
        .limit(params.limit);
      if (params.cursor) {
        query = query.lt('updated_at', params.cursor);
      }
      const { data: threads } = await query;
      if (!threads) return [];
      // Format threads with participant details
      const formattedThreads = await Promise.all(
        threads.map(async (thread: unknown) => {
          const participants = await this.getParticipantDetails(thread.participant_ids || []);
          return {
            id: thread.id,
            jobId: thread.job_id,
            jobTitle: thread.job?.title,
            participants,
            lastMessage: thread.last_message ? ({
              id: thread.last_message.id,
              content: thread.last_message.message_text,
              type: thread.last_message.message_type,
              createdAt: thread.last_message.created_at,
              senderName: (thread.last_message.sender as any)
                ? `${thread.last_message.sender.first_name} ${thread.last_message.sender.last_name}`
                : 'Unknown'
            } as any) : undefined,
            unreadCount: 0, // Will be populated by controller
            createdAt: thread.created_at,
            updatedAt: thread.updated_at,
            archived: thread.archived,
            muted: thread.muted
          };
        })
      );
      return formattedThreads;
    } catch (error) {
      logger.error('Error getting user threads:', error);
      return [];
    }
  }
  /**
   * Check if user has access to thread
   */
  async checkThreadAccess(threadId: string, userId: string): Promise<boolean> {
    try {
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select('participant_ids')
        .eq('id', threadId)
        .single();
      if (!thread) return false;
      return thread.participant_ids?.includes(userId) || false;
    } catch (error) {
      logger.error('Error checking thread access:', error);
      return false;
    }
  }
  /**
   * Archive/unarchive a thread
   */
  async archiveThread(threadId: string, userId: string, archived: boolean): Promise<void> {
    try {
      // Check access
      const hasAccess = await this.checkThreadAccess(threadId, userId);
      if (!hasAccess) {
        throw new Error('Access denied');
      }
      await this.supabase
        .from('message_threads')
        .update({ archived, updated_at: new Date().toISOString() })
        .eq('id', threadId);
    } catch (error) {
      logger.error('Error archiving thread:', error);
      throw new Error('Failed to archive thread');
    }
  }
  /**
   * Mute/unmute a thread
   */
  async muteThread(threadId: string, userId: string, muted: boolean): Promise<void> {
    try {
      // Store mute preference per user
      await this.supabase
        .from('thread_mute_preferences')
        .upsert({
          thread_id: threadId,
          user_id: userId,
          muted,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error muting thread:', error);
      throw new Error('Failed to mute thread');
    }
  }
  /**
   * Add participant to thread
   */
  async addParticipant(threadId: string, userId: string, addedBy: string): Promise<void> {
    try {
      // Get current thread
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select('participant_ids')
        .eq('id', threadId)
        .single();
      if (!thread) {
        throw new Error('Thread not found');
      }
      // Check if user adding has access
      if (!thread.participant_ids?.includes(addedBy)) {
        throw new Error('Access denied');
      }
      // Check if user already in thread
      if (thread.participant_ids?.includes(userId)) {
        return; // Already a participant
      }
      // Add participant
      const updatedParticipants = [...(thread.participant_ids || []), userId];
      await this.supabase
        .from('message_threads')
        .update({
          participant_ids: updatedParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);
      // Log the addition
      await this.logThreadEvent(threadId, 'participant_added', addedBy, { userId });
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw new Error('Failed to add participant');
    }
  }
  /**
   * Remove participant from thread
   */
  async removeParticipant(threadId: string, userId: string, removedBy: string): Promise<void> {
    try {
      // Get current thread
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select('participant_ids')
        .eq('id', threadId)
        .single();
      if (!thread) {
        throw new Error('Thread not found');
      }
      // Check permissions
      if (userId !== removedBy && !thread.participant_ids?.includes(removedBy)) {
        throw new Error('Access denied');
      }
      // Remove participant
      const updatedParticipants = (thread.participant_ids || []).filter((id: string) => id !== userId);
      await this.supabase
        .from('message_threads')
        .update({
          participant_ids: updatedParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);
      // Log the removal
      await this.logThreadEvent(threadId, 'participant_removed', removedBy, { userId });
    } catch (error) {
      logger.error('Error removing participant:', error);
      throw new Error('Failed to remove participant');
    }
  }
  // ============= Private Helper Methods =============
  private async findExistingJobThread(jobId: string): Promise<MessageThread | null> {
    try {
      const { data: thread } = await this.supabase
        .from('message_threads')
        .select('*')
        .eq('job_id', jobId)
        .single();
      if (!thread) return null;
      const participants = await this.getParticipantDetails(thread.participant_ids || []);
      return {
        id: thread.id,
        jobId: thread.job_id,
        type: thread.type || (thread.job_id ? 'job' : 'direct'),
        participants,
        unreadCount: 0,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        archived: thread.archived,
        muted: thread.muted
      };
    } catch (error) {
      return null;
    }
  }
  private async getParticipantDetails(userIds: string[]): Promise<ThreadParticipant[]> {
    try {
      if (!userIds || userIds.length === 0) return [];
      const { data: users } = await this.supabase
        .from('users')
        .select('id, first_name, last_name, role, profile_image_url, last_seen')
        .in('id', userIds);
      return (users || []).map((user: unknown) => ({
        userId: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
        role: user.role,
        profileImage: user.profile_image_url,
        online: this.isUserOnline(user.last_seen),
        lastSeen: user.last_seen
      }));
    } catch (error) {
      logger.error('Error getting participant details:', error);
      return [];
    }
  }
  private isUserOnline(lastSeen?: string): boolean {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  }
  private async logThreadEvent(
    threadId: string,
    eventType: string,
    userId: string,
    metadata?: unknown
  ): Promise<void> {
    try {
      await this.supabase
        .from('thread_events')
        .insert({
          thread_id: threadId,
          event_type: eventType,
          user_id: userId,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error logging thread event:', error);
    }
  }
}