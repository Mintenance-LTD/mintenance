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
import { JobContextLocationService, ContractorLocationContext } from '../services/JobContextLocationService';
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
  meetingId: string;
  jobId?: string;
  destination: { latitude: number; longitude: number };
  onLocationUpdate?: (location: TravelLocation) => void;
  onArrival?: () => void;
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
}: UseJobTravelTrackingOptions): UseJobTravelTrackingReturn {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<TravelLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const locationServiceRef = useRef<JobContextLocationService | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);

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

      // Start tracking via MeetingService
      const locationService = await MeetingService.startTravelTracking(
        meetingId,
        user.id,
        (locationUpdate) => {
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
        }
      );

      locationServiceRef.current = locationService;

      // Subscribe to real-time updates
      subscriptionRef.current = MeetingService.subscribeToContractorTravelLocation(
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

      logger.info('Started travel tracking', { meetingId, contractorId: user.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      setIsTracking(false);
      Alert.alert('Error', errorMessage);
      logger.error('Error starting travel tracking', err);
    }
  }, [meetingId, user, onLocationUpdate]);

  /**
   * Stop tracking
   */
  const stopTracking = useCallback(async () => {
    try {
      if (locationServiceRef.current) {
        await locationServiceRef.current.stopJobTracking();
        locationServiceRef.current = null;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }

      setIsTracking(false);
      setCurrentLocation(null);
      setEta(null);
      setError(null);

      logger.info('Stopped travel tracking', { meetingId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop tracking';
      setError(errorMessage);
      logger.error('Error stopping travel tracking', err);
    }
  }, [meetingId]);

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
      await MeetingService.markArrived(
        meetingId,
        user.id,
        locationServiceRef.current
      );

      // Stop tracking
      await stopTracking();

      if (onArrival) {
        onArrival();
      }

      Alert.alert('Success', 'You have been marked as arrived');
      logger.info('Contractor marked as arrived', { meetingId, contractorId: user.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark arrival';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      logger.error('Error marking arrival', err);
    }
  }, [meetingId, user, stopTracking, onArrival]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
      if (locationServiceRef.current) {
        locationServiceRef.current.stopJobTracking().catch((err) => {
          logger.error('Error cleaning up location service', err);
        });
      }
    };
  }, []);

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
