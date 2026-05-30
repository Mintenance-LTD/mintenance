/**
 * Auto-start foreground live-location tracking for assigned contractors.
 *
 * The job-details location card still gives contractors explicit control,
 * but live production data showed `contractor_locations = 0`: relying on
 * contractors to open one section of one screen is too brittle. This hook
 * runs at the post-auth tab boundary, checks for an active **en_route
 * trip** (the canonical "I'm on my way" intent signal), and starts
 * foreground tracking only when foreground location permission is
 * already granted. It never prompts.
 *
 * 2026-05-26 audit-67 P1: previously this hook queried `jobs` directly
 * for any assigned/in_progress row with coordinates and started GPS
 * unconditionally. Live data shows 6 such jobs at any time, so opening
 * the app could begin sharing location for jobs scheduled days out — a
 * privacy regression compared to web (which only shares after the
 * contractor explicitly enables location sharing). The new gate is the
 * `contractor_trips` en_route row, which is only created when the
 * contractor taps "I'm on my way" from the job-detail UI. Without an
 * en_route trip, this hook does nothing; manual share via
 * ContractorLocationSection still works.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import {
  acquireJobTrackingService,
  releaseJobTrackingService,
} from '../services/JobContextLocationService';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';

const ACTIVE_JOB_STATUSES = ['assigned', 'in_progress'];

interface EnRouteTrip {
  id: string;
  status: string;
  job_id: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  job?: {
    id: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface TripsListResponse {
  trips?: EnRouteTrip[];
}

export function useAssignedJobLocationAutoStart(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  // 2026-05-26 audit-50 P1: references the shared (contractor, job)
  // singleton via acquire/release so the AppNavigator-level auto-start
  // and the job-detail ContractorLocationSection share one service +
  // one contractor_locations row instead of racing.
  const activeJobIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!userId || userRole !== 'contractor') {
      if (activeJobIdRef.current) {
        void releaseJobTrackingService(userId ?? '', activeJobIdRef.current);
        activeJobIdRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const ownerUserId = userId;

    const tryStart = async (trigger: 'mount' | 'foreground') => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;

        // 2026-05-26 audit-67 P1: gate on contractor intent. An
        // en_route `contractor_trips` row is created by POST
        // /api/contractor/trips when the contractor taps "I'm on my
        // way". The route's response embeds the job + destination,
        // and the trip itself carries destination_lat/destination_lng
        // independent of the joined job row. If no en_route trip
        // exists, the hook is a no-op.
        let tripsResp: TripsListResponse | null = null;
        try {
          tripsResp = await mobileApiClient.get<TripsListResponse>(
            '/api/contractor/trips?status=en_route'
          );
        } catch (apiErr) {
          logger.warn('auto-start: trips lookup failed', {
            error: apiErr instanceof Error ? apiErr.message : String(apiErr),
            trigger,
          });
          return;
        }

        const trip = (tripsResp?.trips ?? []).find((t) => {
          if (!t.job_id) return false;
          // Prefer trip-level destination; fall back to joined job
          // coords when the trip row is missing them (legacy rows).
          const lat = t.destination_lat ?? t.job?.latitude ?? null;
          const lng = t.destination_lng ?? t.job?.longitude ?? null;
          if (lat == null || lng == null) return false;
          if (t.job && !ACTIVE_JOB_STATUSES.includes(t.job.status)) {
            return false;
          }
          return true;
        });
        if (!trip || !trip.job_id) return;

        const latitude = trip.destination_lat ?? trip.job?.latitude ?? null;
        const longitude = trip.destination_lng ?? trip.job?.longitude ?? null;
        if (latitude == null || longitude == null) return;

        const jobId = trip.job_id;
        if (activeJobIdRef.current === jobId) return;

        // Release previous job before acquiring new one.
        if (activeJobIdRef.current) {
          await releaseJobTrackingService(ownerUserId, activeJobIdRef.current);
          activeJobIdRef.current = null;
        }

        const service = acquireJobTrackingService(ownerUserId, jobId);
        const status = service.getTrackingStatus();
        // Only start a fresh watch if no other consumer has already
        // started one for this (contractor, job) pair. If the
        // job-detail section beat us to it, the existing watcher's
        // updates still apply.
        if (!status.isTracking) {
          await service.startJobTracking(ownerUserId, jobId, null, {
            latitude,
            longitude,
          });
        }

        activeJobIdRef.current = jobId;
        logger.info('Assigned job location auto-started', {
          jobId,
          tripId: trip.id,
          trigger,
          reusedExistingWatcher: status.isTracking,
        });
      } catch (err) {
        logger.warn('assigned-job location auto-start failed', {
          error: err instanceof Error ? err.message : String(err),
          trigger,
        });
      } finally {
        inFlightRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      void tryStart('mount');
    }, 2000);

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void tryStart('foreground');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.remove();
      if (activeJobIdRef.current) {
        void releaseJobTrackingService(ownerUserId, activeJobIdRef.current);
        activeJobIdRef.current = null;
      }
    };
  }, [userId, userRole]);
}
