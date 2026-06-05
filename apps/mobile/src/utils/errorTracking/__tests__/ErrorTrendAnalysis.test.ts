/**
 * Unit tests for ErrorTrendAnalysis
 *
 * Pure analysis math — no logger dependency in the unit. The only external
 * mocked is Date.now (spied) so time-window bucketing and recency math are
 * deterministic.
 */

import { ErrorTrendAnalysis } from '../ErrorTrendAnalysis';
import { ErrorPattern, ErrorOccurrence, ErrorMetrics } from '../ErrorTypes';
import { ErrorCategory, ErrorSeverity } from '../../errorTracking';

// Fixed "now" for all time-window math (deterministic).
const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

type ErrorTrendPeriod = '1h' | '6h' | '24h' | '7d' | '30d';

let analysis: ErrorTrendAnalysis;
let nowSpy: jest.SpyInstance;

beforeEach(() => {
  analysis = new ErrorTrendAnalysis();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  nowSpy.mockRestore();
  jest.restoreAllMocks();
});

// ---- Builders -------------------------------------------------------------

function makeOccurrence(
  overrides: Partial<ErrorOccurrence> = {}
): ErrorOccurrence {
  return {
    id: overrides.id ?? 'occ-1',
    timestamp: overrides.timestamp ?? NOW - HOUR,
    userId: overrides.userId,
    sessionId: overrides.sessionId ?? 'session-1',
    context: overrides.context ?? {},
    stackTrace: overrides.stackTrace ?? 'stack',
    environment: overrides.environment ?? {
      platform: 'ios',
      version: '1.0.0',
    },
    breadcrumbs: overrides.breadcrumbs ?? [],
  };
}

function makeMetrics(overrides: Partial<ErrorMetrics> = {}): ErrorMetrics {
  return {
    count: overrides.count ?? 1,
    uniqueUsers: overrides.uniqueUsers ?? new Set<string>(),
    firstSeen: overrides.firstSeen ?? NOW - 100 * HOUR,
    lastSeen: overrides.lastSeen ?? NOW,
    frequency: overrides.frequency ?? 0,
    trend: overrides.trend ?? 'stable',
    impactScore: overrides.impactScore ?? 0,
    resolution: overrides.resolution ?? 'pending',
  };
}

function makePattern(overrides: Partial<ErrorPattern> = {}): ErrorPattern {
  return {
    id: overrides.id ?? 'pat-1',
    signature: overrides.signature ?? 'sig-1',
    category: overrides.category ?? ErrorCategory.NETWORK,
    severity: overrides.severity ?? ErrorSeverity.ERROR,
    occurrences: overrides.occurrences ?? [],
    metrics: overrides.metrics ?? makeMetrics(),
    insights: overrides.insights ?? [],
    recommendations: overrides.recommendations ?? [],
    tags: overrides.tags ?? [],
  };
}

// ===========================================================================
// getRecencyScore
// ===========================================================================
describe('getRecencyScore', () => {
  it('returns 10 when lastSeen is exactly now (0 hours elapsed)', () => {
    expect(analysis.getRecencyScore(NOW)).toBe(10);
  });

  it('decreases linearly by hours since lastSeen', () => {
    expect(analysis.getRecencyScore(NOW - 3 * HOUR)).toBe(7);
  });

  it('clamps to 0 when older than 10 hours', () => {
    expect(analysis.getRecencyScore(NOW - 25 * HOUR)).toBe(0);
  });

  it('returns fractional score for partial hours', () => {
    expect(analysis.getRecencyScore(NOW - HOUR / 2)).toBe(9.5);
  });
});

// ===========================================================================
// calculateImpactScore
// ===========================================================================
describe('calculateImpactScore', () => {
  it('sums frequency + userImpact + severity + recency with rounding', () => {
    const pattern = makePattern({
      severity: ErrorSeverity.ERROR, // weight 30
      metrics: makeMetrics({
        frequency: 5, // min(30, 5*2) = 10
        uniqueUsers: new Set(['u1', 'u2', 'u3']), // min(20, 3*2) = 6
        lastSeen: NOW, // recency 10
      }),
    });
    // 10 + 6 + 30 + 10 = 56
    expect(analysis.calculateImpactScore(pattern)).toBe(56);
  });

  it('caps frequency score at 30', () => {
    const pattern = makePattern({
      severity: ErrorSeverity.DEBUG, // weight 1
      metrics: makeMetrics({
        frequency: 100, // min(30, 200) = 30
        uniqueUsers: new Set<string>(), // 0
        lastSeen: NOW, // 10
      }),
    });
    // 30 + 0 + 1 + 10 = 41
    expect(analysis.calculateImpactScore(pattern)).toBe(41);
  });

  it('caps user impact score at 20', () => {
    const users = new Set<string>();
    for (let i = 0; i < 50; i++) users.add(`u${i}`); // min(20, 100) = 20
    const pattern = makePattern({
      severity: ErrorSeverity.FATAL, // weight 40
      metrics: makeMetrics({
        frequency: 0,
        uniqueUsers: users,
        lastSeen: NOW, // 10
      }),
    });
    // 0 + 20 + 40 + 10 = 70
    expect(analysis.calculateImpactScore(pattern)).toBe(70);
  });

  it('uses severity weight for each known severity', () => {
    const base = {
      frequency: 0,
      uniqueUsers: new Set<string>(),
      lastSeen: NOW, // recency 10
    };
    const score = (sev: ErrorSeverity) =>
      analysis.calculateImpactScore(
        makePattern({ severity: sev, metrics: makeMetrics(base) })
      );
    expect(score(ErrorSeverity.FATAL)).toBe(50); // 40 + 10
    expect(score(ErrorSeverity.ERROR)).toBe(40); // 30 + 10
    expect(score(ErrorSeverity.WARNING)).toBe(25); // 15 + 10
    expect(score(ErrorSeverity.INFO)).toBe(15); // 5 + 10
    expect(score(ErrorSeverity.DEBUG)).toBe(11); // 1 + 10
  });

  it('falls back to severity weight 10 for an unknown severity', () => {
    const pattern = makePattern({
      // Force an unknown severity value to hit the `|| 10` fallback.
      severity: 'unknown' as unknown as ErrorSeverity,
      metrics: makeMetrics({
        frequency: 0,
        uniqueUsers: new Set<string>(),
        lastSeen: NOW, // recency 10
      }),
    });
    // 0 + 0 + 10 + 10 = 20
    expect(analysis.calculateImpactScore(pattern)).toBe(20);
  });

  it('rounds the final sum', () => {
    const pattern = makePattern({
      severity: ErrorSeverity.INFO, // 5
      metrics: makeMetrics({
        frequency: 0,
        uniqueUsers: new Set<string>(),
        lastSeen: NOW - HOUR / 4, // recency = 10 - 0.25 = 9.75
      }),
    });
    // 0 + 0 + 5 + 9.75 = 14.75 -> round -> 15
    expect(analysis.calculateImpactScore(pattern)).toBe(15);
  });
});

// ===========================================================================
// calculateTrend
// ===========================================================================
describe('calculateTrend', () => {
  it('returns "stable" when fewer than 5 occurrences', () => {
    const pattern = makePattern({
      occurrences: [
        makeOccurrence({ id: 'a' }),
        makeOccurrence({ id: 'b' }),
        makeOccurrence({ id: 'c' }),
        makeOccurrence({ id: 'd' }),
      ],
    });
    expect(analysis.calculateTrend(pattern)).toBe('stable');
  });

  it('returns "stable" when there is no older window (exactly 5 occurrences)', () => {
    // recent = last 5, older = slice(-10,-5) = [] -> stable
    const occurrences = Array.from({ length: 5 }, (_, i) =>
      makeOccurrence({ id: `o${i}` })
    );
    const pattern = makePattern({ occurrences });
    expect(analysis.calculateTrend(pattern)).toBe('stable');
  });

  it('returns "increasing" when recent rate exceeds older rate by >20%', () => {
    // 8 occurrences -> older=slice(-10,-5)=3 items, recent=slice(-5)=5 items.
    // recentRate=1.0, olderRate=0.6 -> 1.0 > 0.72 -> increasing.
    const occurrences = Array.from({ length: 8 }, (_, i) =>
      makeOccurrence({ id: `o${i}` })
    );
    const pattern = makePattern({ occurrences });
    expect(analysis.calculateTrend(pattern)).toBe('increasing');
  });

  it('returns "stable" when recent and older rates are equal (10 occurrences)', () => {
    // recent=5, older=5 -> equal rates -> neither >1.2x nor <0.8x -> stable.
    const occurrences = Array.from({ length: 10 }, (_, i) =>
      makeOccurrence({ id: `o${i}` })
    );
    const pattern = makePattern({ occurrences });
    expect(analysis.calculateTrend(pattern)).toBe('stable');
  });

  it('stays "stable" for large sets where recent and older windows are both full', () => {
    // 12 occurrences -> recent=5, older=5 -> equal -> stable.
    const occurrences = Array.from({ length: 12 }, (_, i) =>
      makeOccurrence({ id: `o${i}` })
    );
    const pattern = makePattern({ occurrences });
    expect(analysis.calculateTrend(pattern)).toBe('stable');
  });
});

// ===========================================================================
// generateErrorTrends
// ===========================================================================
describe('generateErrorTrends', () => {
  it('defaults to 24h period producing 24 hourly buckets, all-zero summary', () => {
    const result = analysis.generateErrorTrends([], new Map());
    expect(result.period).toBe('24h');
    expect(result.data).toHaveLength(24);
    expect(result.summary.totalErrors).toBe(0);
    expect(result.summary.uniqueUsers).toBe(0);
    expect(result.summary.errorRate).toBe(0); // uniqueUsers === 0 guard
    expect(result.summary.criticalErrors).toBe(0);
    expect(result.summary.newErrors).toBe(0);
    expect(result.summary.resolved).toBe(0);
  });

  it('initializes buckets with zeroed severity and category maps', () => {
    const result = analysis.generateErrorTrends([], new Map(), '1h');
    expect(result.data).toHaveLength(12); // 1h / 5min = 12 buckets
    const first = result.data[0]!;
    expect(first.count).toBe(0);
    expect(first.uniqueUsers).toBe(0);
    expect(first.severity[ErrorSeverity.FATAL]).toBe(0);
    expect(first.severity[ErrorSeverity.ERROR]).toBe(0);
    expect(first.severity[ErrorSeverity.WARNING]).toBe(0);
    expect(first.severity[ErrorSeverity.INFO]).toBe(0);
    expect(first.severity[ErrorSeverity.DEBUG]).toBe(0);
    for (const cat of Object.values(ErrorCategory)) {
      expect(first.category[cat]).toBe(0);
    }
    expect(first.timestamp).toBe(NOW - 60 * 60 * 1000);
  });

  it('filters out occurrences older than the period window', () => {
    const occurrences = [
      makeOccurrence({ id: 'old', timestamp: NOW - 100 * HOUR }),
    ];
    const result = analysis.generateErrorTrends(
      occurrences,
      new Map<string, ErrorPattern>(),
      '24h'
    );
    expect(result.summary.totalErrors).toBe(0);
  });

  it('aggregates a matched occurrence into count, severity, category and critical', () => {
    const occ = makeOccurrence({
      id: 'occ-A',
      userId: 'user-1',
      timestamp: NOW - HOUR,
    });
    const pattern = makePattern({
      signature: 'sig-A',
      severity: ErrorSeverity.FATAL, // critical
      category: ErrorCategory.PAYMENT,
      occurrences: [occ],
      metrics: makeMetrics({
        firstSeen: NOW - 200 * HOUR, // NOT new
        resolution: 'pending',
      }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');

    expect(result.summary.totalErrors).toBe(1);
    expect(result.summary.uniqueUsers).toBe(1);
    expect(result.summary.errorRate).toBe(1);
    expect(result.summary.criticalErrors).toBe(1);
    expect(result.summary.newErrors).toBe(0);

    const bucketWithError = result.data.find((b) => b.count === 1)!;
    expect(bucketWithError).toBeDefined();
    expect(bucketWithError.severity[ErrorSeverity.FATAL]).toBe(1);
    expect(bucketWithError.category[ErrorCategory.PAYMENT]).toBe(1);
    expect(bucketWithError.uniqueUsers).toBe(1);
  });

  it('counts ERROR severity as critical and tracks new errors via firstSeen', () => {
    const occ = makeOccurrence({
      id: 'occ-B',
      userId: 'user-2',
      timestamp: NOW - 2 * HOUR,
    });
    const pattern = makePattern({
      signature: 'sig-B',
      severity: ErrorSeverity.ERROR, // critical
      category: ErrorCategory.NETWORK,
      occurrences: [occ],
      metrics: makeMetrics({
        firstSeen: NOW - HOUR, // within window -> new error
      }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');
    expect(result.summary.criticalErrors).toBe(1);
    expect(result.summary.newErrors).toBe(1);
  });

  it('does not count non-critical severities (WARNING) as critical', () => {
    const occ = makeOccurrence({
      id: 'occ-W',
      userId: 'user-3',
      timestamp: NOW - 3 * HOUR,
    });
    const pattern = makePattern({
      signature: 'sig-W',
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.UI_RENDERING,
      occurrences: [occ],
      metrics: makeMetrics({ firstSeen: NOW - 200 * HOUR }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');
    expect(result.summary.totalErrors).toBe(1);
    expect(result.summary.criticalErrors).toBe(0);
  });

  it('counts an in-window occurrence with NO matching pattern (count++ only)', () => {
    const occ = makeOccurrence({
      id: 'orphan',
      userId: 'user-x',
      timestamp: NOW - HOUR,
    });
    const pattern = makePattern({
      signature: 'sig-other',
      occurrences: [makeOccurrence({ id: 'different-id' })],
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');
    expect(result.summary.totalErrors).toBe(1);
    expect(result.summary.criticalErrors).toBe(0);
    expect(result.summary.newErrors).toBe(0);
    const bucket = result.data.find((b) => b.count === 1)!;
    expect(bucket.severity[ErrorSeverity.ERROR]).toBe(0);
  });

  it('handles an occurrence without a userId (uniqueUsers stays 0)', () => {
    const occ = makeOccurrence({
      id: 'no-user',
      userId: undefined,
      timestamp: NOW - HOUR,
    });
    const pattern = makePattern({
      severity: ErrorSeverity.INFO,
      occurrences: [occ],
      metrics: makeMetrics({ firstSeen: NOW - 200 * HOUR }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');
    expect(result.summary.totalErrors).toBe(1);
    expect(result.summary.uniqueUsers).toBe(0);
    expect(result.summary.errorRate).toBe(0); // div-by-zero guard
  });

  it('computes errorRate as totalErrors / uniqueUsers for multiple users', () => {
    const occs = [
      makeOccurrence({ id: 'e1', userId: 'u1', timestamp: NOW - HOUR }),
      makeOccurrence({ id: 'e2', userId: 'u1', timestamp: NOW - HOUR }),
      makeOccurrence({ id: 'e3', userId: 'u2', timestamp: NOW - 2 * HOUR }),
    ];
    const pattern = makePattern({
      severity: ErrorSeverity.INFO,
      occurrences: occs,
      metrics: makeMetrics({ firstSeen: NOW - 200 * HOUR }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends(occs, patterns, '24h');
    expect(result.summary.totalErrors).toBe(3);
    expect(result.summary.uniqueUsers).toBe(2);
    expect(result.summary.errorRate).toBe(1.5);
  });

  it('counts resolved patterns regardless of occurrences', () => {
    const resolved = makePattern({
      id: 'p-resolved',
      occurrences: [],
      metrics: makeMetrics({ resolution: 'resolved' }),
    });
    const pending = makePattern({
      id: 'p-pending',
      occurrences: [],
      metrics: makeMetrics({ resolution: 'pending' }),
    });
    const patterns = new Map([
      [resolved.id, resolved],
      [pending.id, pending],
    ]);

    const result = analysis.generateErrorTrends([], patterns, '24h');
    expect(result.summary.resolved).toBe(1);
  });

  it('ignores occurrences whose bucketIndex falls out of range', () => {
    // timestamp === now passes the `> now - periodMs` filter, but
    // bucketIndex = floor(periodMs / bucketSize) === buckets (out of range).
    const occ = makeOccurrence({
      id: 'edge',
      userId: 'u-edge',
      timestamp: NOW,
    });
    const pattern = makePattern({
      occurrences: [occ],
      metrics: makeMetrics({ firstSeen: NOW - 200 * HOUR }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends([occ], patterns, '24h');
    expect(result.summary.totalErrors).toBe(0);
  });

  it('computes per-bucket uniqueUsers de-duplicating within a bucket', () => {
    const t = NOW - HOUR - HOUR / 2; // mid an earlier hourly bucket
    const occs = [
      makeOccurrence({ id: 'b1', userId: 'same', timestamp: t }),
      makeOccurrence({ id: 'b2', userId: 'same', timestamp: t + 60 * 1000 }),
    ];
    const pattern = makePattern({
      occurrences: occs,
      metrics: makeMetrics({ firstSeen: NOW - 200 * HOUR }),
    });
    const patterns = new Map([[pattern.id, pattern]]);

    const result = analysis.generateErrorTrends(occs, patterns, '24h');
    const bucket = result.data.find((b) => b.count === 2)!;
    expect(bucket).toBeDefined();
    expect(bucket.uniqueUsers).toBe(1);
  });

  it('falls back to 24h defaults for an unrecognized period (default switch branches)', () => {
    // Passing an invalid period exercises the `default:` arms of both
    // getPeriodInMs (24h) and getBucketSize (1h), yielding 24 hourly buckets.
    const result = analysis.generateErrorTrends(
      [],
      new Map(),
      'bogus' as unknown as ErrorTrendPeriod
    );
    expect(result.data).toHaveLength(24);
    expect(result.period).toBe('bogus');
  });

  it('produces correct bucket counts for each supported period', () => {
    const cases: Array<[ErrorTrendPeriod, number]> = [
      ['1h', 12], // 1h / 5min
      ['6h', 12], // 6h / 30min
      ['24h', 24], // 24h / 1h
      ['7d', 28], // 7d / 6h
      ['30d', 30], // 30d / 24h
    ];
    for (const [period, expected] of cases) {
      const result = analysis.generateErrorTrends([], new Map(), period);
      expect(result.data).toHaveLength(expected);
      expect(result.period).toBe(period);
    }
  });
});
