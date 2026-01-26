/**
 * Notification Controller - Centralized notification management
 */
import { NotificationService } from './NotificationService';
import { logger } from '@mintenance/shared';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';
import { PushNotificationService } from './PushNotificationService';
import { InAppNotificationService } from './InAppNotificationService';
import { NotificationQueueService } from './NotificationQueueService';
import { NotificationTemplateService } from './NotificationTemplateService';
import { NotificationType, Notification as BaseNotification } from './types';
// Temporary types
interface NextRequest {
  url: string;
  method: string;
  headers: Headers;
  json(): Promise<unknown>;
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
  phone?: string;
  notification_preferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
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
  logger.error('Notification Error:', error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  return NextResponse.json(
    { error: message },
    { status }
  );
}
// NotificationType and Notification are now imported from ./types
export { NotificationType };
export type Notification = BaseNotification;
export class NotificationController {
  private notificationService: NotificationService;
  private emailService: EmailService;
  private smsService: SMSService;
  private pushService: PushNotificationService;
  private inAppService: InAppNotificationService;
  private queueService: NotificationQueueService;
  private templateService: NotificationTemplateService;
  constructor() {
    const config = {
      supabase: {} as any,
      twilioConfig: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!
      },
      sendgridConfig: {
        apiKey: process.env.SENDGRID_API_KEY!,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@mintenance.com'
      }
    };
    this.notificationService = new NotificationService(config);
    this.emailService = new EmailService(config);
    this.smsService = new SMSService(config);
    this.pushService = new PushNotificationService(config);
    this.inAppService = new InAppNotificationService(config);
    this.queueService = new NotificationQueueService(config);
    this.templateService = new NotificationTemplateService(config);
  }
  /**
   * GET /api/notifications - Get user notifications
   */
  async getNotifications(request: NextRequest): Promise<Response> {
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
      // Get authenticated user
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
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const unreadOnly = url.searchParams.get('unread') === 'true';
      const type = url.searchParams.get('type') as NotificationType | undefined;
      // Get notifications
      const notifications = await this.inAppService.getUserNotifications({
        userId: user.id,
        limit,
        offset,
        unreadOnly,
        type
      });
      // Get unread count
      const unreadCount = await this.inAppService.getUnreadCount(user.id);
      return NextResponse.json({
        notifications,
        unreadCount,
        total: notifications.length,
        limit,
        offset
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/notifications - Send a notification
   */
  async sendNotification(request: NextRequest): Promise<Response> {
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
      const data = await request.json();
      const {
        recipientId,
        type,
        title,
        message,
        actionUrl,
        metadata,
        channels = ['in_app'],
        priority = 'normal',
        scheduledFor
      } = data;
      // Validate required fields
      if (!recipientId || !type || !title || !message) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      // Get recipient preferences
      const preferences = await this.notificationService.getUserPreferences(recipientId);
      // Send notification through requested channels
      const results: Record<string, any> = {};
      for (const channel of channels) {
        if (!this.isChannelEnabled(channel, preferences)) {
          results[channel] = { skipped: true, reason: 'User preference disabled' };
          continue;
        }
        try {
          switch (channel) {
            case 'email':
              results.email = await this.emailService.sendNotificationEmail({
                recipientId,
                type,
                title,
                message,
                actionUrl,
                metadata
              });
              break;
            case 'sms':
              results.sms = await this.smsService.sendNotificationSMS({
                recipientId,
                message: this.formatSMSMessage(title, message),
                metadata
              });
              break;
            case 'push':
              results.push = await this.pushService.sendPushNotification({
                recipientId,
                title,
                body: message,
                data: { type, actionUrl, ...metadata }
              });
              break;
            case 'in_app':
              results.in_app = await this.inAppService.createNotification({
                userId: recipientId,
                type,
                title,
                message,
                actionUrl,
                metadata
              });
              break;
          }
        } catch (channelError: unknown) {
          logger.error(`Failed to send ${channel} notification:`, channelError);
          results[channel] = { error: true, message: channelError.message };
        }
      }
      // Queue notification if scheduled
      if (scheduledFor) {
        await this.queueService.queueNotification({
          recipientId,
          type,
          title,
          message,
          actionUrl,
          metadata,
          channels,
          priority,
          scheduledFor
        });
      }
      return NextResponse.json({
        success: true,
        results,
        notificationId: results.in_app?.id
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/notifications/[id]/read - Mark notification as read
   */
  async markAsRead(request: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
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
      // Mark notification as read
      const success = await this.inAppService.markAsRead(params.id, user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/notifications/mark-all-read - Mark all notifications as read
   */
  async markAllAsRead(request: NextRequest): Promise<Response> {
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
      // Mark all as read
      const count = await this.inAppService.markAllAsRead(user.id);
      return NextResponse.json({
        success: true,
        count,
        message: `Marked ${count} notifications as read`
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * DELETE /api/notifications/[id] - Delete a notification
   */
  async deleteNotification(request: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
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
      // Delete notification
      const success = await this.inAppService.deleteNotification(params.id, user.id);
      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * GET /api/notifications/unread-count - Get unread notification count
   */
  async getUnreadCount(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting - more lenient for count checks
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
      const count = await this.inAppService.getUnreadCount(user.id);
      return NextResponse.json({
        count,
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/notifications/preferences - Update notification preferences
   */
  async updatePreferences(request: NextRequest): Promise<Response> {
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
      const { email, sms, push, in_app } = data;
      // Update preferences
      const preferences = await this.notificationService.updateUserPreferences(user.id, {
        email: email ?? true,
        sms: sms ?? false,
        push: push ?? true,
        in_app: in_app ?? true
      });
      return NextResponse.json({
        success: true,
        preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  /**
   * POST /api/notifications/bulk - Send bulk notifications
   */
  async sendBulkNotifications(request: NextRequest): Promise<Response> {
    try {
      // Rate limiting - strict for bulk operations
      const rateLimitResult = await checkRateLimit(request, {
        identifier: this.getClientIdentifier(request),
        windowMs: 60000,
        maxRequests: 2
      });
      if (!rateLimitResult.allowed) {
        return this.rateLimitResponse(rateLimitResult);
      }
      // CSRF protection
      await requireCSRF(request);
      // Admin only
      const user = await getCurrentUserFromCookies();
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      const data = await request.json();
      const { recipientIds, type, title, message, actionUrl, metadata, channels = ['in_app'] } = data;
      if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
        return NextResponse.json(
          { error: 'Recipients list is required' },
          { status: 400 }
        );
      }
      // Queue bulk notifications
      const results = await this.queueService.queueBulkNotifications({
        recipientIds,
        type,
        title,
        message,
        actionUrl,
        metadata,
        channels
      });
      return NextResponse.json({
        success: true,
        queued: results.queued,
        failed: results.failed,
        message: `Queued ${results.queued} notifications`
      });
    } catch (error: unknown) {
      return handleAPIError(error);
    }
  }
  // ============= Private Helper Methods =============
  private getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
    return `notifications:${ip}`;
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
  private isChannelEnabled(channel: string, preferences: unknown): boolean {
    if (!preferences) return channel === 'in_app'; // Default to in-app only
    switch (channel) {
      case 'email':
        return preferences.email === true;
      case 'sms':
        return preferences.sms === true;
      case 'push':
        return preferences.push === true;
      case 'in_app':
        return preferences.in_app !== false; // Default true
      default:
        return false;
    }
  }
  private formatSMSMessage(title: string, message: string): string {
    // SMS has character limits, so format concisely
    const combined = `${title}: ${message}`;
    return combined.length > 160 ? combined.substring(0, 157) + '...' : combined;
  }
}
// Export singleton instance (commented out to avoid circular dependency issues in tests)
// export const notificationController = new NotificationController();
