/**
 * Message Controller - Real-time messaging and chat management
 */
import { MessageService } from './MessageService';
import { logger } from '@mintenance/shared';
import { ThreadService } from './ThreadService';
import { RealtimeService } from './RealtimeService';
import { MessageNotificationService } from './MessageNotificationService';
import { MessageAttachmentService } from './MessageAttachmentService';
import { VideoCallService } from './VideoCallService';
import { MessageType, Message as BaseMessage, MessageAttachment, MessageReaction, MessageThread as BaseMessageThread, ThreadParticipant } from './types';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<Response>;
}
const NextResponse = {
  json(data: unknown, init?: ResponseInit): unknown {
    return {
      body: JSON.stringify(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    };
  }
};
interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  profile_image_url?: string;
}
// Mock functions
async function getCurrentUserFromCookies(): Promise<User | null> {
  return { id: 'user-123', email: 'user@example.com', role: 'homeowner' };
}
async function requireCSRF(request: NextRequest): Promise<void> {
  // CSRF validation
}
async function checkRateLimit(request: NextRequest, options: unknown) {
  return {
    allowed: true,
    remaining: 30,
    resetTime: Date.now() + 60000,
    retryAfter: 60
  };
}
function handleAPIError(error: unknown): unknown {
  logger.error('Message Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// Message types are now imported from ./types
export { MessageType };
export type { MessageAttachment, MessageReaction, ThreadParticipant };
export type Message = BaseMessage;
export type MessageThread = BaseMessageThread;
export class MessageController {
  private messageService: MessageService;
  private threadService: ThreadService;
  private realtimeService: RealtimeService;
  private notificationService: MessageNotificationService;
  private attachmentService: MessageAttachmentService;
  private videoCallService: VideoCallService;
  constructor() {
    const config = {
      supabase: {} as any,
      pusher: {} as any, // For real-time messaging
    };
    this.messageService = new MessageService(config);
    this.threadService = new ThreadService(config);
    this.realtimeService = new RealtimeService(config);
    this.notificationService = new MessageNotificationService(config);
    this.attachmentService = new MessageAttachmentService(config);
    this.videoCallService = new VideoCallService(config);
  }
  /**
   * GET /api/messages/threads - Get user's message threads
   */
  async getThreads(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const cursor = url.searchParams.get('cursor');
      const archived = url.searchParams.get('archived') === 'true';
      // Get threads
      const threads = await this.threadService.getUserThreads({
        userId: user.id,
        limit,
        cursor: cursor || undefined,
        archived
      });
      // Get unread counts for all threads
      const unreadCounts = await this.messageService.getUnreadCounts(
        user.id,
        threads.map(t => t.id)
      );
      // Merge unread counts
      const threadsWithUnread = threads.map(thread => ({
        ...thread,
        unreadCount: unreadCounts[thread.id] || 0
      }));
      return NextResponse.json({
        threads: threadsWithUnread,
        nextCursor: threads.length === limit ? threads[threads.length - 1].updatedAt : undefined
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/threads - Create a new thread
   */
  async createThread(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 10
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { jobId, participantId, initialMessage } = data;
      if (!jobId && !participantId) {
        return NextResponse.json(
          { error: 'Either jobId or participantId is required' },
          { status: 400 }
        );
      }
      // Create thread
      const thread = await this.threadService.createThread({
        jobId,
        creatorId: user.id,
        participantIds: participantId ? [user.id, participantId] : undefined
      });
      // Send initial message if provided
      if (initialMessage) {
        await this.messageService.sendMessage({
          threadId: thread.id,
          senderId: user.id,
          content: initialMessage,
          type: MessageType.TEXT
        });
      }
      return NextResponse.json({
        success: true,
        thread
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/messages/threads/[id]/messages - Get messages in a thread
   */
  async getMessages(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Check thread access
      const hasAccess = await this.threadService.checkThreadAccess(params.id, user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const before = url.searchParams.get('before');
      const after = url.searchParams.get('after');
      // Get messages
      const messages = await this.messageService.getThreadMessages({
        threadId: params.id,
        limit,
        before: before || undefined,
        after: after || undefined
      });
      // Mark messages as read
      await this.messageService.markThreadAsRead(params.id, user.id);
      return NextResponse.json({
        messages,
        hasMore: messages.length === limit
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/threads/[id]/messages - Send a message
   */
  async sendMessage(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 30
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Check thread access
      const hasAccess = await this.threadService.checkThreadAccess(params.id, user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      const data = await request.json();
      const { content, type = MessageType.TEXT, attachments, metadata } = data;
      if (!content && !attachments?.length) {
        return NextResponse.json(
          { error: 'Message content or attachment is required' },
          { status: 400 }
        );
      }
      // Process attachments if present
      let processedAttachments;
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.attachmentService.processAttachments(attachments);
      }
      // Send message
      const message = await this.messageService.sendMessage({
        threadId: params.id,
        senderId: user.id,
        content,
        type,
        attachments: processedAttachments,
        metadata
      });
      // Get thread participants for notifications
      const thread = await this.threadService.getThread(params.id);
      const recipients = thread.participants
        .filter(p => p.userId !== user.id)
        .map(p => p.userId);
      // Send real-time update
      await this.realtimeService.broadcastMessage({
        threadId: params.id,
        message,
        recipients
      });
      // Send notifications
      await this.notificationService.notifyNewMessage({
        message,
        sender: user,
        recipients,
        thread
      });
      return NextResponse.json({
        success: true,
        message
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * PUT /api/messages/[id] - Edit a message
   */
  async editMessage(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { content } = data;
      if (!content) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }
      // Edit message
      const message = await this.messageService.editMessage({
        messageId: params.id,
        userId: user.id,
        content
      });
      // Broadcast edit to thread participants
      await this.realtimeService.broadcastMessageEdit({
        threadId: message.threadId,
        message
      });
      return NextResponse.json({
        success: true,
        message
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * DELETE /api/messages/[id] - Delete a message
   */
  async deleteMessage(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 20
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Delete message
      const result = await this.messageService.deleteMessage({
        messageId: params.id,
        userId: user.id
      });
      // Broadcast deletion
      await this.realtimeService.broadcastMessageDeletion({
        threadId: result.threadId,
        messageId: params.id
      });
      return NextResponse.json({
        success: true,
        message: 'Message deleted'
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/[id]/reactions - Add reaction to message
   */
  async addReaction(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { emoji } = data;
      if (!emoji) {
        return NextResponse.json(
          { error: 'Emoji is required' },
          { status: 400 }
        );
      }
      // Add reaction
      const reaction = await this.messageService.addReaction({
        messageId: params.id,
        userId: user.id,
        emoji
      });
      // Broadcast reaction
      await this.realtimeService.broadcastReaction({
        messageId: params.id,
        reaction
      });
      return NextResponse.json({
        success: true,
        reaction
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/threads/[id]/read - Mark thread as read
   */
  async markThreadAsRead(
    request: NextRequest,
    { params }: { params: { id: string } }
  ): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 60
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // Mark as read
      const count = await this.messageService.markThreadAsRead(params.id, user.id);
      // Broadcast read status
      await this.realtimeService.broadcastReadStatus({
        threadId: params.id,
        userId: user.id
      });
      return NextResponse.json({
        success: true,
        markedCount: count
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/typing - Send typing indicator
   */
  async sendTypingIndicator(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting - more lenient for typing
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 120
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { threadId, typing } = data;
      if (!threadId) {
        return NextResponse.json(
          { error: 'Thread ID is required' },
          { status: 400 }
        );
      }
      // Broadcast typing indicator
      await this.realtimeService.broadcastTypingIndicator({
        threadId,
        userId: user.id,
        typing: typing !== false
      });
      return NextResponse.json({
        success: true
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/messages/video-call/start - Start a video call
   */
  async startVideoCall(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 5
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      const user = await getCurrentUserFromCookies();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const data = await request.json();
      const { threadId, participants } = data;
      if (!threadId || !participants?.length) {
        return NextResponse.json(
          { error: 'Thread ID and participants are required' },
          { status: 400 }
        );
      }
      // Start video call
      const call = await this.videoCallService.startCall({
        threadId,
        initiatorId: user.id,
        participants
      });
      // Send invitation message
      await this.messageService.sendMessage({
        threadId,
        senderId: user.id,
        content: 'Started a video call',
        type: MessageType.VIDEO_CALL_INVITATION,
        metadata: { callId: call.id }
      });
      // Notify participants
      await this.notificationService.notifyVideoCallInvitation({
        call,
        initiator: user
      });
      return NextResponse.json({
        success: true,
        call
      });
    } catch (error) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `messages:${ip}`;
  }
  private rateLimitResponse(rateLimitResult: unknown): unknown {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitResult.limit || 30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  }
}
// Export singleton instance (commented out to avoid circular dependency issues in tests)
// export const messageController = new MessageController();
