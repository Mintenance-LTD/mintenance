import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const METRICS_ENABLED =
  process.env.BUILDING_SURVEYOR_METRICS_ENABLED === 'true';

interface MetricPayload {
  metric: string;
  payload: Record<string, unknown>;
}

export class MonitoringService {
  static async record(metric: string, payload: Record<string, unknown>): Promise<void> {
    // Always log for debugging
    logger.info('MonitoringService metric', {
      service: 'MonitoringService',
      metric,
      ...payload,
    });

    if (!METRICS_ENABLED) {
      return;
    }

    try {
      await serverSupabase.from('ml_metrics').insert({
        metric,
        payload,
      });
    } catch (error) {
      logger.warn('Failed to persist metric', {
        service: 'MonitoringService',
        metric,
        error,
      });
    }
  }
}

