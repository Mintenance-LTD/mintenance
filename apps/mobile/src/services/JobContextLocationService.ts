/**
 * Job Context Location Service
 * 
 * Context-aware location tracking for Mintenance contractors.
 * Unlike Uber's 24/7 tracking, we track contractors ONLY when:
 * 1. They're traveling to a scheduled job/meeting
 * 2. They're on an active job
 * 3. They opt-in to "Available" mode for discovery
 * 
 * @filesize Target: <300 lines
 * @compliance Single Responsibility - Location tracking only
 */

import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { encodeGeohash } from '../utils/geohash';

export enum ContractorLocationContext {
  AVAILABLE = 'available',        // Contractor is available (opt-in)
  TRAVELING_TO_JOB = 'traveling', // En route to scheduled job/meeting
  ON_JOB = 'on_job',              // Currently at job site
  OFF_DUTY = 'off_duty',           // Not tracking
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
  private currentContext: ContractorLocationContext = ContractorLocationContext.OFF_DUTY;
  private activeJobId: string | null = null;
  private activeMeetingId: string | null = null;
  private destination: { latitude: number; longitude: number } | null = null;
  private contractorId: string | null = null;
  private lastLocation: Location.LocationObject | null = null;
  private isMoving = false;
  private speedThreshold = 2; // m/s (~7 km/h)

  /**
   * Start tracking when contractor begins traveling to a job/meeting
   */
  async startJobTracking(
    contractorId: string,
    jobId: string,
    meetingId: string | null,
    destination: { latitude: number; longitude: number },
    onLocationUpdate?: LocationUpdateCallback
  ): Promise<void> {
    try {
      this.contractorId = contractorId;
      this.activeJobId = jobId;
      this.activeMeetingId = meetingId;
      this.destination = destination;
      this.currentContext = ContractorLocationContext.TRAVELING_TO_JOB;

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      this.lastLocation = initialLocation;

      // Calculate initial ETA
      const initialETA = await this.calculateETA(initialLocation, destination);
      
      // Update database immediately
      await this.updateContractorLocation(jobId, meetingId, initialLocation, initialETA);

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
    } catch (error) {
      logger.error('Error starting job tracking', error);
      throw error;
    }
  }

  /**
   * Mark contractor as arrived at job site
   */
  async markArrived(jobId: string, meetingId: string | null): Promise<void> {
    if (!this.lastLocation) {
      throw new Error('No location data available');
    }

    this.currentContext = ContractorLocationContext.ON_JOB;

    // Update database with arrival status
    await this.updateContractorLocation(jobId, meetingId, this.lastLocation, 0);

    // Stop tracking (or reduce frequency)
    await this.stopJobTracking();

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

    // Mark location as inactive
    if (this.contractorId && this.activeJobId) {
      await supabase
        .from('contractor_locations')
        .update({ is_active: false })
        .eq('contractor_id', this.contractorId)
        .eq('job_id', this.activeJobId);
    }

    this.currentContext = ContractorLocationContext.OFF_DUTY;
    this.activeJobId = null;
    this.activeMeetingId = null;
    this.destination = null;
    this.lastLocation = null;
    this.isMoving = false;

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
    const speed = distance / timeDiff; // m/s

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

    const { error } = await supabase
      .from('contractor_locations')
      .upsert({
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
        timestamp: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'contractor_id',
      });

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
