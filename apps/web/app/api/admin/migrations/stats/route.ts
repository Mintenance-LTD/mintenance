import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 20 } },
  async () => {
    // Fetch feature flag statistics
    const { data: flagStats } = await serverSupabase
      .from('feature_flag_stats')
      .select('*')
      .order('name');

    // Fetch controller usage logs for error rate (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await serverSupabase
      .from('controller_usage_logs')
      .select('module, is_new_controller, metadata')
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(1000);

    let errorRate = 0;
    let successRate = 100;

    if (logs && logs.length > 0) {
      type LogEntry = {
        is_new_controller: boolean;
        module: string;
        metadata?: { error?: unknown };
      };
      const typedLogs = logs as LogEntry[];
      const newControllerLogs = typedLogs.filter((l) => l.is_new_controller);
      const errorLogs = newControllerLogs.filter(
        (l) => l.metadata?.error || l.module.includes('fallback')
      );
      errorRate =
        newControllerLogs.length > 0
          ? parseFloat(
              ((errorLogs.length / newControllerLogs.length) * 100).toFixed(2)
            )
          : 0;
      successRate = parseFloat((100 - errorRate).toFixed(2));
    }

    return NextResponse.json({
      featureFlags: flagStats || [],
      migrationStats: { errorRate, successRate },
    });
  }
);
