/**
 * Expo Push Notification Service (Server-side)
 *
 * Sends push notifications to mobile app users via the Expo Push API.
 * Reads push tokens from the user_push_tokens table in Supabase.
 *
 * Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface PushMessage {
  to: string; // ExpoPushToken
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface PushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo recommends max 100 per request

export class ExpoPushService {
  /**
   * Send push notification to a single user (all their registered devices)
   */
  static async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.getTokensForUser(userId);
    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendToTokens(tokens, notification);
  }

  /**
   * Send push notification to multiple users by role
   */
  static async sendToRole(
    role: 'homeowner' | 'contractor' | 'admin' | 'all',
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }
  ): Promise<{ sent: number; failed: number; totalUsers: number }> {
    const tokens = await this.getTokensByRole(role);
    const result = await this.sendToTokens(tokens, notification);
    return { ...result, totalUsers: tokens.length };
  }

  /**
   * Send to a list of Expo push tokens in batches
   */
  private static async sendToTokens(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }
  ): Promise<{ sent: number; failed: number }> {
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: 'default',
    }));

    let sent = 0;
    let failed = 0;

    // Send in batches of 100
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          logger.error('Expo Push API error', {
            service: 'push',
            status: response.status,
            batchSize: batch.length,
          });
          failed += batch.length;
          continue;
        }

        const result = await response.json();
        const receipts: PushReceipt[] = result.data || [];

        for (const receipt of receipts) {
          if (receipt.status === 'ok') {
            sent++;
          } else {
            failed++;
            // Remove invalid tokens
            if (receipt.details?.error === 'DeviceNotRegistered') {
              const token = batch[receipts.indexOf(receipt)]?.to;
              if (token) {
                await this.removeToken(token);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Failed to send push notification batch', error, {
          service: 'push',
          batchSize: batch.length,
        });
        failed += batch.length;
      }
    }

    logger.info('Push notifications sent', {
      service: 'push',
      sent,
      failed,
      total: tokens.length,
    });

    return { sent, failed };
  }

  /**
   * Get all push tokens for a specific user
   */
  private static async getTokensForUser(userId: string): Promise<string[]> {
    const { data, error } = await serverSupabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to fetch push tokens for user', error, {
        service: 'push',
        userId,
      });
      return [];
    }

    return (data || []).map((row) => row.push_token);
  }

  /**
   * Get all push tokens filtered by user role
   */
  private static async getTokensByRole(
    role: 'homeowner' | 'contractor' | 'admin' | 'all'
  ): Promise<string[]> {
    if (role === 'all') {
      const { data, error } = await serverSupabase
        .from('user_push_tokens')
        .select('push_token');

      if (error) {
        logger.error('Failed to fetch all push tokens', error, {
          service: 'push',
        });
        return [];
      }
      return (data || []).map((row) => row.push_token);
    }

    // Join with profiles to filter by role
    const { data, error } = await serverSupabase
      .from('user_push_tokens')
      .select('push_token, profiles!inner(role)')
      .eq('profiles.role', role);

    if (error) {
      logger.error('Failed to fetch push tokens by role', error, {
        service: 'push',
        role,
      });
      return [];
    }

    return (data || []).map((row) => row.push_token);
  }

  /**
   * Remove an invalid/expired push token
   */
  private static async removeToken(token: string): Promise<void> {
    const { error } = await serverSupabase
      .from('user_push_tokens')
      .delete()
      .eq('push_token', token);

    if (error) {
      logger.error('Failed to remove invalid push token', error, {
        service: 'push',
      });
    } else {
      logger.info('Removed invalid push token', { service: 'push' });
    }
  }
}
