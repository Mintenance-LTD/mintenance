import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NextRequest } from 'next/server';

export type AdminActionCategory = 
  | 'user_management' 
  | 'verification' 
  | 'security' 
  | 'settings' 
  | 'revenue' 
  | 'communication'
  | 'ip_blocking';

export interface AdminActivityLogEntry {
  admin_id: string;
  action_type: string;
  action_category: AdminActionCategory;
  target_type?: string;
  target_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

interface AdminActivityLogRecord extends AdminActivityLogEntry {
  id: string;
  created_at: string;
  admin?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Service for logging admin activities
 */
export class AdminActivityLogger {
  /**
   * Log an admin action
   */
  static async logActivity(entry: AdminActivityLogEntry): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('admin_activity_log')
        .insert({
          admin_id: entry.admin_id,
          action_type: entry.action_type,
          action_category: entry.action_category,
          target_type: entry.target_type,
          target_id: entry.target_id,
          description: entry.description,
          metadata: entry.metadata || {},
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null,
        });

      if (error) {
        logger.error('Failed to log admin activity', {
          service: 'AdminActivityLogger',
          error: error.message,
          entry,
        });
      } else {
        logger.info('Admin activity logged', {
          service: 'AdminActivityLogger',
          action_type: entry.action_type,
          admin_id: entry.admin_id,
        });
      }
    } catch (error) {
      logger.error('Error logging admin activity', error, {
        service: 'AdminActivityLogger',
        entry,
      });
    }
  }

  /**
   * Log admin action from request context
   */
  static async logFromRequest(
    request: NextRequest,
    adminId: string,
    actionType: string,
    actionCategory: AdminActionCategory,
    description: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await this.logActivity({
      admin_id: adminId,
      action_type: actionType,
      action_category: actionCategory,
      target_type: targetType,
      target_id: targetId,
      description,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Get admin activity logs
   */
  static async getActivityLogs(options: {
    adminId?: string;
    actionCategory?: AdminActionCategory;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    logs: AdminActivityLogRecord[];
    total: number;
  }> {
    try {
      let query = serverSupabase
        .from('admin_activity_log')
        .select('*, admin:admin_id(id, email, first_name, last_name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options.adminId) {
        query = query.eq('admin_id', options.adminId);
      }

      if (options.actionCategory) {
        query = query.eq('action_category', options.actionCategory);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch admin activity logs', {
          service: 'AdminActivityLogger',
          error: error.message,
        });
        return { logs: [], total: 0 };
      }

      return {
        logs: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error fetching admin activity logs', error, {
        service: 'AdminActivityLogger',
      });
      return { logs: [], total: 0 };
    }
  }
}

