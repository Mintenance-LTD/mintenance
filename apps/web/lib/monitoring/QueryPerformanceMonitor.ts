import { logger } from '@mintenance/shared';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  source: string;
  params?: Record<string, string | string[]>;
  error?: string;
  cacheHit?: boolean;
}

interface PerformanceThresholds {
  slow: number;        // Queries taking longer than this are logged as slow
  critical: number;    // Queries taking longer than this trigger alerts
  n1Detection: number; // Number of similar queries to detect N+1
}

/**
 * Query Performance Monitor
 * Tracks database query performance, detects N+1 queries, and provides analytics
 */
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;

  // Store recent queries for analysis
  private recentQueries: QueryMetrics[] = [];
  private readonly maxQueriesStored = 1000;

  // Performance thresholds (in milliseconds)
  private thresholds: PerformanceThresholds = {
    slow: 500,
    critical: 2000,
    n1Detection: 5,
  };

  // Statistics
  private stats = {
    totalQueries: 0,
    slowQueries: 0,
    criticalQueries: 0,
    errors: 0,
    cacheHits: 0,
    n1Detections: 0,
  };

  // N+1 query detection
  private queryPatterns = new Map<string, { count: number; lastSeen: number }>();
  private n1DetectionWindow = 5000; // 5 seconds

  private constructor() {
    // Initialize performance monitor
    this.setupPeriodicReporting();
  }

  public static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  /**
   * Record a query execution
   */
  public recordQuery(
    query: string,
    duration: number,
    source: string,
    params?: Record<string, string | string[]>,
    error?: string,
    cacheHit = false
  ): void {
    const metrics: QueryMetrics = {
      query: this.normalizeQuery(query),
      duration,
      timestamp: Date.now(),
      source,
      params,
      error,
      cacheHit,
    };

    // Update statistics
    this.stats.totalQueries++;
    if (cacheHit) {
      this.stats.cacheHits++;
    }
    if (error) {
      this.stats.errors++;
    }

    // Check for slow queries
    if (duration > this.thresholds.slow) {
      this.stats.slowQueries++;

      if (duration > this.thresholds.critical) {
        this.stats.criticalQueries++;
        this.handleCriticalQuery(metrics);
      } else {
        this.handleSlowQuery(metrics);
      }
    }

    // Check for N+1 queries
    this.detectN1Query(metrics);

    // Store query for analysis
    this.recentQueries.push(metrics);
    if (this.recentQueries.length > this.maxQueriesStored) {
      this.recentQueries.shift();
    }
  }

  /**
   * Wrap a Supabase query with performance monitoring
   */
  public async monitorQuery<T>(
    queryFn: () => Promise<T>,
    queryDescription: string,
    source: string
  ): Promise<T> {
    const startTime = performance.now();
    let error: string | undefined;
    let result: T;

    try {
      result = await queryFn();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      this.recordQuery(queryDescription, duration, source, undefined, error);
    }

    return result;
  }

  /**
   * Normalize query for pattern detection
   */
  private normalizeQuery(query: string): string {
    // Remove specific values to detect patterns
    return query
      .replace(/\b\d+\b/g, '?')                    // Replace numbers with ?
      .replace(/'[^']*'/g, '?')                    // Replace strings with ?
      .replace(/\s+/g, ' ')                         // Normalize whitespace
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)')      // Normalize IN clauses
      .trim();
  }

  /**
   * Detect N+1 query patterns
   */
  private detectN1Query(metrics: QueryMetrics): void {
    const pattern = metrics.query;
    const now = Date.now();

    // Clean old patterns
    this.queryPatterns.forEach((value, key) => {
      if (now - value.lastSeen > this.n1DetectionWindow) {
        this.queryPatterns.delete(key);
      }
    });

    // Check current pattern
    const existing = this.queryPatterns.get(pattern) || { count: 0, lastSeen: 0 };

    if (now - existing.lastSeen < this.n1DetectionWindow) {
      existing.count++;
      existing.lastSeen = now;

      if (existing.count >= this.thresholds.n1Detection) {
        this.stats.n1Detections++;
        this.handleN1Detection(pattern, existing.count, metrics.source);
        existing.count = 0; // Reset count after detection
      }
    } else {
      existing.count = 1;
      existing.lastSeen = now;
    }

    this.queryPatterns.set(pattern, existing);
  }

  /**
   * Handle slow query detection
   */
  private handleSlowQuery(metrics: QueryMetrics): void {
    logger.warn('Slow query detected', {
      duration: `${metrics.duration}ms`,
      query: metrics.query,
      source: metrics.source,
      params: metrics.params,
      service: 'QueryPerformanceMonitor',
    });
  }

  /**
   * Handle critical slow query
   */
  private handleCriticalQuery(metrics: QueryMetrics): void {
    logger.error('CRITICAL: Extremely slow query detected', {
      duration: `${metrics.duration}ms`,
      query: metrics.query,
      source: metrics.source,
      params: metrics.params,
      threshold: `${this.thresholds.critical}ms`,
      service: 'QueryPerformanceMonitor',
    });

    // In production, this would trigger an alert
    // sendAlert('critical-query', metrics);
  }

  /**
   * Handle N+1 query detection
   */
  private handleN1Detection(pattern: string, count: number, source: string): void {
    logger.error('N+1 Query Pattern Detected!', {
      pattern,
      count,
      source,
      window: `${this.n1DetectionWindow}ms`,
      recommendation: 'Consider using joins or batch queries',
      service: 'QueryPerformanceMonitor',
    });

    // In production, this would trigger an alert
    // sendAlert('n1-query', { pattern, count, source });
  }

  /**
   * Get performance statistics
   */
  public getStats() {
    const avgDuration = this.recentQueries.length > 0
      ? this.recentQueries.reduce((sum, q) => sum + q.duration, 0) / this.recentQueries.length
      : 0;

    const cacheHitRate = this.stats.totalQueries > 0
      ? (this.stats.cacheHits / this.stats.totalQueries) * 100
      : 0;

    const errorRate = this.stats.totalQueries > 0
      ? (this.stats.errors / this.stats.totalQueries) * 100
      : 0;

    return {
      ...this.stats,
      avgDuration: Math.round(avgDuration),
      cacheHitRate: Math.round(cacheHitRate),
      errorRate: Math.round(errorRate * 100) / 100,
      recentQueriesCount: this.recentQueries.length,
    };
  }

  /**
   * Get slow queries for analysis
   */
  public getSlowQueries(limit = 10): QueryMetrics[] {
    return [...this.recentQueries]
      .filter(q => q.duration > this.thresholds.slow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get queries by source
   */
  public getQueriesBySource(source: string): QueryMetrics[] {
    return this.recentQueries.filter(q => q.source === source);
  }

  /**
   * Clear all stored metrics
   */
  public clear(): void {
    this.recentQueries = [];
    this.queryPatterns.clear();
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      criticalQueries: 0,
      errors: 0,
      cacheHits: 0,
      n1Detections: 0,
    };
  }

  /**
   * Setup periodic reporting of statistics
   */
  private setupPeriodicReporting(): void {
    // Report stats every 5 minutes in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const stats = this.getStats();
        if (stats.totalQueries > 0) {
          logger.info('Query Performance Report', {
            ...stats,
            slowQueriesPercent: `${((stats.slowQueries / stats.totalQueries) * 100).toFixed(1)}%`,
            topSlowQueries: this.getSlowQueries(3).map(q => ({
              duration: `${q.duration}ms`,
              source: q.source,
            })),
            service: 'QueryPerformanceMonitor',
          });
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): {
    timestamp: number;
    stats: Record<string, unknown>;
    slowQueries: QueryMetrics[];
    patterns: Array<{ pattern: string; count: number }>;
  } {
    return {
      timestamp: Date.now(),
      stats: { ...this.stats },
      slowQueries: this.getSlowQueries(20),
      patterns: Array.from(this.queryPatterns.entries()).map(([pattern, data]) => ({
        pattern,
        count: data.count,
      })),
    };
  }
}

// Export singleton instance
export const queryMonitor = QueryPerformanceMonitor.getInstance();

/**
 * Supabase client wrapper with automatic performance monitoring
 */
export function createMonitoredSupabaseClient(supabase: Record<string, unknown>, source: string) {
  return new Proxy(supabase, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (prop === 'from') {
        return (table: string) => {
          const query = (target as Record<string, (...args: unknown[]) => unknown>).from(table) as Record<string, unknown>;
          return createMonitoredQuery(query, table, source);
        };
      }
      return target[prop as string];
    },
  });
}

/**
 * Create a monitored query object
 */
function createMonitoredQuery(query: Record<string, unknown>, table: string, source: string) {
  const queryParts: string[] = [`from('${table}')`];

  return new Proxy(query, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      const original = target[prop as string];

      if (typeof original === 'function') {
        return (...args: unknown[]) => {
          // Track query building
          if (typeof prop === 'string' && ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'range', 'overlaps', 'or', 'and', 'not', 'order', 'limit', 'single', 'maybeSingle'].includes(prop)) {
            queryParts.push(`${prop}(${JSON.stringify(args).slice(1, -1)})`);
          }

          const result = original.apply(target, args);

          // If this is a terminal operation, record the query
          if (prop === 'single' || prop === 'maybeSingle' || (prop === 'then' && args[0])) {
            const queryString = queryParts.join('.');
            const startTime = performance.now();

            if (prop === 'then') {
              // Wrap the promise
              const originalThen = args[0] as (data: unknown) => unknown;
              args[0] = (data: unknown) => {
                const duration = performance.now() - startTime;
                queryMonitor.recordQuery(queryString, duration, source);
                return originalThen(data);
              };
            }
          }

          return result;
        };
      }

      return original;
    },
  });
}