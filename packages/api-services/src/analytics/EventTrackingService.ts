/**
 * EventTrackingService
 *
 * Handles event collection, storage, and retrieval for analytics.
 * Supports both real-time and batch event processing.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { AnalyticsEvent, EventType, EventFilters, EventAggregation, TimeSeriesData } from './types';
// Event validation schema
const eventSchema = z.object({
  type: z.nativeEnum(EventType),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().datetime(),
  properties: z.record(z.any()).optional(),
  metadata: z.object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    url: z.string().optional(),
    device: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional()
  }).optional()
});
// Types are now imported from ./types to avoid circular dependencies
export class EventTrackingService {
  private supabase: SupabaseClient;
  private clickhouse?: any; // ClickHouse client for time-series data
  private redis?: any; // Redis for real-time processing
  private batchQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_DELAY_MS = 5000;
  constructor(supabase: SupabaseClient, clickhouse?: any, redis?: any) {
    this.supabase = supabase;
    this.clickhouse = clickhouse;
    this.redis = redis;
  }
  /**
   * Track a single event
   */
  async trackEvent(event: AnalyticsEvent): Promise<string> {
    try {
      // Validate event
      const validatedEvent = eventSchema.parse(event);
      // Generate event ID
      const eventId = this.generateEventId();
      // Store in primary database
      const { data, error } = await this.supabase
        .from('analytics_events')
        .insert({
          id: eventId,
          type: validatedEvent.type,
          user_id: validatedEvent.userId,
          session_id: validatedEvent.sessionId,
          timestamp: validatedEvent.timestamp,
          properties: validatedEvent.properties,
          metadata: validatedEvent.metadata
        })
        .select()
        .single();
      if (error) throw error;
      // Store in time-series database if available
      if (this.clickhouse) {
        await this.storeInTimeSeries(validatedEvent);
      }
      // Process real-time if critical event
      if (this.isCriticalEvent(validatedEvent.type)) {
        await this.processRealTime(validatedEvent);
      }
      // Update aggregations
      await this.updateAggregations(validatedEvent);
      return eventId;
    } catch (error) {
      logger.error('Error tracking event:', error);
      throw new Error('Failed to track event');
    }
  }
  /**
   * Track multiple events in batch
   */
  async trackEventsBatch(events: AnalyticsEvent[]): Promise<string[]> {
    try {
      // Validate all events
      const validatedEvents = events.map(event => eventSchema.parse(event));
      // Generate event IDs
      const eventsWithIds = validatedEvents.map(event => ({
        ...event,
        id: this.generateEventId()
      }));
      // Batch insert into primary database
      const { data, error } = await this.supabase
        .from('analytics_events')
        .insert(eventsWithIds.map(event => ({
          id: event.id,
          type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          timestamp: event.timestamp,
          properties: event.properties,
          metadata: event.metadata
        })))
        .select('id');
      if (error) throw error;
      // Store in time-series database if available
      if (this.clickhouse) {
        await this.batchStoreInTimeSeries(validatedEvents);
      }
      // Process critical events
      const criticalEvents = validatedEvents.filter(e => this.isCriticalEvent(e.type));
      if (criticalEvents.length > 0) {
        await Promise.all(criticalEvents.map(e => this.processRealTime(e)));
      }
      // Update aggregations
      await this.batchUpdateAggregations(validatedEvents);
      return data.map(d => d.id);
    } catch (error) {
      logger.error('Error tracking batch events:', error);
      throw new Error('Failed to track batch events');
    }
  }
  /**
   * Queue event for batch processing
   */
  async queueEvent(event: AnalyticsEvent): Promise<void> {
    this.batchQueue.push(event);
    // Process batch if size limit reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.processBatch();
    } else if (!this.batchTimer) {
      // Set timer for delayed batch processing
      this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY_MS);
    }
  }
  /**
   * Process queued events
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    const events = [...this.batchQueue];
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this.trackEventsBatch(events);
  }
  /**
   * Get events with filtering
   */
  async getEvents(filters: EventFilters): Promise<AnalyticsEvent[]> {
    try {
      let query = this.supabase
        .from('analytics_events')
        .select('*');
      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }
      if (filters.types && filters.types.length > 0) {
        query = query.in('type', filters.types);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters.properties) {
        for (const [key, value] of Object.entries(filters.properties)) {
          query = query.contains('properties', { [key]: value });
        }
      }
      // Apply pagination
      query = query.order('timestamp', { ascending: false });
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data.map(this.formatEvent);
    } catch (error) {
      logger.error('Error getting events:', error);
      throw new Error('Failed to get events');
    }
  }
  /**
   * Get event counts grouped by time period
   */
  async getEventCounts(
    groupBy: 'hour' | 'day' | 'week' | 'month',
    timeRange: { start: Date; end: Date },
    eventTypes?: EventType[]
  ): Promise<TimeSeriesData[]> {
    try {
      // Use ClickHouse if available for better performance
      if (this.clickhouse) {
        return await this.getTimeSeriesFromClickHouse(groupBy, timeRange, eventTypes);
      }
      // Fallback to PostgreSQL
      const { data, error } = await this.supabase.rpc('get_event_counts', {
        group_by: groupBy,
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
        event_types: eventTypes
      });
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting event counts:', error);
      throw new Error('Failed to get event counts');
    }
  }
  /**
   * Get event aggregations
   */
  async getEventAggregations(
    eventType: EventType,
    timeRange: { start: Date; end: Date }
  ): Promise<EventAggregation> {
    try {
      const { data, error } = await this.supabase.rpc('get_event_aggregations', {
        event_type: eventType,
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString()
      });
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting event aggregations:', error);
      throw new Error('Failed to get event aggregations');
    }
  }
  /**
   * Get user journey events
   */
  async getUserJourney(
    userId: string,
    sessionId?: string
  ): Promise<AnalyticsEvent[]> {
    try {
      let query = this.supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data.map(this.formatEvent);
    } catch (error) {
      logger.error('Error getting user journey:', error);
      throw new Error('Failed to get user journey');
    }
  }
  /**
   * Get funnel events for conversion analysis
   */
  async getFunnelEvents(
    steps: EventType[],
    timeRange: { start: Date; end: Date }
  ): Promise<{
    step: EventType;
    count: number;
    conversionRate: number;
  }[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_funnel_events', {
        steps: steps,
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString()
      });
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting funnel events:', error);
      throw new Error('Failed to get funnel events');
    }
  }
  /**
   * Delete old events (GDPR compliance)
   */
  async deleteOldEvents(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const { data, error } = await this.supabase
        .from('analytics_events')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');
      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      logger.error('Error deleting old events:', error);
      throw new Error('Failed to delete old events');
    }
  }
  // Helper methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  private isCriticalEvent(type: EventType): boolean {
    const criticalEvents = [
      EventType.PAYMENT_COMPLETED,
      EventType.PAYMENT_FAILED,
      EventType.JOB_COMPLETED,
      EventType.ERROR_OCCURRED,
      (EventType as any).SECURITY_ALERT
    ];
    return criticalEvents.includes(type);
  }
  private async processRealTime(event: AnalyticsEvent): Promise<void> {
    if (!this.redis) return;
    try {
      // Update real-time metrics in Redis
      await this.redis.hincrby('metrics:realtime', event.type, 1);
      await this.redis.sadd(`metrics:users:${new Date().toISOString().split('T')[0]}`, event.userId);
      await this.redis.expire('metrics:realtime', 3600); // 1 hour TTL
    } catch (error) {
      logger.error('Error processing real-time event:', error);
    }
  }
  private async storeInTimeSeries(event: AnalyticsEvent): Promise<void> {
    if (!this.clickhouse) return;
    try {
      await this.clickhouse.insert({
        table: 'events',
        values: [{
          timestamp: event.timestamp,
          type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          properties: JSON.stringify(event.properties),
          metadata: JSON.stringify(event.metadata)
        }]
      });
    } catch (error) {
      logger.error('Error storing in time-series:', error);
    }
  }
  private async batchStoreInTimeSeries(events: AnalyticsEvent[]): Promise<void> {
    if (!this.clickhouse) return;
    try {
      await this.clickhouse.insert({
        table: 'events',
        values: events.map(event => ({
          timestamp: event.timestamp,
          type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          properties: JSON.stringify(event.properties),
          metadata: JSON.stringify(event.metadata)
        }))
      });
    } catch (error) {
      logger.error('Error batch storing in time-series:', error);
    }
  }
  private async updateAggregations(event: AnalyticsEvent): Promise<void> {
    try {
      await this.supabase.rpc('update_event_aggregations', {
        event_type: event.type,
        user_id: event.userId,
        timestamp: event.timestamp
      });
    } catch (error) {
      logger.error('Error updating aggregations:', error);
    }
  }
  private async batchUpdateAggregations(events: AnalyticsEvent[]): Promise<void> {
    try {
      await this.supabase.rpc('batch_update_event_aggregations', {
        events: events.map(e => ({
          type: e.type,
          user_id: e.userId,
          timestamp: e.timestamp
        }))
      });
    } catch (error) {
      logger.error('Error batch updating aggregations:', error);
    }
  }
  private async getTimeSeriesFromClickHouse(
    groupBy: string,
    timeRange: { start: Date; end: Date },
    eventTypes?: EventType[]
  ): Promise<TimeSeriesData[]> {
    // ClickHouse implementation would go here
    return [];
  }
  private formatEvent(data: any): AnalyticsEvent {
    return {
      type: data.type,
      userId: data.user_id,
      sessionId: data.session_id,
      timestamp: data.timestamp,
      properties: data.properties,
      metadata: data.metadata
    };
  }
}