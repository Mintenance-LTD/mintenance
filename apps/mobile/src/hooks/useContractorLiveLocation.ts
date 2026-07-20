/**
 * useContractorLiveLocation — single source of truth for a job's live
 * contractor GPS position (2026-06-16).
 *
 * The fetch + Supabase Realtime subscription used to live inside
 * `HomeownerLocationRequest`, which only read the ETA fields. The homeowner
 * "on the way" banner and the live map both need the same stream, so the
 * logic is lifted here and extended to include latitude/longitude/heading.
 * JobDetailsScreen calls this once and feeds the banner, the ETA card and
 * the map — one subscription instead of three.
 *
 * RLS (`contractor_locations_select`) scopes the row to the contractor or
 * the homeowner of an assigned/in_progress job, so for the wrong viewer the
 * query returns nothing and we stay in the empty state.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Three platform-specific aliases all mean "contractor is at the site":
// mobile JobContextLocationService writes 'on_job'; the web location route
// accepts 'arrived' / 'on_site'.
const ARRIVED_CONTEXTS = new Set(['on_job', 'arrived', 'on_site']);

const SELECT =
  'latitude, longitude, heading, eta_minutes, is_sharing_location, is_active, location_timestamp, updated_at, context';

export interface ContractorLiveRow {
  latitude: number | string | null;
  longitude: number | string | null;
  heading: number | string | null;
  eta_minutes: number | null;
  is_sharing_location: boolean | null;
  is_active: boolean | null;
  location_timestamp: string | null;
  updated_at: string | null;
  context: string | null;
}

export interface ContractorPosition {
  latitude: number;
  longitude: number;
  heading: number | null;
}

/**
 * Travel journey stage, derived from the arrival flag + ETA. Drives the
 * "on the way" homeowner surfaces (banner copy/colour, map live badge) so a
 * single enum decides how far along the trip is instead of every consumer
 * re-deriving thresholds from the raw ETA.
 *
 *   idle       — not sharing / not en route (nothing to show)
 *   on_the_way — en route, ETA above the "nearby" threshold
 *   nearby     — ETA <= NEARBY_ETA_MINUTES ("almost there, open up")
 *   arriving   — ETA <= ARRIVING_ETA_MINUTES ("pulling up outside")
 *   arrived    — context is an arrival alias (on site)
 *   late       — en route but overdue vs the agreed appointment time
 *
 * `derive()` produces every stage EXCEPT 'late', because 'late' needs the
 * job's scheduled start time, which is not on the live GPS row. The screen
 * that has the job applies `withLateStage()` (below) as a final override.
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

export interface ContractorLiveState {
  /** sharing && active — the contractor is broadcasting for this job. */
  isLive: boolean;
  /** context is one of the arrival aliases. */
  hasArrived: boolean;
  /** isLive && !hasArrived — en route. */
  isTraveling: boolean;
  /** Journey stage for the homeowner surfaces (see TravelStage). */
  stage: TravelStage;
  eta: number | null;
  lastFix: string | null;
  /** Coerced, finite coordinates for the map (null until a valid fix). */
  position: ContractorPosition | null;
}

const EMPTY: ContractorLiveState = {
  isLive: false,
  hasArrived: false,
  isTraveling: false,
  stage: 'idle',
  eta: null,
  lastFix: null,
  position: null,
};

/**
 * Map the trip's arrival flag + trustable ETA onto a TravelStage. Pure so the
 * derive() test can assert every threshold. `eta` is already freshness-gated
 * by the caller (a stale ETA arrives here as null → stays 'on_the_way').
 */
export function deriveStage(
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
 * Minutes past the agreed appointment start before a still-en-route trip
 * reads as "late" — a small grace so a contractor a minute or two behind
 * isn't flagged.
 */
export const LATE_GRACE_MINUTES = 5;

/**
 * Overlay a 'late' stage onto the GPS-derived stage using the job's promised
 * start time (which `derive()` can't see). Pure so JobDetailsScreen can apply
 * it and the threshold stays testable.
 *
 * Only an en-route trip that hasn't reached "arriving" can be late: once the
 * contractor is pulling up ('arriving') or on site ('arrived'), or was never
 * moving ('idle'), the promised time is moot. `now` is injectable for tests.
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
  const overdue = now > scheduledStartMs + graceMinutes * 60_000;
  return overdue ? 'late' : stage;
}

export interface TravelPresentation {
  /** Headline, e.g. "Your contractor is on the way". */
  title: string;
  /** Supporting line folding in the live ETA + distance. */
  subtitle: string;
  /** Colour family the surface should adopt (accent, not the app accent). */
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
 * Copy + tone for the fused live-tracking hero, keyed off the journey stage.
 * Single source of truth so the map header (and any future surface) render
 * identical wording/colour for a given stage.
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

/**
 * How recent a "traveling" GPS fix must be to count as live. Contractors
 * write positions every few seconds while driving, so a fix older than this
 * means the trip ended uncleanly (app killed, crash, sustained signal loss)
 * and the row is stale. Without this gate a one-off trip that never reached
 * a clean stop rendered "on the way ~N min" + a "LIVE" map pin forever — a
 * June-18 test row was still showing 30 days later (2026-07-18 audit).
 *
 * ARRIVED rows are deliberately exempt: on arrival the GPS watcher is
 * stopped and the row is kept alive so the homeowner keeps seeing "Arrived"
 * (JobContextLocationService audit-67), so its timestamp legitimately stops
 * advancing while the contractor works on site.
 */
export const TRAVELING_FRESH_MS = 10 * 60 * 1000; // 10 minutes

// Postgres NUMERIC columns are serialised by supabase-js as strings; coerce
// before handing coordinates to react-native-maps (which crashes on NaN).
// Guard null/undefined explicitly: Number(null) === 0, which would otherwise
// turn a null latitude into a valid-looking (0, lng) pin in the Atlantic.
function toFinite(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

// `now` is injectable for deterministic tests.
export function derive(
  row: ContractorLiveRow | null,
  now: number = Date.now()
): ContractorLiveState {
  if (!row) return EMPTY;
  const hasArrived = row.context != null && ARRIVED_CONTEXTS.has(row.context);
  const lastFix = row.location_timestamp ?? row.updated_at ?? null;

  // Freshness gates the en-route surfaces only (see docblock). An arrived
  // contractor is trusted regardless of fix age; a traveling one must have a
  // recent fix.
  const fixMs = lastFix ? Date.parse(lastFix) : NaN;
  const isFresh = Number.isFinite(fixMs) && now - fixMs <= TRAVELING_FRESH_MS;
  const trustable = hasArrived || isFresh;

  // Raw sharing flags, then downgraded by freshness so every consumer that
  // reads `isLive` (e.g. HomeownerLocationRequest's "Sharing live location"
  // card) drops a stale session automatically.
  const isLive = !!row.is_sharing_location && !!row.is_active && trustable;

  const lat = toFinite(row.latitude);
  const lng = toFinite(row.longitude);
  // Drop a stale en-route position so the map never renders a frozen "LIVE"
  // pin + dashed line; keep an arrived contractor's marker on the site.
  const position =
    lat != null && lng != null && trustable
      ? { latitude: lat, longitude: lng, heading: toFinite(row.heading) }
      : null;

  const isTraveling = isLive && !hasArrived;
  // A stale ETA is meaningless — only surface it while trustable.
  const eta = trustable ? (row.eta_minutes ?? null) : null;

  return {
    isLive,
    hasArrived,
    isTraveling,
    stage: deriveStage(hasArrived, isTraveling, eta),
    eta,
    lastFix,
    position,
  };
}

export function useContractorLiveLocation(
  jobId: string | undefined,
  options?: { enabled?: boolean }
): ContractorLiveState {
  const enabled = options?.enabled ?? true;
  const [row, setRow] = useState<ContractorLiveRow | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!jobId || !enabled) {
      setRow(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('contractor_locations')
          .select(SELECT)
          .eq('job_id', jobId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          logger.warn('contractor_locations initial read failed', {
            jobId,
            error: error.message,
          });
          return;
        }
        if (data) setRow(data as ContractorLiveRow);
      } catch (err) {
        logger.warn('contractor_locations read threw', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    const channel = supabase
      .channel(`contractor_locations:job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contractor_locations',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const next = (payload.new ?? payload.old) as
            | Partial<ContractorLiveRow>
            | null
            | undefined;
          if (!next) return;
          setRow({
            latitude: next.latitude ?? null,
            longitude: next.longitude ?? null,
            heading: next.heading ?? null,
            eta_minutes: next.eta_minutes ?? null,
            is_sharing_location: next.is_sharing_location ?? null,
            is_active: next.is_active ?? null,
            location_timestamp: next.location_timestamp ?? null,
            updated_at: next.updated_at ?? null,
            context: next.context ?? null,
          });
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {
          /* removal best-effort */
        }
        channelRef.current = null;
      }
    };
  }, [jobId, enabled]);

  return derive(row);
}
