/**
 * Webhook Service - Core webhook processing and storage
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

export interface WebhookServiceConfig {
  supabase: SupabaseClient;
}
export interface WebhookEvent {
  source: string;
  eventId: string;
  eventType: string;
  idempotencyKey: string;
  payload: unknown;
  processedAt: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  result?: unknown;
  error?: string;
}
export class WebhookService {
  private supabase: SupabaseClient;
  constructor(config: WebhookServiceConfig) {
    this.supabase = config.supabase;
  }
  /**
   * Check if webhook event has already been processed (idempotency)
   */
  async checkIdempotency(
    idempotencyKey: string,
    source: string,
    event: unknown
  ): Promise<boolean> {
    try {
      // Check if event already exists
      const { data: existing } = await this.supabase
        .from('webhook_events')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .eq('source', source)
        .single();
      if (existing) {
        logger.info('Duplicate webhook event detected', {
          idempotencyKey,
          source,
          eventId: event.id,
          existingStatus: existing.status
        });
        return true;
      }
      // Store event as processing to prevent concurrent processing
      await this.supabase
        .from('webhook_events')
        .insert({
          idempotency_key: idempotencyKey,
          source,
          event_id: event.id,
          event_type: event.type,
          status: 'processing',
          payload: event,
          created_at: new Date().toISOString()
        });
      return false;
    } catch (error) {
      logger.error('Error checking webhook idempotency', { error, idempotencyKey });
      return false;
    }
  }
  /**
   * Store webhook event
   */
  async storeWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('webhook_events')
        .upsert({
          idempotency_key: event.idempotencyKey,
          source: event.source,
          event_id: event.eventId,
          event_type: event.eventType,
          status: event.status,
          payload: event.payload,
          result: event.result,
          error: event.error,
          processed_at: event.processedAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'idempotency_key'
        });
      if (error) {
        logger.error('Failed to store webhook event', { error, event });
      }
    } catch (error) {
      logger.error('Error storing webhook event', { error, event });
    }
  }
  /**
   * Get webhook event by ID
   */
  async getWebhookEvent(eventId: string, source: string): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .eq('event_id', eventId)
      .eq('source', source)
      .single();
    if (error) {
      logger.error('Failed to get webhook event', { error, eventId, source });
      return null;
    }
    return data;
  }
  /**
   * Update webhook event status
   */
  async updateWebhookStatus(
    idempotencyKey: string,
    status: WebhookEvent['status'],
    result?: unknown,
    error?: string
  ): Promise<void> {
    const updateData: unknown = {
      status,
      updated_at: new Date().toISOString()
    };
    if (result) {
      updateData.result = result;
    }
    if (error) {
      updateData.error = error;
    }
    if (status === 'processed') {
      updateData.processed_at = new Date().toISOString();
    }
    const { error: updateError } = await this.supabase
      .from('webhook_events')
      .update(updateData)
      .eq('idempotency_key', idempotencyKey);
    if (updateError) {
      logger.error('Failed to update webhook status', {
        error: updateError,
        idempotencyKey,
        status
      });
    }
  }
  /**
   * Get webhook history
   */
  async getWebhookHistory(
    source?: string,
    eventType?: string,
    limit = 100,
    offset = 0
  ): Promise<unknown> {
    let query = this.supabase
      .from('webhook_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (source) {
      query = query.eq('source', source);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    const { data, count, error } = await query;
    if (error) {
      logger.error('Failed to get webhook history', { error, source, eventType });
      return { events: [], total: 0 };
    }
    return {
      events: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }
  /**
   * Clean up old webhook events
   */
  async cleanupOldEvents(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const { data, error } = await this.supabase
      .from('webhook_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    if (error) {
      logger.error('Failed to cleanup old webhook events', { error });
      return 0;
    }
    const deletedCount = data?.length || 0;
    logger.info('Cleaned up old webhook events', {
      deletedCount,
      daysToKeep,
      cutoffDate: cutoffDate.toISOString()
    });
    return deletedCount;
  }
  /**
   * Retry failed webhook events
   */
  async getFailedEvents(source?: string, limit = 10): Promise<any[]> {
    let query = this.supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (source) {
      query = query.eq('source', source);
    }
    const { data, error } = await query;
    if (error) {
      logger.error('Failed to get failed webhook events', { error });
      return [];
    }
    return data || [];
  }
  /**
   * Get webhook statistics
   */
  async getWebhookStats(source?: string, days = 7): Promise<unknown> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    let query = this.supabase
      .from('webhook_events')
      .select('status, event_type, source')
      .gte('created_at', startDate.toISOString());
    if (source) {
      query = query.eq('source', source);
    }
    const { data, error } = await query;
    if (error) {
      logger.error('Failed to get webhook stats', { error });
      return {};
    }
    // Calculate statistics
    const stats: unknown = {
      total: data?.length || 0,
      byStatus: {},
      byType: {},
      bySource: {}
    };
    (data || []).forEach((event: unknown) => {
      // Count by status
      stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;
      // Count by type
      stats.byType[event.event_type] = (stats.byType[event.event_type] || 0) + 1;
      // Count by source
      stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
    });
    return stats;
  }
}