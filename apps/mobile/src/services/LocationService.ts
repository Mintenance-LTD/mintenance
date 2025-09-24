import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export class LocationService {
  /**
   * Request location permissions from the user
   */
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get the user's current location
   */
  static async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Try to get address information
      try {
        const address = await this.reverseGeocode(
          userLocation.latitude,
          userLocation.longitude
        );
        return { ...userLocation, ...address };
      } catch (addressError) {
        logger.warn('Could not get address information:', {
          data: addressError,
        });
        return userLocation;
      }
    } catch (error) {
      logger.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }> {
    try {
      const addressResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResults && addressResults.length > 0) {
        const result = addressResults[0];
        return {
          address: `${result.streetNumber || ''} ${result.street || ''}`.trim(),
          city: result.city || undefined,
          state: result.region || undefined,
          postalCode: result.postalCode || undefined,
        };
      }
      return {};
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
      return {};
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  }
}
