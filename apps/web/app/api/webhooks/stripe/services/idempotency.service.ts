import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
export class IdempotencyService {
  /**
   * Checks if an event has already been processed
   * Prevents duplicate processing in case of webhook retries
   *
   * @param eventId Stripe event ID
   * @returns true if event was already processed
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const supabase = serverSupabase();
      const { data, error } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .eq('provider', 'stripe')
        .single();
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for new events
        logger.error('Failed to check event idempotency', {
          service: 'stripe-webhook',
          error: error.message,
          eventId,
        });
        // Don't throw - allow processing to continue
        return false;
      }
      const isProcessed = !!data;
      if (isProcessed) {
        logger.info('Skipping duplicate webhook event', {
          service: 'stripe-webhook',
          eventId,
        });
      }
      return isProcessed;
    } catch (error) {
      logger.error('Idempotency check failed', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
      });
      // Don't throw - allow processing to continue
      return false;
    }
  }
  /**
   * Records that an event has been processed
   *
   * @param eventId Stripe event ID
   * @param eventType Event type (e.g., 'payment_intent.succeeded')
   * @param eventData Full event data for audit trail
   */
  async recordEventProcessed(
    eventId: string,
    eventType: string,
    eventData: unknown
  ): Promise<void> {
    try {
      const supabase = serverSupabase();
      const { error } = await supabase.from('webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        provider: 'stripe',
        data: eventData,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) {
        // Log but don't throw - event processing was successful
        logger.error('Failed to record processed event', {
          service: 'stripe-webhook',
          error: error.message,
          eventId,
          eventType,
        });
      } else {
        logger.info('Webhook event recorded', {
          service: 'stripe-webhook',
          eventId,
          eventType,
        });
      }
    } catch (error) {
      // Log but don't throw - event processing was successful
      logger.error('Failed to record event processing', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        eventType,
      });
    }
  }
  /**
   * Cleans up old processed events (older than 30 days)
   * Should be called periodically via a cron job
   */
  async cleanupOldEvents(): Promise<void> {
    try {
      const supabase = serverSupabase();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { error, data } = await supabase
        .from('webhook_events')
        .delete()
        .eq('provider', 'stripe')
        .lt('processed_at', thirtyDaysAgo.toISOString())
        .select('id');
      if (error) {
        logger.error('Failed to cleanup old webhook events', {
          service: 'stripe-webhook',
          error: error.message,
        });
      } else {
        logger.info('Cleaned up old webhook events', {
          service: 'stripe-webhook',
          count: data?.length || 0,
        });
      }
    } catch (error) {
      logger.error('Webhook cleanup failed', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}