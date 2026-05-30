/**
 * Job Context Location Service — context-aware GPS tracking only while
 * the contractor is traveling to a job, on a job, or opted-in to
 * Available mode. (Single-responsibility: location tracking only.)
 */

import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { encodeGeohash } from '../utils/geohash';
import { BackgroundLocationTask } from './BackgroundLocationTask';
import { mobileApiClient } from '../utils/mobileApiClient';

export enum ContractorLocationContext {
  AVAILABLE = 'available', // Contractor is available (opt-in)
  TRAVELING_TO_JOB = 'traveling', // En route to scheduled job/meeting
  ON_JOB = 'on_job', // Currently at job site
  OFF_DUTY = 'off_duty', // Not tracking
}

interface TrackingConfig {
  updateInterval: number;
  accuracy: Location.Accuracy;
  distanceFilter: number;
}

interface LocationUpdateCallback {
  (location: Location.LocationObject, eta: number): void;
}

export class JobContextLocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private currentContext: ContractorLocationContext =
    ContractorLocationContext.OFF_DUTY;
  private activeJobId: string | null = null;
  private activeMeetingId: string | null = null;
  private destination: { latitude: number; longitude: number } | null = null;
  private contractorId: string | null = null;
  private lastLocation: Location.LocationObject | null = null;
  private isMoving = false;
  private speedThreshold = 2; // m/s (~7 km/h)
  // 2026-05-26 audit-67 P2: when true, stopJobTracking skips the
  // is_active=false write so the homeowner UI keeps showing "Arrived".
  private arrivalCommitted = false;

  /**
   * Start tracking when contractor begins traveling to a job/meeting
   */
  async startJobTracking(
    contractorId: string,
    jobId: string,
    meetingId: string | null,
    destination: { latitude: number; longitude: number },
    onLocationUpdate?: LocationUpdateCallback,
    // 2026-05-28 U4: when the caller has already created a
    // contractor_trips en_route row (which itself notifies the
    // homeowner "X is on the way" + all admins), skip the redundant
    // enable-location-sharing homeowner notify to avoid double-pinging
    // the homeowner within the same gesture.
    options?: { skipShareNotify?: boolean }
  ): Promise<void> {
    try {
      this.contractorId = contractorId;
      this.activeJobId = jobId;
      this.activeMeetingId = meetingId;
      this.destination = destination;
      this.currentContext = ContractorLocationContext.TRAVELING_TO_JOB;
      this.arrivalCommitted = false;

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // 2026-05-26 audit-67 P1: parity with web LocationSharing — fire
      // the homeowner push + email via the API. Best-effort; GPS
      // continues even if the notify request fails. Suppressed when a
      // trip was just created (U4) — the trip already notified.
      if (!options?.skipShareNotify) {
        try {
          await mobileApiClient.post(
            `/api/jobs/${jobId}/enable-location-sharing`,
            { enabled: true }
          );
        } catch (notifyErr) {
          logger.warn(
            'enable-location-sharing notify failed; tracking anyway',
            {
              jobId,
              error:
                notifyErr instanceof Error
                  ? notifyErr.message
                  : String(notifyErr),
            }
          );
        }
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      this.lastLocation = initialLocation;

      // Calculate initial ETA
      const initialETA = await this.calculateETA(initialLocation, destination);

      // Update database immediately
      await this.updateContractorLocation(
        jobId,
        meetingId,
        initialLocation,
        initialETA
      );

      // Start watching position
      const config = this.getAdaptiveConfig();

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: config.accuracy,
          distanceInterval: config.distanceFilter,
          timeInterval: config.updateInterval,
        },
        async (location) => {
          this.updateMovementState(location);

          const eta = await this.calculateETA(location, destination);

          // Update contractor location in database
          await this.updateContractorLocation(jobId, meetingId, location, eta);

          // Notify via callback
          if (onLocationUpdate) {
            onLocationUpdate(location, eta);
          }

          this.lastLocation = location;
        }
      );

      logger.info('Started job travel tracking', {
        contractorId,
        jobId,
        meetingId,
        destination,
      });

      // Audit 2026-04-16 P2 #14: also engage background task so tracking
      // survives app minimization. Fail-soft — foreground watcher stays up
      // even if background permission is denied.
      void BackgroundLocationTask.start({
        contractorId,
        jobId,
        meetingId,
        destination,
      });
    } catch (error) {
      logger.error('Error starting job tracking', error);
      throw error;
    }
  }

  /**
   * Mark contractor as arrived at job site.
   * 2026-05-24 audit-32 P1: also PATCH the en_route contractor_trips
   * row to 'arrived' so the next "I'm on my way" tap isn't blocked by
   * the existing-active-trip guard. Tolerates absence.
   */
  async markArrived(jobId: string, meetingId: string | null): Promise<void> {
    // 2026-05-26 audit-48 P1: fall back to a fresh position read if
    // lastLocation is null (permission edge case, GPS cold-start, app
    // resume); re-throw only if the recovery read also fails.
    if (!this.lastLocation) {
      try {
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        this.lastLocation = fresh;
      } catch (err) {
        logger.warn('markArrived: fallback location fetch failed', {
          err: err instanceof Error ? err.message : String(err),
        });
        throw new Error('No location data available');
      }
    }

    this.currentContext = ContractorLocationContext.ON_JOB;
    this.arrivalCommitted = true;

    // Update database with arrival status (is_active stays true so the
    // homeowner UI keeps showing the live card — see arrivalCommitted
    // doc above).
    await this.updateContractorLocation(jobId, meetingId, this.lastLocation, 0);

    // Close the contractor_trips en_route row if one exists.
    try {
      const resp = await mobileApiClient.get<{
        trips?: { id: string; status: string; job_id: string | null }[];
      }>(`/api/contractor/trips?status=en_route&jobId=${jobId}`);
      const activeTrip = (resp.trips ?? [])[0];
      if (activeTrip?.id) {
        await mobileApiClient.patch(`/api/contractor/trips/${activeTrip.id}`, {
          status: 'arrived',
        });
        logger.info('Closed en_route trip on arrival', {
          tripId: activeTrip.id,
          jobId,
        });
      }
    } catch (err) {
      logger.warn(
        'Could not close en_route trip on arrival — continuing anyway',
        { jobId, err }
      );
    }

    // 2026-05-26 audit-67 P2: stop the GPS watcher inline rather than
    // calling stopJobTracking (which would set is_active=false and
    // drop the contractor off the homeowner card). arrivalCommitted
    // tells the eventual stopJobTracking (via registry release) to
    // preserve the row.
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    try {
      await BackgroundLocationTask.stop();
    } catch (bgErr) {
      logger.warn('BackgroundLocationTask.stop after arrival failed', {
        error: bgErr instanceof Error ? bgErr.message : String(bgErr),
      });
    }

    // audit-76: clear stale GPS state; identity (ON_JOB / activeJobId) intact.
    this.destination = null;
    this.lastLocation = null;
    this.isMoving = false;

    logger.info('Contractor marked as arrived', { jobId, meetingId });
  }

  /**
   * Stop tracking when contractor completes job or cancels
   */
  async stopJobTracking(): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    // 2026-05-26 audit-67 P2: post-arrival, leave is_active=true so
    // the homeowner UI keeps rendering "Arrived". Final deactivation
    // flows through enable-location-sharing {enabled:false} or the
    // next session reusing the row.
    if (this.contractorId && this.activeJobId && !this.arrivalCommitted) {
      await supabase
        .from('contractor_locations')
        .update({ is_active: false })
        .eq('contractor_id', this.contractorId)
        .eq('job_id', this.activeJobId);
    }

    // Stop background task + clear persisted context.
    await BackgroundLocationTask.stop();

    this.currentContext = ContractorLocationContext.OFF_DUTY;
    this.activeJobId = null;
    this.activeMeetingId = null;
    this.destination = null;
    this.lastLocation = null;
    this.isMoving = false;
    this.arrivalCommitted = false;

    logger.info('Stopped job travel tracking');
  }

  /**
   * Calculate ETA based on current location, speed, and distance
   */
  private async calculateETA(
    currentLocation: Location.LocationObject,
    destination: { latitude: number; longitude: number }
  ): Promise<number> {
    const distance = this.calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      destination.latitude,
      destination.longitude
    );

    // Use speed from location if available, otherwise estimate based on movement
    let speed = currentLocation.coords.speed; // m/s

    if (!speed || speed === 0) {
      // Estimate speed based on movement state
      speed = this.isMoving ? 13.9 : 0; // ~50 km/h when moving, 0 when stationary
    }

    // Convert m/s to km/h
    const speedKmh = speed * 3.6;

    // Calculate base ETA (distance in km / speed in km/h * 60 minutes)
    const baseETA = speedKmh > 0 ? (distance / speedKmh) * 60 : 999; // minutes

    // Add traffic buffer (20% buffer for urban areas)
    const trafficMultiplier = 1.2;
    const eta = Math.ceil(baseETA * trafficMultiplier);

    // Cap at reasonable maximum (e.g., 2 hours)
    return Math.min(eta, 120);
  }

  /**
   * Update movement state based on location changes
   */
  private updateMovementState(location: Location.LocationObject): void {
    if (!this.lastLocation) {
      this.isMoving = false;
      return;
    }

    const distance = this.calculateDistance(
      this.lastLocation.coords.latitude,
      this.lastLocation.coords.longitude,
      location.coords.latitude,
      location.coords.longitude
    );

    const timeDiff = (location.timestamp - this.lastLocation.timestamp) / 1000; // seconds
    // 2026-05-27 audit-84 P1: distance is km; *1000 so m/s ↔ m/s.
    const speed = (distance * 1000) / timeDiff; // m/s

    this.isMoving = speed > this.speedThreshold;
  }

  /**
   * Adaptive tracking config based on movement
   */
  private getAdaptiveConfig(): TrackingConfig {
    if (this.isMoving) {
      return {
        updateInterval: 10000, // 10 seconds when moving
        accuracy: Location.Accuracy.Balanced,
        distanceFilter: 20, // 20 meters
      };
    }
    return {
      updateInterval: 30000, // 30 seconds when stationary
      accuracy: Location.Accuracy.Low,
      distanceFilter: 50, // 50 meters
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Update contractor location in database
   */
  private async updateContractorLocation(
    jobId: string,
    meetingId: string | null,
    location: Location.LocationObject,
    eta: number
  ): Promise<void> {
    if (!this.contractorId) {
      throw new Error('Contractor ID not set');
    }

    const geohash = encodeGeohash(
      location.coords.latitude,
      location.coords.longitude,
      7
    );

    // 2026-05-24 audit-36 P0: explicit select-then-update-or-insert
    // (not upsert). contractor_locations only has a PARTIAL unique
    // index on (contractor_id, job_id) WHERE is_active=true; PostgREST
    // can't infer ON CONFLICT with WHERE predicates, so upsert was
    // failing (42P10) or duplicating rows. Direct-Supabase is kept
    // here: GPS pulses fire every 5–15s, the homeowner reads via
    // Realtime, and the INSERT/UPDATE RLS scopes to auth.uid()=
    // contractor_id so the security boundary lives at the DB layer.
    const payload = {
      contractor_id: this.contractorId,
      job_id: jobId,
      meeting_id: meetingId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      heading: location.coords.heading || undefined,
      speed: location.coords.speed || undefined,
      eta_minutes: eta,
      context: this.currentContext,
      geohash,
      location_timestamp: new Date().toISOString(),
      is_active: true,
      is_sharing_location: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('contractor_locations')
      .select('id')
      .eq('contractor_id', this.contractorId)
      .eq('job_id', jobId)
      .eq('is_active', true)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from('contractor_locations')
          .update(payload)
          .eq('id', existing.id)
      : await supabase.from('contractor_locations').insert(payload);

    if (error) {
      logger.error('Error updating contractor location', error);
      throw error;
    }
  }

  /**
   * Get current tracking status
   */
  getTrackingStatus(): {
    isTracking: boolean;
    context: ContractorLocationContext;
    jobId: string | null;
    meetingId: string | null;
  } {
    return {
      isTracking: this.watchSubscription !== null,
      context: this.currentContext,
      jobId: this.activeJobId,
      meetingId: this.activeMeetingId,
    };
  }
}

// Refcounted singleton registry (audit-50 P1) extracted to
// jobTrackingRegistry.ts; re-exported here for backward-compatible
// imports.
export {
  acquireJobTrackingService,
  releaseJobTrackingService,
} from './jobTrackingRegistry';
