/**
 * Contractor travel ("on the way") stage machine.
 *
 * Canonical, platform-agnostic logic for the homeowner's live-tracking
 * surfaces. Extracted to @mintenance/shared on 2026-07-20 so mobile
 * (JobDetailsScreen / JobLocationMap) and web (ContractorTravelTracking)
 * derive the stage, thresholds and copy from ONE implementation and can
 * never drift — the same reason `calculateDiscoverMatchScore` was
 * consolidated.
 *
 * Pure: no React, no React Native, no Supabase. `now` is injectable so every
 * threshold is unit-testable.
 */

/**
 * Journey stage for a contractor travelling to a job.
 *
 *   idle       — not sharing / not en route (nothing to show)
 *   on_the_way — en route, ETA above the "nearby" threshold
 *   nearby     — ETA <= NEARBY_ETA_MINUTES ("almost there, open up")
 *   arriving   — ETA <= ARRIVING_ETA_MINUTES ("pulling up outside")
 *   arrived    — contractor is on site
 *   late       — en route but overdue vs the agreed appointment time
 */
export type TravelStage =
  | 'idle'
  | 'on_the_way'
  | 'nearby'
  | 'arriving'
  | 'arrived'
  | 'late';

/** ETA (minutes) at/under which the trip reads as "almost there". */
export const NEARBY_ETA_MINUTES = 5;
/** ETA (minutes) at/under which the trip reads as "arriving now". */
export const ARRIVING_ETA_MINUTES = 1;
/**
 * Minutes past the agreed appointment start before a still-en-route trip
 * reads as "late" — a small grace so a contractor a minute or two behind
 * isn't flagged.
 */
export const LATE_GRACE_MINUTES = 5;

/**
 * How recent a "traveling" GPS fix must be to count as live. Contractors
 * write positions every few seconds while driving, so a fix older than this
 * means the trip ended uncleanly (app killed, crash, sustained signal loss)
 * and the row is stale. Without this gate a one-off trip that never reached
 * a clean stop renders "on the way ~N min" + a LIVE pin forever — a
 * June-18 test row was still showing 30 days later (2026-07-18 audit).
 *
 * ARRIVED rows are deliberately exempt: on arrival the GPS watcher stops and
 * the row is kept alive so the homeowner keeps seeing "Arrived", so its
 * timestamp legitimately stops advancing while work happens on site.
 */
export const TRAVELING_FRESH_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Three platform-specific aliases all mean "contractor is at the site":
 * mobile's JobContextLocationService writes 'on_job'; the web location route
 * accepts 'arrived' / 'on_site'.
 */
const ARRIVED_CONTEXTS = new Set(['on_job', 'arrived', 'on_site']);

/** Does this `contractor_locations.context` mean "on site"? */
export function isArrivedContext(context: string | null | undefined): boolean {
  return context != null && ARRIVED_CONTEXTS.has(context);
}

/**
 * Short badge label for the live pill on a tracking surface. Colour stays
 * platform-side (each app maps `tone` to its own tokens); only the wording
 * is shared so the two never disagree.
 */
export function travelBadgeLabel(stage: TravelStage): string {
  switch (stage) {
    case 'nearby':
      return 'Nearby';
    case 'arriving':
      return 'Arriving';
    case 'arrived':
      return 'On site';
    case 'late':
      return 'Delayed';
    case 'on_the_way':
    case 'idle':
    default:
      return 'Live';
  }
}

/**
 * Is a GPS fix recent enough to trust for en-route surfaces?
 * `hasArrived` rows bypass the gate (see TRAVELING_FRESH_MS).
 */
export function isFixTrustable(
  lastFixIso: string | null | undefined,
  hasArrived: boolean,
  now: number = Date.now()
): boolean {
  if (hasArrived) return true;
  if (!lastFixIso) return false;
  const fixMs = Date.parse(lastFixIso);
  return Number.isFinite(fixMs) && now - fixMs <= TRAVELING_FRESH_MS;
}

/**
 * Map the trip's arrival flag + trustable ETA onto a TravelStage.
 * `eta` must already be freshness-gated by the caller (a stale ETA arrives
 * here as null → stays 'on_the_way').
 */
export function deriveTravelStage(
  hasArrived: boolean,
  isTraveling: boolean,
  eta: number | null
): TravelStage {
  if (hasArrived) return 'arrived';
  if (!isTraveling) return 'idle';
  if (eta != null && eta <= ARRIVING_ETA_MINUTES) return 'arriving';
  if (eta != null && eta <= NEARBY_ETA_MINUTES) return 'nearby';
  return 'on_the_way';
}

/**
 * Overlay a 'late' stage using the job's promised start time (which the live
 * GPS row can't know).
 *
 * Only an en-route trip that hasn't reached "arriving" can be late: once the
 * contractor is pulling up ('arriving') or on site ('arrived'), or was never
 * moving ('idle'), the promised time is moot.
 */
export function withLateStage(
  stage: TravelStage,
  opts: {
    scheduledStartMs: number | null;
    now?: number;
    graceMinutes?: number;
  }
): TravelStage {
  if (stage !== 'on_the_way' && stage !== 'nearby') return stage;
  const {
    scheduledStartMs,
    now = Date.now(),
    graceMinutes = LATE_GRACE_MINUTES,
  } = opts;
  if (scheduledStartMs == null || !Number.isFinite(scheduledStartMs)) {
    return stage;
  }
  return now > scheduledStartMs + graceMinutes * 60_000 ? 'late' : stage;
}

export interface TravelPresentation {
  /** Headline, e.g. "Your contractor is on the way". */
  title: string;
  /** Supporting line folding in the live ETA + distance. */
  subtitle: string;
  /** Colour family the surface should adopt (semantic, not brand accent). */
  tone: 'brand' | 'ok' | 'warn';
}

function formatEta(eta: number | null): string {
  if (eta == null) return 'Tracking…';
  if (eta <= 0) return 'Arriving now';
  return `~${eta} min`;
}

function formatDistance(distanceMiles?: number | null): string {
  if (distanceMiles == null || !Number.isFinite(distanceMiles)) return '';
  // Under a tenth of a mile "0.0 mi" reads as broken — say "moments away".
  if (distanceMiles < 0.1) return ' · moments away';
  return ` · ${distanceMiles.toFixed(1)} mi`;
}

/**
 * Copy + tone for a live-tracking surface, keyed off the journey stage.
 * Single source of truth so web and mobile render identical wording and
 * colour for a given stage.
 */
export function travelPresentation(
  stage: TravelStage,
  opts: { eta: number | null; distanceMiles?: number | null }
): TravelPresentation {
  const { eta, distanceMiles } = opts;
  switch (stage) {
    case 'arriving':
      return {
        title: 'Your contractor is arriving',
        subtitle: 'Pulling up outside now',
        tone: 'ok',
      };
    case 'arrived':
      return {
        title: 'Your contractor has arrived',
        subtitle: 'On site now',
        tone: 'ok',
      };
    case 'nearby':
      return {
        title: 'Your contractor is almost here',
        subtitle: `${formatEta(eta)} away · a good time to open up`,
        tone: 'brand',
      };
    case 'late':
      return {
        title: 'Running a little late',
        subtitle: `New ETA ${formatEta(eta)} · thanks for your patience`,
        tone: 'warn',
      };
    case 'on_the_way':
    case 'idle':
    default:
      return {
        title: 'Your contractor is on the way',
        subtitle: `${formatEta(eta)} away${formatDistance(distanceMiles)}`,
        tone: 'brand',
      };
  }
}
