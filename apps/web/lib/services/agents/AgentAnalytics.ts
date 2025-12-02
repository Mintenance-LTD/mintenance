import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Agent performance metrics interface
 */
export interface AgentMetrics {
  agentName: string;
  totalDecisions: number;
  successRate: number;
  averageConfidence: number;
  errorRate: number;
  averageLatency: number;
  learningMetrics: {
    memoryUpdates: number;
    accuracyTrend: number[];
    lastSelfModification: Date | null;
  };
}

/**
 * Decision timeline data point
 */
export interface TimelineDataPoint {
  timestamp: string;
  decisions: number;
  successRate: number;
  averageConfidence: number;
}

/**
 * Learning progress data
 */
export interface LearningData {
  agentName: string;
  accuracyHistory: { date: string; accuracy: number }[];
  memoryUpdateFrequency: { date: string; updates: number }[];
  confidenceTrend: { date: string; confidence: number }[];
  lastUpdated: Date;
}

/**
 * Decision log entry
 */
export interface DecisionLog {
  id: string;
  agentName: string;
  decisionType: string;
  actionTaken: string | null;
  confidence: number;
  outcomeSuccess: boolean | null;
  createdAt: string;
  reasoning: string;
  metadata: Record<string, any>;
}

/**
 * Overview metrics for all agents
 */
export interface OverviewMetrics {
  totalDecisions24h: number;
  totalDecisions7d: number;
  totalDecisions30d: number;
  averageConfidence: number;
  successRate: number;
  errorRate: number;
  activeAgents: number;
  topPerformingAgent: string | null;
  recentErrors: Array<{
    agentName: string;
    decisionType: string;
    timestamp: string;
    error: string;
  }>;
}

/**
 * AgentAnalytics Service
 * Provides comprehensive analytics for AI agent performance monitoring
 */
export class AgentAnalytics {
  /**
   * Get metrics for a specific agent within a time range
   */
  static async getAgentMetrics(
    agentName: string,
    timeRange: '24h' | '7d' | '30d' = '30d'
  ): Promise<AgentMetrics | null> {
    try {
      const cutoffDate = this.getTimeRangeCutoff(timeRange);

      // Get agent decisions
      const { data: decisions, error: decisionsError } = await serverSupabase
        .from('agent_decisions')
        .select('confidence, outcome_success, created_at, metadata')
        .eq('agent_name', agentName)
        .gte('created_at', cutoffDate.toISOString());

      if (decisionsError) {
        logger.error('Failed to fetch agent decisions', {
          service: 'AgentAnalytics',
          error: decisionsError.message,
          agentName,
        });
        return null;
      }

      // Get memory updates from continuum memory
      const { data: memoryUpdates, error: memoryError } = await serverSupabase
        .from('memory_update_history')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (memoryError) {
        logger.warn('Failed to fetch memory updates', {
          service: 'AgentAnalytics',
          error: memoryError.message,
        });
      }

      // Filter memory updates for this agent
      const agentMemoryUpdates = (memoryUpdates || []).filter((update: any) => {
        // Get memory state to find agent name
        return true; // For now, include all updates
      });

      // Calculate metrics
      const totalDecisions = decisions?.length || 0;
      const decidedDecisions = decisions?.filter((d) => d.outcome_success !== null) || [];
      const successfulDecisions = decidedDecisions.filter((d) => d.outcome_success === true);

      const successRate = decidedDecisions.length > 0
        ? (successfulDecisions.length / decidedDecisions.length) * 100
        : 0;

      const averageConfidence = totalDecisions > 0
        ? decisions!.reduce((sum, d) => sum + (d.confidence || 0), 0) / totalDecisions
        : 0;

      const errorRate = totalDecisions > 0
        ? ((totalDecisions - successfulDecisions.length) / totalDecisions) * 100
        : 0;

      // Calculate average latency from metadata (if available)
      const latencies = decisions
        ?.map((d) => d.metadata?.latency_ms)
        .filter((l): l is number => typeof l === 'number') || [];
      const averageLatency = latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;

      // Calculate accuracy trend (last 7 days)
      const accuracyTrend = this.calculateAccuracyTrend(decisions || []);

      // Get last memory modification
      const lastMemoryUpdate = agentMemoryUpdates.length > 0
        ? new Date(agentMemoryUpdates[0].created_at)
        : null;

      return {
        agentName,
        totalDecisions,
        successRate: Math.round(successRate * 100) / 100,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        averageLatency: Math.round(averageLatency * 100) / 100,
        learningMetrics: {
          memoryUpdates: agentMemoryUpdates.length,
          accuracyTrend,
          lastSelfModification: lastMemoryUpdate,
        },
      };
    } catch (error) {
      logger.error('Error getting agent metrics', error, {
        service: 'AgentAnalytics',
        agentName,
      });
      return null;
    }
  }

  /**
   * Get overview metrics for all agents
   */
  static async getAllAgentsOverview(): Promise<AgentMetrics[]> {
    try {
      // Get all unique agent names
      const { data: agentNames, error: namesError } = await serverSupabase
        .from('agent_decisions')
        .select('agent_name')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (namesError) {
        logger.error('Failed to fetch agent names', {
          service: 'AgentAnalytics',
          error: namesError.message,
        });
        return [];
      }

      const uniqueAgents = [...new Set(agentNames?.map((a) => a.agent_name) || [])];

      // Get metrics for each agent
      const metricsPromises = uniqueAgents.map((agentName) =>
        this.getAgentMetrics(agentName, '30d')
      );

      const results = await Promise.all(metricsPromises);
      return results.filter((r): r is AgentMetrics => r !== null);
    } catch (error) {
      logger.error('Error getting all agents overview', error, {
        service: 'AgentAnalytics',
      });
      return [];
    }
  }

  /**
   * Get decision timeline for visualization (hourly aggregation for 24h)
   */
  static async getDecisionTimeline(
    agentName: string | null = null
  ): Promise<TimelineDataPoint[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      let query = serverSupabase
        .from('agent_decisions')
        .select('created_at, confidence, outcome_success')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

      if (agentName) {
        query = query.eq('agent_name', agentName);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch decision timeline', {
          service: 'AgentAnalytics',
          error: error.message,
        });
        return [];
      }

      // Group by hour
      const timelineMap = new Map<string, {
        decisions: number;
        successCount: number;
        totalConfidence: number;
        totalDecisionsWithOutcome: number;
      }>();

      data?.forEach((decision) => {
        const date = new Date(decision.created_at);
        const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

        if (!timelineMap.has(hourKey)) {
          timelineMap.set(hourKey, {
            decisions: 0,
            successCount: 0,
            totalConfidence: 0,
            totalDecisionsWithOutcome: 0,
          });
        }

        const entry = timelineMap.get(hourKey)!;
        entry.decisions += 1;
        entry.totalConfidence += decision.confidence || 0;

        if (decision.outcome_success !== null) {
          entry.totalDecisionsWithOutcome += 1;
          if (decision.outcome_success) {
            entry.successCount += 1;
          }
        }
      });

      // Convert to array and calculate rates
      return Array.from(timelineMap.entries())
        .map(([timestamp, stats]) => ({
          timestamp,
          decisions: stats.decisions,
          successRate: stats.totalDecisionsWithOutcome > 0
            ? Math.round((stats.successCount / stats.totalDecisionsWithOutcome) * 100 * 100) / 100
            : 0,
          averageConfidence: stats.decisions > 0
            ? Math.round((stats.totalConfidence / stats.decisions) * 100) / 100
            : 0,
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      logger.error('Error getting decision timeline', error, {
        service: 'AgentAnalytics',
      });
      return [];
    }
  }

  /**
   * Get learning progress data for an agent
   */
  static async getLearningProgress(agentName: string): Promise<LearningData | null> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      // Get decisions for accuracy history
      const { data: decisions, error: decisionsError } = await serverSupabase
        .from('agent_decisions')
        .select('created_at, outcome_success, confidence')
        .eq('agent_name', agentName)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

      if (decisionsError) {
        logger.error('Failed to fetch decisions for learning progress', {
          service: 'AgentAnalytics',
          error: decisionsError.message,
        });
        return null;
      }

      // Get memory updates
      const { data: memoryUpdates, error: memoryError } = await serverSupabase
        .from('memory_update_history')
        .select('created_at, step')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

      if (memoryError) {
        logger.warn('Failed to fetch memory updates for learning progress', {
          service: 'AgentAnalytics',
          error: memoryError.message,
        });
      }

      // Calculate accuracy history (daily)
      const accuracyHistory = this.groupByDay(decisions || [], (items) => {
        const withOutcome = items.filter((d) => d.outcome_success !== null);
        if (withOutcome.length === 0) return 0;
        const successful = withOutcome.filter((d) => d.outcome_success === true).length;
        return Math.round((successful / withOutcome.length) * 100 * 100) / 100;
      });

      // Calculate memory update frequency (daily)
      const memoryUpdateFrequency = this.groupByDay(memoryUpdates || [], (items) => items.length);

      // Calculate confidence trend (daily)
      const confidenceTrend = this.groupByDay(decisions || [], (items) => {
        if (items.length === 0) return 0;
        const avgConfidence = items.reduce((sum, d) => sum + (d.confidence || 0), 0) / items.length;
        return Math.round(avgConfidence * 100) / 100;
      });

      return {
        agentName,
        accuracyHistory,
        memoryUpdateFrequency,
        confidenceTrend,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Error getting learning progress', error, {
        service: 'AgentAnalytics',
        agentName,
      });
      return null;
    }
  }

  /**
   * Get recent decision logs with pagination
   */
  static async getDecisionLogs(
    agentName: string | null = null,
    limit: number = 50,
    offset: number = 0,
    includeErrors: boolean = false
  ): Promise<{ logs: DecisionLog[]; total: number }> {
    try {
      let query = serverSupabase
        .from('agent_decisions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (agentName) {
        query = query.eq('agent_name', agentName);
      }

      if (includeErrors) {
        query = query.eq('outcome_success', false);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch decision logs', {
          service: 'AgentAnalytics',
          error: error.message,
        });
        return { logs: [], total: 0 };
      }

      return {
        logs: (data || []).map((d) => ({
          id: d.id,
          agentName: d.agent_name,
          decisionType: d.decision_type,
          actionTaken: d.action_taken,
          confidence: d.confidence,
          outcomeSuccess: d.outcome_success,
          createdAt: d.created_at,
          reasoning: d.reasoning,
          metadata: d.metadata || {},
        })),
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error getting decision logs', error, {
        service: 'AgentAnalytics',
      });
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get overview metrics across all agents
   */
  static async getOverviewMetrics(): Promise<OverviewMetrics> {
    try {
      const now = new Date();
      const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get decisions for different time ranges
      const [
        { count: count24h },
        { count: count7d },
        { count: count30d },
        { data: allDecisions },
        { data: recentErrorsData },
      ] = await Promise.all([
        serverSupabase
          .from('agent_decisions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', cutoff24h.toISOString()),
        serverSupabase
          .from('agent_decisions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', cutoff7d.toISOString()),
        serverSupabase
          .from('agent_decisions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', cutoff30d.toISOString()),
        serverSupabase
          .from('agent_decisions')
          .select('confidence, outcome_success, agent_name')
          .gte('created_at', cutoff30d.toISOString()),
        serverSupabase
          .from('agent_decisions')
          .select('agent_name, decision_type, created_at, reasoning')
          .eq('outcome_success', false)
          .gte('created_at', cutoff7d.toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Calculate metrics
      const decisions = allDecisions || [];
      const decidedDecisions = decisions.filter((d) => d.outcome_success !== null);
      const successfulDecisions = decidedDecisions.filter((d) => d.outcome_success === true);

      const successRate = decidedDecisions.length > 0
        ? (successfulDecisions.length / decidedDecisions.length) * 100
        : 0;

      const errorRate = decidedDecisions.length > 0
        ? ((decidedDecisions.length - successfulDecisions.length) / decidedDecisions.length) * 100
        : 0;

      const averageConfidence = decisions.length > 0
        ? decisions.reduce((sum, d) => sum + (d.confidence || 0), 0) / decisions.length
        : 0;

      // Get unique agents count
      const uniqueAgents = new Set(decisions.map((d) => d.agent_name)).size;

      // Find top performing agent
      const agentPerformance = new Map<string, { success: number; total: number }>();
      decidedDecisions.forEach((d) => {
        if (!agentPerformance.has(d.agent_name)) {
          agentPerformance.set(d.agent_name, { success: 0, total: 0 });
        }
        const stats = agentPerformance.get(d.agent_name)!;
        stats.total += 1;
        if (d.outcome_success) {
          stats.success += 1;
        }
      });

      let topAgent: string | null = null;
      let topSuccessRate = 0;
      agentPerformance.forEach((stats, agentName) => {
        const rate = stats.success / stats.total;
        if (rate > topSuccessRate && stats.total >= 5) {
          topSuccessRate = rate;
          topAgent = agentName;
        }
      });

      return {
        totalDecisions24h: count24h || 0,
        totalDecisions7d: count7d || 0,
        totalDecisions30d: count30d || 0,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        activeAgents: uniqueAgents,
        topPerformingAgent: topAgent,
        recentErrors: (recentErrorsData || []).map((e) => ({
          agentName: e.agent_name,
          decisionType: e.decision_type,
          timestamp: e.created_at,
          error: e.reasoning || 'Unknown error',
        })),
      };
    } catch (error) {
      logger.error('Error getting overview metrics', error, {
        service: 'AgentAnalytics',
      });
      return {
        totalDecisions24h: 0,
        totalDecisions7d: 0,
        totalDecisions30d: 0,
        averageConfidence: 0,
        successRate: 0,
        errorRate: 0,
        activeAgents: 0,
        topPerformingAgent: null,
        recentErrors: [],
      };
    }
  }

  // Helper methods

  private static getTimeRangeCutoff(timeRange: '24h' | '7d' | '30d'): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private static calculateAccuracyTrend(decisions: any[]): number[] {
    const days = 7;
    const trend: number[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayDecisions = decisions.filter((d) => {
        const date = new Date(d.created_at);
        return date >= dayStart && date < dayEnd && d.outcome_success !== null;
      });

      if (dayDecisions.length === 0) {
        trend.push(0);
      } else {
        const successful = dayDecisions.filter((d) => d.outcome_success === true).length;
        const accuracy = (successful / dayDecisions.length) * 100;
        trend.push(Math.round(accuracy * 100) / 100);
      }
    }

    return trend;
  }

  private static groupByDay<T extends { created_at: string }>(
    items: T[],
    aggregator: (items: T[]) => number
  ): Array<{ date: string; [key: string]: any }> {
    const dayMap = new Map<string, T[]>();

    items.forEach((item) => {
      const date = new Date(item.created_at);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(item);
    });

    return Array.from(dayMap.entries())
      .map(([date, dayItems]) => ({
        date,
        accuracy: aggregator(dayItems),
        updates: dayItems.length,
        confidence: aggregator(dayItems),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
