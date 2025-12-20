import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface BlockedIP {
  id: string;
  ip_address: string;
  ip_range?: string;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  expires_at?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

/**
 * Service for managing blocked IP addresses
 */
export class IPBlockingService {
  /**
   * Check if an IP address is blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await serverSupabase
        .rpc('is_ip_blocked', { p_ip_address: ipAddress });

      if (error) {
        logger.error('Error checking if IP is blocked', {
          service: 'IPBlockingService',
          error: error.message,
          ipAddress,
        });
        return false;
      }

      return data === true;
    } catch (error) {
      logger.error('Exception checking IP block status', error, {
        service: 'IPBlockingService',
        ipAddress,
      });
      return false;
    }
  }

  /**
   * Block an IP address
   */
  static async blockIP(options: {
    ipAddress: string;
    reason: string;
    blockedBy: string;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }): Promise<BlockedIP | null> {
    try {
      const { data, error } = await serverSupabase
        .from('blocked_ips')
        .insert({
          ip_address: options.ipAddress,
          reason: options.reason,
          blocked_by: options.blockedBy,
          expires_at: options.expiresAt?.toISOString() || null,
          metadata: options.metadata || {},
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // If IP already exists, update it
        if (error.code === '23505') { // Unique violation
          const { data: updated, error: updateError } = await serverSupabase
            .from('blocked_ips')
            .update({
              reason: options.reason,
              blocked_by: options.blockedBy,
              expires_at: options.expiresAt?.toISOString() || null,
              metadata: options.metadata || {},
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('ip_address', options.ipAddress)
            .select()
            .single();

          if (updateError) {
            logger.error('Failed to update blocked IP', {
              service: 'IPBlockingService',
              error: updateError.message,
              ipAddress: options.ipAddress,
            });
            return null;
          }

          return updated;
        }

        logger.error('Failed to block IP', {
          service: 'IPBlockingService',
          error: error.message,
          ipAddress: options.ipAddress,
        });
        return null;
      }

      logger.info('IP blocked successfully', {
        service: 'IPBlockingService',
        ipAddress: options.ipAddress,
        blockedBy: options.blockedBy,
      });

      return data;
    } catch (error) {
      logger.error('Exception blocking IP', error, {
        service: 'IPBlockingService',
        ipAddress: options.ipAddress,
      });
      return null;
    }
  }

  /**
   * Unblock an IP address
   */
  static async unblockIP(ipAddress: string): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('blocked_ips')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('ip_address', ipAddress);

      if (error) {
        logger.error('Failed to unblock IP', {
          service: 'IPBlockingService',
          error: error.message,
          ipAddress,
        });
        return false;
      }

      logger.info('IP unblocked successfully', {
        service: 'IPBlockingService',
        ipAddress,
      });

      return true;
    } catch (error) {
      logger.error('Exception unblocking IP', error, {
        service: 'IPBlockingService',
        ipAddress,
      });
      return false;
    }
  }

  /**
   * Get all blocked IPs
   */
  static async getBlockedIPs(options: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    ips: BlockedIP[];
    total: number;
  }> {
    try {
      let query = serverSupabase
        .from('blocked_ips')
        .select('*, blocked_by_user:blocked_by(id, email, first_name, last_name)', { count: 'exact' })
        .order('blocked_at', { ascending: false });

      if (options.activeOnly !== false) {
        query = query.eq('is_active', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch blocked IPs', {
          service: 'IPBlockingService',
          error: error.message,
        });
        return { ips: [], total: 0 };
      }

      return {
        ips: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error fetching blocked IPs', error, {
        service: 'IPBlockingService',
      });
      return { ips: [], total: 0 };
    }
  }

  /**
   * Clean up expired IP blocks
   */
  static async cleanupExpiredBlocks(): Promise<number> {
    try {
      const { data, error } = await serverSupabase
        .from('blocked_ips')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('is_active', true)
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        logger.error('Failed to cleanup expired IP blocks', {
          service: 'IPBlockingService',
          error: error.message,
        });
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        logger.info('Cleaned up expired IP blocks', {
          service: 'IPBlockingService',
          count,
        });
      }

      return count;
    } catch (error) {
      logger.error('Exception cleaning up expired IP blocks', error, {
        service: 'IPBlockingService',
      });
      return 0;
    }
  }
}

