import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export type AgencyActionType =
  | 'property_added'
  | 'property_deleted'
  | 'team_member_invited'
  | 'team_member_removed'
  | 'job_posted'
  | 'compliance_uploaded'
  | 'compliance_renewed'
  | 'recurring_schedule_created'
  | 'recurring_schedule_updated'
  | 'bulk_jobs_posted';

interface ActivityLogEntry {
  ownerId: string;
  actorUserId?: string;
  propertyId?: string;
  actionType: AgencyActionType;
  description: string;
  metadata?: Record<string, unknown>;
}

interface LogQueryOptions {
  limit?: number;
  offset?: number;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AgencyActivityLogger {
  static async logActivity(entry: ActivityLogEntry): Promise<void> {
    try {
      await serverSupabase.from('agency_activity_log').insert({
        owner_id: entry.ownerId,
        actor_user_id: entry.actorUserId || entry.ownerId,
        property_id: entry.propertyId || null,
        action_type: entry.actionType,
        description: entry.description,
        metadata: entry.metadata || {},
      });
    } catch (err) {
      logger.error('Failed to log agency activity', {
        service: 'agency-activity',
        entry,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  static async getActivityLogs(ownerId: string, options: LogQueryOptions = {}) {
    const { limit = 50, offset = 0, actionType, dateFrom, dateTo } = options;

    let query = serverSupabase
      .from('agency_activity_log')
      .select('*', { count: 'exact' })
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch agency activity logs', {
        service: 'agency-activity',
        ownerId,
        error: error.message,
      });
      return { logs: [], total: 0 };
    }

    return { logs: data || [], total: count || 0 };
  }
}
