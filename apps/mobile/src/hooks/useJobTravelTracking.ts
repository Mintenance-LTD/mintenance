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
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

interface TravelLocation {
  latitude: number;
  longitude: number;
  eta: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

interface UseJobTravelTrackingOptions {
  meetingId?: string | null;
  jobId?: string;
  destination: { latitude: number; longitude: number };
  onLocationUpdate?: (location: TravelLocation) => void;
  onArrival?: () => void;
  /**
   * When true, automatically start tracking on mount IF location
   * permission is already 'granted' (no OS prompt). Falls back to the
   * manual button in `undetermined`/`denied` states. Live audit
   * (2026-04-28) showed `contractor_locations = 0` in prod because
   * the manual "Share My Location" button on the job detail page sat
   * at the bottom and was rarely tapped — auto-start removes the gap
   * for contractors who already granted permission via the
   * AlwaysLocationSoftAsk modal or a prior session.
   */
  autoStartIfPermitted?: boolean;
}

interface UseJobTravelTrackingReturn {
  isTracking: boolean;
  currentLocation: TravelLocation | null;
  eta: number | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  markArrived: () => Promise<void>;
  error: string | null;
}

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
  const startTracking = useCallback(async () => {
    if (!user || user.role !== 'contractor') {
      setError('Only contractors can start travel tracking');
      return;
    }

    try {
      setError(null);
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
            }
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
      Alert.alert('Error', errorMessage);
      logger.error('Error starting travel tracking', err);
    }
  }, [destination, jobId, meetingId, user, onLocationUpdate]);

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

      // Stop tracking
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

  // Auto-start when caller opted in AND location permission is already
  // granted. Mirrors the push-token retry pattern: silent recovery for
  // users who've already given consent via a prior session or the
  // AlwaysLocationSoftAsk modal. We never trigger the OS prompt from
  // here — that path stays manual via the "Share My Location" button.
  useEffect(() => {
    if (!autoStartIfPermitted) return;
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
    user,
    isTracking,
    destination.latitude,
    destination.longitude,
    startTracking,
  ]);

  return {
    isTracking,
    currentLocation,
    eta,
    startTracking,
    stopTracking,
    markArrived,
    error,
  };
}
