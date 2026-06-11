/**
 * useJobTravelTracking Hook
 *
 * React hook for managing job/meeting travel tracking.
 * Provides easy-to-use interface for contractors to start/stop tracking
 * and homeowners to view contractor location in real-time.
 *
 * @filesize Target: <200 lines
 * @compliance Single Responsibility - Travel tracking hook only
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import {
  JobContextLocationService,
  ContractorLocationContext,
  acquireJobTrackingService,
  releaseJobTrackingService,
} from '../services/JobContextLocationService';
import { MeetingService } from '../services/MeetingService';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { useContractorTravelRealtime } from './useContractorTravelRealtime';
import type {
  TravelLocation,
  UseJobTravelTrackingOptions,
  UseJobTravelTrackingReturn,
} from './useJobTravelTracking.types';

// Mirror of HomeownerLocationRequest's ARRIVED_CONTEXTS — the DB
// `context` values that mean the contractor is on site (markArrived
// writes 'on_job'). Used to restore the arrived state on remount.
const ARRIVED_CONTEXTS = new Set(['on_job', 'arrived', 'on_site']);

export function useJobTravelTracking({
  meetingId,
  jobId,
  destination,
  onLocationUpdate,
  onArrival,
  autoStartIfPermitted = false,
}: UseJobTravelTrackingOptions): UseJobTravelTrackingReturn {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  // Gates auto-start until the on-mount DB check for a prior arrival has
  // resolved — prevents a race where auto-start re-opens en-route
  // tracking before we learn the contractor already marked arrived.
  const [arrivedChecked, setArrivedChecked] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<TravelLocation | null>(
    null
  );
  const [eta, setEta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationServiceRef = useRef<JobContextLocationService | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  /**
   * Start tracking contractor travel
   */
  const startTracking = useCallback(
    async (opts: { createTrip?: boolean } = {}) => {
      if (!user || user.role !== 'contractor') {
        setError('Only contractors can start travel tracking');
        return;
      }

      try {
        setError(null);
        // A fresh start (manual tap or auto-start) means a new journey —
        // clear any prior arrived state for this job session.
        setHasArrived(false);
        setIsTracking(true);

        const handleLocationUpdate = (locationUpdate: {
          latitude: number;
          longitude: number;
          eta: number;
        }) => {
          const travelLocation: TravelLocation = {
            latitude: locationUpdate.latitude,
            longitude: locationUpdate.longitude,
            eta: locationUpdate.eta,
            timestamp: new Date().toISOString(),
          };

          setCurrentLocation(travelLocation);
          setEta(locationUpdate.eta);

          if (onLocationUpdate) {
            onLocationUpdate(travelLocation);
          }
        };

        let locationService: JobContextLocationService;
        if (meetingId) {
          // Meeting-based tracking: resolve the meeting destination server-side.
          locationService = await MeetingService.startTravelTracking(
            meetingId,
            user.id,
            handleLocationUpdate
          );
        } else if (jobId) {
          // Job-detail tracking: use the job's own destination coordinates.
          if (
            !Number.isFinite(destination.latitude) ||
            !Number.isFinite(destination.longitude)
          ) {
            throw new Error('Job location is not available for tracking');
          }

          // 2026-05-28 U4: web parity. An explicit "I'm on my way" tap
          // (opts.createTrip) creates a contractor_trips en_route row,
          // mirroring web's OnMyWayButton. The trip POST notifies the
          // homeowner ("X is on the way") + all admins ("Trip started")
          // and lights up the web trip card and the global auto-start
          // hook (useAssignedJobLocationAutoStart is gated on an en_route
          // trip existing). Best-effort: an "already have an active trip"
          // 400 just means a trip is already live (homeowner already
          // notified), so we still suppress the redundant share notify.
          // Other failures fall back to the enable-location-sharing
          // notify inside startJobTracking. The silent auto-start path
          // never passes createTrip — opening the screen shouldn't tell
          // the homeowner the contractor is on the way.
          let tripNotified = false;
          if (opts.createTrip) {
            try {
              await mobileApiClient.post('/api/contractor/trips', { jobId });
              tripNotified = true;
            } catch (tripErr) {
              const msg =
                tripErr instanceof Error ? tripErr.message : String(tripErr);
              if (/already have an active trip/i.test(msg)) {
                tripNotified = true;
              } else {
                logger.warn(
                  'Trip creation failed; falling back to location-sharing notify',
                  { jobId, error: msg }
                );
              }
            }
          }

          // 2026-05-26 audit-50 P1: route through the (contractor, job)
          // singleton registry so the AppNavigator-level auto-start hook
          // and this job-detail consumer share the same underlying
          // service + one contractor_locations row instead of racing.
          // If a watcher is already running for this pair (the global
          // auto-start beat us to it) we skip a second startJobTracking
          // and just attach the callback so the section UI updates.
          locationService = acquireJobTrackingService(user.id, jobId);
          const status = locationService.getTrackingStatus();
          if (!status.isTracking) {
            await locationService.startJobTracking(
              user.id,
              jobId,
              null,
              destination,
              async (location, eta) => {
                handleLocationUpdate({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  eta,
                });
              },
              { skipShareNotify: tripNotified }
            );
          }
        } else {
          throw new Error('A job or meeting is required to start tracking');
        }

        locationServiceRef.current = locationService;

        // Subscribe to real-time updates
        if (meetingId) {
          const channel = MeetingService.subscribeToContractorTravelLocation(
            meetingId,
            user.id,
            (data) => {
              const travelLocation: TravelLocation = {
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                eta: data.eta,
                timestamp: data.location.timestamp,
              };

              setCurrentLocation(travelLocation);
              setEta(data.eta);

              if (onLocationUpdate) {
                onLocationUpdate(travelLocation);
              }
            }
          );
          subscriptionRef.current = {
            unsubscribe: () => {
              channel.unsubscribe();
            },
          };
        }

        logger.info('Started travel tracking', {
          meetingId,
          contractorId: user.id,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to start tracking';
        setError(errorMessage);
        setIsTracking(false);
        // 2026-06-11 P1: only surface a blocking modal for an explicit
        // "I'm on my way" tap (opts.createTrip). The silent auto-start
        // path re-runs every time the assigned-job screen mounts / when
        // isTracking flips, so popping an Alert here spammed a blocking
        // "Error / OK" dialog every ~30s whenever GPS was unavailable
        // (indoors, permission off, emulator) — it covered the contract
        // + job-detail screens on a loop and made them unusable. The
        // error is still kept in state + logged; the en-route section UI
        // reflects it without hijacking the whole screen.
        if (opts.createTrip) {
          // Explicit "I'm on my way" tap — the user is waiting on this, so
          // surface it loudly (modal + error-level capture).
          Alert.alert('Error', errorMessage);
          logger.error('Error starting travel tracking', err);
        } else {
          // 2026-06-11: silent auto-start. A GPS-unavailable failure here
          // is an expected, recoverable condition (indoors, permission
          // off, emulator) that re-runs on every assigned-job mount.
          // Logging it at error level red-boxed the screen in dev (a
          // LogBox console-error overlay) and would spam Sentry in prod.
          // Downgrade to warn — same intent as the Alert gating above.
          logger.warn('Silent travel-tracking auto-start failed (will retry)', {
            error: errorMessage,
          });
        }
      }
    },
    [destination, jobId, meetingId, user, onLocationUpdate]
  );

  /**
   * Stop tracking.
   *
   * 2026-05-26 audit-50 P1: for jobId-scoped tracking we now release a
   * reference to the (contractor, job) singleton instead of stopping
   * the service directly. The service is only torn down when the last
   * consumer releases — protects the global auto-start hook from
   * being prematurely stopped when the contractor merely closes the
   * job detail screen.
   */
  const stopTracking = useCallback(async () => {
    try {
      if (locationServiceRef.current) {
        if (jobId && !meetingId && user?.id) {
          await releaseJobTrackingService(user.id, jobId);
        } else {
          // Meeting-based path retains its own lifecycle; the registry
          // is jobId-keyed and doesn't apply.
          await locationServiceRef.current.stopJobTracking();
        }
        locationServiceRef.current = null;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      setIsTracking(false);
      setCurrentLocation(null);
      setEta(null);
      setError(null);

      logger.info('Stopped travel tracking', { meetingId, jobId });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to stop tracking';
      setError(errorMessage);
      logger.error('Error stopping travel tracking', err);
    }
  }, [jobId, meetingId, user?.id]);

  /**
   * Mark contractor as arrived
   */
  const markArrived = useCallback(async () => {
    if (!user || user.role !== 'contractor') {
      setError('Only contractors can mark arrival');
      return;
    }

    if (!locationServiceRef.current) {
      setError('Tracking not started');
      return;
    }

    try {
      if (meetingId) {
        await MeetingService.markArrived(
          meetingId,
          user.id,
          locationServiceRef.current
        );
      } else if (jobId) {
        await locationServiceRef.current.markArrived(jobId, null);
      } else {
        throw new Error('A job or meeting is required to mark arrival');
      }

      // Terminal arrived state for this job session. Set BEFORE
      // stopTracking so that when stopTracking flips isTracking=false
      // (which re-runs the auto-start effect) the `hasArrived` guard is
      // already true and tracking can't bounce back to en-route.
      setHasArrived(true);

      // Stop tracking (service-side markArrived already preserved the
      // is_active=true row via arrivalCommitted, so the homeowner keeps
      // seeing the on-site card).
      await stopTracking();

      if (onArrival) {
        onArrival();
      }

      Alert.alert('Success', 'You have been marked as arrived');
      logger.info('Contractor marked as arrived', {
        meetingId,
        contractorId: user.id,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark arrival';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      logger.error('Error marking arrival', err);
    }
  }, [jobId, meetingId, user, stopTracking, onArrival]);

  // Job-detail-path Realtime subscription (audit-69 P1 + audit-76
  // AppState gating) lives in useContractorTravelRealtime. Memoise the
  // state-apply callback so the subscription only churns when its own
  // inputs change (matching the prior inline effect's deps).
  const applyRealtimeLocation = useCallback(
    (loc: TravelLocation) => {
      setCurrentLocation(loc);
      setEta(loc.eta);
      if (onLocationUpdate) {
        onLocationUpdate(loc);
      }
    },
    [onLocationUpdate]
  );

  useContractorTravelRealtime({
    jobId,
    meetingId,
    onLocation: applyRealtimeLocation,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (locationServiceRef.current) {
        // 2026-05-26 audit-50 P1: release instead of stop so the
        // global auto-start hook keeps its reference. The service is
        // only torn down when refcount hits 0.
        if (jobId && !meetingId && user?.id) {
          releaseJobTrackingService(user.id, jobId).catch((err) => {
            logger.error('Error releasing location service', err);
          });
        } else {
          locationServiceRef.current.stopJobTracking().catch((err) => {
            logger.error('Error cleaning up location service', err);
          });
        }
      }
    };
  }, []);

  // On mount, restore the arrived state from the DB. If a prior session
  // already marked this job as arrived (context='on_job', row still
  // is_active because arrivalCommitted preserved it), we must NOT let
  // auto-start re-open en-route tracking — that's the bounce-back bug.
  // `arrivedChecked` gates the auto-start effect until this resolves so
  // the two don't race on mount. Job-detail path only (jobId, no
  // meeting); other paths short-circuit the gate immediately.
  useEffect(() => {
    let cancelled = false;
    if (meetingId || !jobId || !user || user.role !== 'contractor') {
      setArrivedChecked(true);
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('contractor_locations')
          .select('context')
          .eq('contractor_id', user.id)
          .eq('job_id', jobId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const ctx = (data as { context?: string | null } | null)?.context ?? '';
        if (ARRIVED_CONTEXTS.has(ctx)) {
          setHasArrived(true);
        }
      } catch (err) {
        logger.warn('useJobTravelTracking: arrived-state restore failed', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) setArrivedChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, meetingId, user]);

  // Auto-start when caller opted in AND location permission is already
  // granted. Mirrors the push-token retry pattern: silent recovery for
  // users who've already given consent via a prior session or the
  // AlwaysLocationSoftAsk modal. We never trigger the OS prompt from
  // here — that path stays manual via the "Share My Location" button.
  useEffect(() => {
    if (!autoStartIfPermitted) return;
    // Wait for the arrived-state restore, then never auto-start once the
    // contractor has arrived (terminal for the job session).
    if (!arrivedChecked) return;
    if (hasArrived) return;
    if (!user || user.role !== 'contractor') return;
    if (isTracking) return;
    if (!Number.isFinite(destination.latitude)) return;
    if (!Number.isFinite(destination.longitude)) return;

    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (status === 'granted') {
          void startTracking();
        }
      } catch (err) {
        // Silent — user can still tap the manual button.
        logger.warn(
          'useJobTravelTracking: auto-start permission check failed',
          {
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    autoStartIfPermitted,
    arrivedChecked,
    hasArrived,
    user,
    isTracking,
    destination.latitude,
    destination.longitude,
    startTracking,
  ]);

  return {
    isTracking,
    hasArrived,
    currentLocation,
    eta,
    startTracking,
    stopTracking,
    markArrived,
    error,
  };
}
