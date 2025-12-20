import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';

export type AnnouncementType = 'general' | 'feature' | 'maintenance' | 'security' | 'feedback_request';
export type TargetAudience = 'all' | 'contractors' | 'homeowners' | 'verified_contractors';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  target_audience: TargetAudience;
  priority: AnnouncementPriority;
  is_published: boolean;
  published_at?: string;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing admin announcements and communications
 */
export class AdminCommunicationService {
  /**
   * Create a new announcement
   */
  static async createAnnouncement(
    announcement: Omit<AdminAnnouncement, 'id' | 'created_at' | 'updated_at' | 'created_by'> & {
      created_by: string;
    }
  ): Promise<AdminAnnouncement | null> {
    try {
      const { data, error } = await serverSupabase
        .from('admin_announcements')
        .insert({
          title: announcement.title,
          content: announcement.content,
          announcement_type: announcement.announcement_type,
          target_audience: announcement.target_audience,
          priority: announcement.priority,
          is_published: announcement.is_published,
          published_at: announcement.is_published ? new Date().toISOString() : null,
          expires_at: announcement.expires_at || null,
          created_by: announcement.created_by,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create announcement', {
          service: 'AdminCommunicationService',
          error: error.message,
        });
        return null;
      }

      // If published, send notifications
      if (announcement.is_published) {
        await this.sendAnnouncementNotifications(data.id);
      }

      logger.info('Announcement created', {
        service: 'AdminCommunicationService',
        announcementId: data.id,
      });

      return data;
    } catch (error) {
      logger.error('Exception creating announcement', error, {
        service: 'AdminCommunicationService',
      });
      return null;
    }
  }

  /**
   * Update an announcement
   */
  static async updateAnnouncement(
    id: string,
    updates: Partial<Omit<AdminAnnouncement, 'id' | 'created_at' | 'created_by'>> & {
      updated_by?: string;
    }
  ): Promise<AdminAnnouncement | null> {
    try {
      const updateData: Partial<AdminAnnouncement> & { updated_at: string; published_at?: string } = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If publishing for the first time, set published_at
      if (updates.is_published && !updates.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await serverSupabase
        .from('admin_announcements')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update announcement', {
          service: 'AdminCommunicationService',
          error: error.message,
          id,
        });
        return null;
      }

      // If just published, send notifications
      if (updates.is_published && data.is_published && !updates.published_at) {
        await this.sendAnnouncementNotifications(id);
      }

      return data;
    } catch (error) {
      logger.error('Exception updating announcement', error, {
        service: 'AdminCommunicationService',
        id,
      });
      return null;
    }
  }

  /**
   * Get announcements for a user
   */
  static async getUserAnnouncements(
    userId: string,
    userRole: 'contractor' | 'homeowner' | 'admin'
  ): Promise<AdminAnnouncement[]> {
    try {
      let query = serverSupabase
        .from('admin_announcements')
        .select('*')
        .eq('is_published', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('priority', { ascending: false })
        .order('published_at', { ascending: false });

      // Filter by target audience
      if (userRole !== 'admin') {
        query = query.or(`target_audience.eq.all,target_audience.eq.${userRole}s`);
        if (userRole === 'contractor') {
          // Also check if user is verified contractor
          const { data: user } = await serverSupabase
            .from('users')
            .select('admin_verified')
            .eq('id', userId)
            .single();

          if (user?.admin_verified) {
            query = query.or(`target_audience.eq.all,target_audience.eq.contractors,target_audience.eq.verified_contractors`);
          }
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user announcements', {
          service: 'AdminCommunicationService',
          error: error.message,
          userId,
        });
        return [];
      }

      // Filter out read announcements (optional - can be done client-side)
      return data || [];
    } catch (error) {
      logger.error('Exception getting user announcements', error, {
        service: 'AdminCommunicationService',
        userId,
      });
      return [];
    }
  }

  /**
   * Mark announcement as read
   */
  static async markAsRead(announcementId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('admin_announcement_reads')
        .insert({
          announcement_id: announcementId,
          user_id: userId,
        });

      if (error) {
        // Ignore duplicate key errors (already read)
        if (error.code !== '23505') {
          logger.error('Failed to mark announcement as read', {
            service: 'AdminCommunicationService',
            error: error.message,
            announcementId,
            userId,
          });
        }
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Exception marking announcement as read', error, {
        service: 'AdminCommunicationService',
        announcementId,
        userId,
      });
      return false;
    }
  }

  /**
   * Get all announcements (admin only)
   */
  static async getAllAnnouncements(options: {
    publishedOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    announcements: AdminAnnouncement[];
    total: number;
  }> {
    try {
      let query = serverSupabase
        .from('admin_announcements')
        .select('*, created_by_user:created_by(id, email, first_name, last_name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options.publishedOnly) {
        query = query.eq('is_published', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get all announcements', {
          service: 'AdminCommunicationService',
          error: error.message,
        });
        return { announcements: [], total: 0 };
      }

      return {
        announcements: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Exception getting all announcements', error, {
        service: 'AdminCommunicationService',
      });
      return { announcements: [], total: 0 };
    }
  }

  /**
   * Send announcement notifications via email
   */
  private static async sendAnnouncementNotifications(announcementId: string): Promise<void> {
    try {
      const { data: announcement } = await serverSupabase
        .from('admin_announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      if (!announcement) {
        return;
      }

      // Get target users
      let userQuery = serverSupabase
        .from('users')
        .select('id, email, first_name, last_name, role, admin_verified')
        .is('deleted_at', null);

      if (announcement.target_audience === 'contractors') {
        userQuery = userQuery.eq('role', 'contractor');
      } else if (announcement.target_audience === 'homeowners') {
        userQuery = userQuery.eq('role', 'homeowner');
      } else if (announcement.target_audience === 'verified_contractors') {
        userQuery = userQuery.eq('role', 'contractor').eq('admin_verified', true);
      }

      const { data: users, error } = await userQuery;

      if (error || !users || users.length === 0) {
        logger.warn('No users found for announcement notification', {
          service: 'AdminCommunicationService',
          announcementId,
          targetAudience: announcement.target_audience,
        });
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Send emails to all target users
      for (const user of users) {
        if (!user.email) continue;

        const userName = user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.email.split('@')[0];

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
              .priority-urgent { border-left: 4px solid #EF4444; }
              .priority-high { border-left: 4px solid #F59E0B; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${announcement.title}</h1>
              </div>
              <div class="content ${announcement.priority === 'urgent' ? 'priority-urgent' : announcement.priority === 'high' ? 'priority-high' : ''}">
                <p>Hi ${userName},</p>
                <div style="white-space: pre-wrap;">${announcement.content}</div>
                <a href="${baseUrl}/dashboard" class="button">View in Dashboard</a>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await EmailService.sendEmail({
          to: user.email,
          subject: `[Mintenance] ${announcement.title}`,
          html,
        }).catch((err) => {
          logger.error('Failed to send announcement email', {
            service: 'AdminCommunicationService',
            userId: user.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      logger.info('Announcement notifications sent', {
        service: 'AdminCommunicationService',
        announcementId,
        userCount: users.length,
      });
    } catch (error) {
      logger.error('Exception sending announcement notifications', error, {
        service: 'AdminCommunicationService',
        announcementId,
      });
    }
  }
}

