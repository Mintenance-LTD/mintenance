import { useEffect, useState } from 'react';
import { LocationService } from '../../../services/LocationService';
import { logger } from '@mintenance/shared';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Captures the device GPS location on mount (opt-in).
 * Non-blocking: if permission is denied or GPS is unavailable, returns null
 * and the assessment submits without location data.
 */
export function useAssessmentLocation(): GpsCoordinates | null {
  const [location, setLocation] = useState<GpsCoordinates | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await LocationService.getCurrentLocation();
        if (cancelled || !result) return;
        setLocation({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        logger.info('Assessment GPS captured', {
          latitude: result.latitude,
          longitude: result.longitude,
        });
      } catch {
        // Permission denied or GPS unavailable — optional, skip silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
