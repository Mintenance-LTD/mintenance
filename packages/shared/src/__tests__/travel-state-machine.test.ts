import { describe, it, expect } from 'vitest';
import {
  deriveTravelStage,
  withLateStage,
  travelPresentation,
  travelBadgeLabel,
  isArrivedContext,
  isFixTrustable,
  NEARBY_ETA_MINUTES,
  ARRIVING_ETA_MINUTES,
  LATE_GRACE_MINUTES,
  TRAVELING_FRESH_MS,
} from '../state-machines/travel-state-machine';

const NOW = Date.parse('2026-07-20T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isArrivedContext()', () => {
  it('treats all three platform aliases as arrived', () => {
    for (const c of ['on_job', 'arrived', 'on_site']) {
      expect(isArrivedContext(c)).toBe(true);
    }
  });

  it('is false for travelling / unknown / absent', () => {
    expect(isArrivedContext('traveling')).toBe(false);
    expect(isArrivedContext(null)).toBe(false);
    expect(isArrivedContext(undefined)).toBe(false);
  });
});

describe('isFixTrustable()', () => {
  it('trusts a recent fix and rejects a stale one', () => {
    expect(isFixTrustable(iso(60_000), false, NOW)).toBe(true);
    expect(isFixTrustable(iso(TRAVELING_FRESH_MS + 1), false, NOW)).toBe(false);
  });

  it('is bounded exactly by TRAVELING_FRESH_MS', () => {
    expect(isFixTrustable(iso(TRAVELING_FRESH_MS), false, NOW)).toBe(true);
  });

  it('exempts arrived rows regardless of age (the GPS watcher stops)', () => {
    expect(isFixTrustable(iso(30 * 24 * 60 * 60 * 1000), true, NOW)).toBe(true);
  });

  it('is false when there is no fix at all', () => {
    expect(isFixTrustable(null, false, NOW)).toBe(false);
  });
});

describe('deriveTravelStage()', () => {
  it('arrived wins over any ETA', () => {
    expect(deriveTravelStage(true, false, 30)).toBe('arrived');
  });

  it('not travelling and not arrived is idle', () => {
    expect(deriveTravelStage(false, false, 12)).toBe('idle');
  });

  it('walks on_the_way -> nearby -> arriving by ETA', () => {
    expect(deriveTravelStage(false, true, NEARBY_ETA_MINUTES + 1)).toBe(
      'on_the_way'
    );
    expect(deriveTravelStage(false, true, NEARBY_ETA_MINUTES)).toBe('nearby');
    expect(deriveTravelStage(false, true, ARRIVING_ETA_MINUTES)).toBe(
      'arriving'
    );
  });

  it('an unknown ETA stays on_the_way rather than guessing', () => {
    expect(deriveTravelStage(false, true, null)).toBe('on_the_way');
  });
});

describe('withLateStage()', () => {
  const graceMs = LATE_GRACE_MINUTES * 60_000;

  it('flags an overdue en-route trip as late', () => {
    const scheduledStartMs = NOW - graceMs - 60_000;
    expect(withLateStage('on_the_way', { scheduledStartMs, now: NOW })).toBe(
      'late'
    );
    expect(withLateStage('nearby', { scheduledStartMs, now: NOW })).toBe(
      'late'
    );
  });

  it('respects the grace window and never overrides arriving/arrived/idle', () => {
    expect(
      withLateStage('on_the_way', {
        scheduledStartMs: NOW - graceMs,
        now: NOW,
      })
    ).toBe('on_the_way');
    const veryOverdue = NOW - graceMs - 60 * 60_000;
    for (const s of ['arriving', 'arrived', 'idle'] as const) {
      expect(
        withLateStage(s, { scheduledStartMs: veryOverdue, now: NOW })
      ).toBe(s);
    }
  });

  it('is a no-op with no scheduled start', () => {
    expect(
      withLateStage('on_the_way', { scheduledStartMs: null, now: NOW })
    ).toBe('on_the_way');
  });
});

describe('travelPresentation()', () => {
  it('folds ETA + miles into on_the_way and picks the brand tone', () => {
    const p = travelPresentation('on_the_way', { eta: 12, distanceMiles: 3.2 });
    expect(p.title).toBe('Your contractor is on the way');
    expect(p.subtitle).toBe('~12 min away · 3.2 mi');
    expect(p.tone).toBe('brand');
  });

  it('avoids a broken-looking "0.0 mi"', () => {
    expect(
      travelPresentation('on_the_way', { eta: 1, distanceMiles: 0.04 }).subtitle
    ).toContain('moments away');
  });

  it('uses ok tone for arriving/arrived and warn for late', () => {
    expect(travelPresentation('arriving', { eta: 0 }).tone).toBe('ok');
    expect(travelPresentation('arrived', { eta: null }).tone).toBe('ok');
    expect(travelPresentation('late', { eta: 15 }).tone).toBe('warn');
  });
});

describe('travelBadgeLabel()', () => {
  it('gives each stage its own word', () => {
    expect(travelBadgeLabel('on_the_way')).toBe('Live');
    expect(travelBadgeLabel('nearby')).toBe('Nearby');
    expect(travelBadgeLabel('arriving')).toBe('Arriving');
    expect(travelBadgeLabel('arrived')).toBe('On site');
    expect(travelBadgeLabel('late')).toBe('Delayed');
  });
});
