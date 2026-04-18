/**
 * Background Location Task
 *
 * Extends the contractor live-tracking feature with a TaskManager-backed
 * background location update channel. When the contractor backgrounds or
 * closes the app while traveling to a job, their GPS continues to flow to
 * `public.contractor_locations` so the homeowner's map doesn't go stale.
 *
 * Audit 2026-04-16 P2 #14. Pairs with JobContextLocationService which owns
 * the foreground subscription; this module owns the background task and
 * the tracking context persistence.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { encodeGeohash } from '../utils/geohash';

export const BACKGROUND_LOCATION_TASK =
  'mintenance-contractor-background-location';
const CONTEXT_STORAGE_KEY = 'background-location-context-v1';

export interface BackgroundLocationContext {
  contractorId: string;
  jobId: string;
  meetingId: string | null;
  destination: { latitude: number; longitude: number };
}

/**
 * Persist the active tracking context so the standalone Task executor
 * (which has no reference to the service instance) can look it up.
 */
async function saveContext(ctx: BackgroundLocationContext): Promise<void> {
  await AsyncStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(ctx));
}

async function loadContext(): Promise<BackgroundLocationContext | null> {
  const raw = await AsyncStorage.getItem(CONTEXT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BackgroundLocationContext;
  } catch {
    return null;
  }
}

async function clearContext(): Promise<void> {
  await AsyncStorage.removeItem(CONTEXT_STORAGE_KEY);
}

/**
 * Haversine distance in km between two points.
 * Duplicated (not imported) from JobContextLocationService so the task
 * body stays standalone / import-light at module load.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Define the TaskManager handler at module load (Expo requirement — the task
 * must be registered before the app calls startLocationUpdatesAsync).
 * The handler is a plain function, NOT a class method.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    logger.warn('Background location task error', { message: error.message });
    return;
  }
  if (!data) return;

  const { locations } = data as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const ctx = await loadContext();
  if (!ctx) return; // No active tracking session — ignore

  // Only process the most recent sample to avoid flooding the DB.
  const location = locations[locations.length - 1];
  if (!location) return;

  // Recompute a cheap ETA estimate.
  const distanceKm = haversineKm(
    location.coords.latitude,
    location.coords.longitude,
    ctx.destination.latitude,
    ctx.destination.longitude
  );
  const speedKmh =
    location.coords.speed && location.coords.speed > 0
      ? location.coords.speed * 3.6
      : 30; // default assumption for urban travel
  const etaMinutes = Math.min(
    120,
    Math.max(1, Math.ceil((distanceKm / speedKmh) * 60 * 1.2))
  );

  try {
    const geohash = encodeGeohash(
      location.coords.latitude,
      location.coords.longitude,
      7
    );
    const { error: upsertErr } = await supabase
      .from('contractor_locations')
      .upsert(
        {
          contractor_id: ctx.contractorId,
          job_id: ctx.jobId,
          meeting_id: ctx.meetingId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          heading: location.coords.heading ?? undefined,
          speed: location.coords.speed ?? undefined,
          eta_minutes: etaMinutes,
          geohash,
          context: 'traveling',
          is_active: true,
          is_sharing_location: true,
          location_timestamp: new Date(location.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'contractor_id,job_id' }
      );

    if (upsertErr) {
      logger.warn('Background location upsert failed', {
        message: upsertErr.message,
      });
    }
  } catch (err) {
    logger.warn('Background location handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
});

export const BackgroundLocationTask = {
  /**
   * Start the background location channel for a given tracking session.
   * Fails soft: if background permission is denied or Expo Go context blocks
   * this API, we log and return false so the foreground tracker can carry on.
   */
  async start(ctx: BackgroundLocationContext): Promise<boolean> {
    try {
      // Foreground permission must already be granted (startJobTracking handles that).
      // Ask specifically for background now.
      const current = await Location.getBackgroundPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const req = await Location.requestBackgroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        logger.info(
          'Background location permission not granted — foreground only'
        );
        return false;
      }

      await saveContext(ctx);

      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (alreadyRunning) {
        // Context swapped in for a new session — leave the updater running.
        return true;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25, // meters
        timeInterval: 20_000, // 20s
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'Sharing your location with the homeowner',
          notificationBody: 'We stop sharing when you arrive or go off duty.',
        },
      });
      logger.info('Background location tracking started', {
        jobId: ctx.jobId,
      });
      return true;
    } catch (err) {
      logger.warn('Failed to start background location task', {
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  /**
   * Stop the background channel and clear the persisted context.
   */
  async stop(): Promise<void> {
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      ).catch(() => false);
      if (running) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (err) {
      logger.warn('Failed to stop background location task', {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      await clearContext();
    }
  },
};

export default BackgroundLocationTask;
