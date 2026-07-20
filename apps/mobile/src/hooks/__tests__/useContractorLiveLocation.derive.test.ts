import {
  derive,
  deriveStage,
  withLateStage,
  TRAVELING_FRESH_MS,
  NEARBY_ETA_MINUTES,
  ARRIVING_ETA_MINUTES,
  LATE_GRACE_MINUTES,
  type ContractorLiveRow,
} from '../useContractorLiveLocation';

const NOW = Date.parse('2026-07-18T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

function row(overrides: Partial<ContractorLiveRow> = {}): ContractorLiveRow {
  return {
    latitude: '51.90112160',
    longitude: '-2.06821370',
    heading: null,
    eta_minutes: 12,
    is_sharing_location: true,
    is_active: true,
    location_timestamp: iso(60_000), // 1 min ago
    updated_at: iso(60_000),
    context: 'traveling',
    ...overrides,
  };
}

describe('useContractorLiveLocation derive() — freshness gate', () => {
  it('returns the empty state for a null row', () => {
    expect(derive(null, NOW).isTraveling).toBe(false);
    expect(derive(null, NOW).position).toBeNull();
  });

  it('a fresh traveling fix is live: banner + map + eta', () => {
    const s = derive(row(), NOW);
    expect(s.isLive).toBe(true);
    expect(s.isTraveling).toBe(true);
    expect(s.eta).toBe(12);
    expect(s.position).toEqual({
      latitude: 51.9011216,
      longitude: -2.0682137,
      heading: null,
    });
  });

  it('a stale traveling fix is fully suppressed (the 30-day-old-row bug)', () => {
    // Mirrors the live row: sharing+active+traveling but the fix is ancient.
    const s = derive(
      row({
        eta_minutes: 120,
        location_timestamp: iso(30 * 24 * 60 * 60 * 1000),
        updated_at: iso(30 * 24 * 60 * 60 * 1000),
      }),
      NOW
    );
    expect(s.isLive).toBe(false);
    expect(s.isTraveling).toBe(false); // no "on the way" banner
    expect(s.position).toBeNull(); // no LIVE map pin / dashed line
    expect(s.eta).toBeNull(); // no frozen "~120 min"
    expect(s.lastFix).not.toBeNull(); // still exposed for "last seen" copy
  });

  it('is exactly bounded by TRAVELING_FRESH_MS', () => {
    const justFresh = derive(
      row({ location_timestamp: iso(TRAVELING_FRESH_MS) }),
      NOW
    );
    expect(justFresh.isTraveling).toBe(true);
    const justStale = derive(
      row({ location_timestamp: iso(TRAVELING_FRESH_MS + 1) }),
      NOW
    );
    expect(justStale.isTraveling).toBe(false);
  });

  it('an ARRIVED contractor stays visible regardless of fix age (audit-67)', () => {
    // On arrival the GPS watcher stops, so the timestamp legitimately freezes.
    const s = derive(
      row({
        context: 'on_job',
        location_timestamp: iso(6 * 60 * 60 * 1000), // 6h since arrival
        updated_at: iso(6 * 60 * 60 * 1000),
      }),
      NOW
    );
    expect(s.hasArrived).toBe(true);
    expect(s.isLive).toBe(true); // "Contractor arrived" card still renders
    expect(s.isTraveling).toBe(false); // but not "on the way"
    expect(s.position).not.toBeNull(); // marker stays on the site
  });

  it('treats all arrival aliases as arrived', () => {
    for (const context of ['on_job', 'arrived', 'on_site']) {
      expect(derive(row({ context }), NOW).hasArrived).toBe(true);
    }
  });

  it('sharing flags off means not live even when fresh', () => {
    expect(derive(row({ is_sharing_location: false }), NOW).isLive).toBe(false);
    expect(derive(row({ is_active: false }), NOW).isLive).toBe(false);
  });

  it('null coordinates yield no position', () => {
    expect(derive(row({ latitude: null }), NOW).position).toBeNull();
    expect(derive(row({ longitude: 'nan' }), NOW).position).toBeNull();
  });
});

describe('deriveStage() — journey thresholds', () => {
  it('an arrived contractor is always "arrived" regardless of ETA', () => {
    expect(deriveStage(true, false, null)).toBe('arrived');
    expect(deriveStage(true, false, 0)).toBe('arrived');
  });

  it('not traveling and not arrived is "idle"', () => {
    expect(deriveStage(false, false, null)).toBe('idle');
    expect(deriveStage(false, false, 12)).toBe('idle');
  });

  it('a far ETA (or unknown ETA) reads as "on_the_way"', () => {
    expect(deriveStage(false, true, 12)).toBe('on_the_way');
    expect(deriveStage(false, true, NEARBY_ETA_MINUTES + 1)).toBe('on_the_way');
    expect(deriveStage(false, true, null)).toBe('on_the_way'); // "Tracking…"
  });

  it('is "nearby" at/under the nearby threshold', () => {
    expect(deriveStage(false, true, NEARBY_ETA_MINUTES)).toBe('nearby');
    expect(deriveStage(false, true, ARRIVING_ETA_MINUTES + 1)).toBe('nearby');
  });

  it('is "arriving" at/under the arriving threshold', () => {
    expect(deriveStage(false, true, ARRIVING_ETA_MINUTES)).toBe('arriving');
    expect(deriveStage(false, true, 0)).toBe('arriving');
  });
});

describe('derive() — stage integration', () => {
  it('surfaces the journey stage from a fresh traveling fix', () => {
    expect(derive(row({ eta_minutes: 12 }), NOW).stage).toBe('on_the_way');
    expect(derive(row({ eta_minutes: 4 }), NOW).stage).toBe('nearby');
    expect(derive(row({ eta_minutes: 1 }), NOW).stage).toBe('arriving');
  });

  it('a stale fix collapses the stage back to idle', () => {
    const s = derive(
      row({
        eta_minutes: 2,
        location_timestamp: iso(TRAVELING_FRESH_MS + 1),
        updated_at: iso(TRAVELING_FRESH_MS + 1),
      }),
      NOW
    );
    expect(s.stage).toBe('idle'); // no banner, not "arriving"
  });

  it('an arrived contractor reports the arrived stage', () => {
    expect(derive(row({ context: 'on_job' }), NOW).stage).toBe('arrived');
  });

  it('the empty state is idle', () => {
    expect(derive(null, NOW).stage).toBe('idle');
  });
});

describe('withLateStage() — overdue overlay', () => {
  const graceMs = LATE_GRACE_MINUTES * 60 * 1000;

  it('flags an en-route trip overdue past the grace as late', () => {
    const scheduledStartMs = NOW - graceMs - 60_000; // 1 min past grace
    expect(withLateStage('on_the_way', { scheduledStartMs, now: NOW })).toBe(
      'late'
    );
    expect(withLateStage('nearby', { scheduledStartMs, now: NOW })).toBe(
      'late'
    );
  });

  it('stays en route while still within the grace window', () => {
    const scheduledStartMs = NOW - graceMs + 60_000; // 1 min before grace end
    expect(withLateStage('on_the_way', { scheduledStartMs, now: NOW })).toBe(
      'on_the_way'
    );
  });

  it('is bounded exactly by the grace (strictly greater than)', () => {
    const atBoundary = NOW - graceMs; // now === scheduled + grace, not yet late
    expect(
      withLateStage('nearby', { scheduledStartMs: atBoundary, now: NOW })
    ).toBe('nearby');
    const justPast = NOW - graceMs - 1;
    expect(
      withLateStage('nearby', { scheduledStartMs: justPast, now: NOW })
    ).toBe('late');
  });

  it('never overrides arriving / arrived / idle', () => {
    const scheduledStartMs = NOW - graceMs - 10 * 60_000; // very overdue
    for (const stage of ['arriving', 'arrived', 'idle'] as const) {
      expect(withLateStage(stage, { scheduledStartMs, now: NOW })).toBe(stage);
    }
  });

  it('is a no-op when the job has no scheduled start', () => {
    expect(
      withLateStage('on_the_way', { scheduledStartMs: null, now: NOW })
    ).toBe('on_the_way');
    expect(withLateStage('nearby', { scheduledStartMs: NaN, now: NOW })).toBe(
      'nearby'
    );
  });

  it('is not late before the appointment time', () => {
    const scheduledStartMs = NOW + 30 * 60_000; // 30 min in the future
    expect(withLateStage('on_the_way', { scheduledStartMs, now: NOW })).toBe(
      'on_the_way'
    );
  });
});
