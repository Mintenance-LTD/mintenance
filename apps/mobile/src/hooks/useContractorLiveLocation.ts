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
import {
  deriveTravelStage,
  isArrivedContext,
  isFixTrustable,
  type TravelStage,
} from '@mintenance/shared';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// The travel stage machine (stages, thresholds, late overlay, copy/tone) is
// canonical in @mintenance/shared so web's ContractorTravelTracking derives
// the exact same states. Re-exported here under the names mobile already
// imports, so call sites and tests are unchanged.
export {
  deriveTravelStage as deriveStage,
  withLateStage,
  travelPresentation,
  isFixTrustable,
  isArrivedContext,
  travelBadgeLabel,
  NEARBY_ETA_MINUTES,
  ARRIVING_ETA_MINUTES,
  LATE_GRACE_MINUTES,
  TRAVELING_FRESH_MS,
} from '@mintenance/shared';
export type { TravelStage, TravelPresentation } from '@mintenance/shared';

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
  const hasArrived = isArrivedContext(row.context);
  const lastFix = row.location_timestamp ?? row.updated_at ?? null;

  // Freshness gates the en-route surfaces only. An arrived contractor is
  // trusted regardless of fix age; a traveling one must have a recent fix.
  // Shared with web via @mintenance/shared's isFixTrustable.
  const trustable = isFixTrustable(lastFix, hasArrived, now);

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
    stage: deriveTravelStage(hasArrived, isTraveling, eta),
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
