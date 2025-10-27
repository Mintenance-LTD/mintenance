/**
 * Tests for LocationService - Location and Geocoding Service
 */

import { LocationService, UserLocation } from '../LocationService';
import * as Location from 'expo-location';
import { logger } from '../../utils/logger';

// Mock expo-location
jest.mock('expo-location');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should return true when permission is granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
    });

    it('should return false when permission request fails', async () => {
      const error = new Error('Permission request failed');
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(error);

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error requesting location permission:', error);
    });
  });

  describe('getCurrentLocation', () => {
    const mockLocationCoords = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should get current location with address', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocationCoords);
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
        },
      ]);

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      });
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
      });
    });

    it('should get location without address if geocoding fails', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocationCoords);
      // reverseGeocodeAsync fails and returns empty object (handled internally)
      (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(
        new Error('Geocoding failed')
      );

      const result = await LocationService.getCurrentLocation();

      // Should return location with empty address since reverseGeocode catches errors
      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
      });
      // Logger.error is called from reverseGeocode, not logger.warn from getCurrentLocation
      expect(logger.error).toHaveBeenCalledWith('Error reverse geocoding:', expect.any(Error));
    });

    it('should return null when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await LocationService.getCurrentLocation();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting current location:',
        expect.any(Error)
      );
    });

    it('should return null when location retrieval fails', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      const error = new Error('Location unavailable');
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(error);

      const result = await LocationService.getCurrentLocation();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error getting current location:', error);
    });
  });

  describe('reverseGeocode', () => {
    it('should return address components when geocoding succeeds', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          streetNumber: '456',
          street: 'Broadway',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94102',
        },
      ]);

      const result = await LocationService.reverseGeocode(37.7749, -122.4194);

      expect(result).toEqual({
        address: '456 Broadway',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
      });
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('should handle partial address information', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          street: 'Main St',
          city: 'Boston',
          // Missing streetNumber, region, postalCode
        },
      ]);

      const result = await LocationService.reverseGeocode(42.3601, -71.0589);

      expect(result).toEqual({
        address: 'Main St',
        city: 'Boston',
        state: undefined,
        postalCode: undefined,
      });
    });

    it('should return empty object when no results', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

      const result = await LocationService.reverseGeocode(0, 0);

      expect(result).toEqual({});
    });

    it('should return empty object when geocoding fails', async () => {
      const error = new Error('Geocoding service unavailable');
      (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(error);

      const result = await LocationService.reverseGeocode(40.7128, -74.0060);

      expect(result).toEqual({});
      expect(logger.error).toHaveBeenCalledWith('Error reverse geocoding:', error);
    });

    it('should handle address with missing street number', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          street: 'Broadway',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
        },
      ]);

      const result = await LocationService.reverseGeocode(40.7589, -73.9851);

      expect(result).toEqual({
        address: 'Broadway',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between New York and Los Angeles', () => {
      // NY: 40.7128, -74.0060
      // LA: 34.0522, -118.2437
      const distance = LocationService.calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);

      // Approximate distance is about 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should calculate distance between San Francisco and San Jose', () => {
      // SF: 37.7749, -122.4194
      // SJ: 37.3382, -121.8863
      const distance = LocationService.calculateDistance(37.7749, -122.4194, 37.3382, -121.8863);

      // Approximate distance is about 67 km
      expect(distance).toBeGreaterThan(60);
      expect(distance).toBeLessThan(75);
    });

    it('should return 0 for same coordinates', () => {
      const distance = LocationService.calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      // Sydney: -33.8688, 151.2093
      // Melbourne: -37.8136, 144.9631
      const distance = LocationService.calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);

      // Approximate distance is about 713 km
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });

    it('should calculate small distances accurately', () => {
      // Two points about 1 km apart
      const distance = LocationService.calculateDistance(40.7128, -74.0060, 40.7228, -74.0060);

      expect(distance).toBeGreaterThan(1.0);
      expect(distance).toBeLessThan(1.5);
    });

    it('should handle crossing the equator', () => {
      // Northern hemisphere: 10°N, 0°E
      // Southern hemisphere: 10°S, 0°E
      const distance = LocationService.calculateDistance(10, 0, -10, 0);

      // Approximate distance is about 2226 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should handle crossing the prime meridian', () => {
      // West: 0°N, 10°W
      // East: 0°N, 10°E
      const distance = LocationService.calculateDistance(0, -10, 0, 10);

      // Approximate distance is about 2226 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });
  });

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      expect(LocationService.formatDistance(0.5)).toBe('500m away');
      expect(LocationService.formatDistance(0.123)).toBe('123m away');
      expect(LocationService.formatDistance(0.999)).toBe('999m away');
    });

    it('should format distances between 1-10km with one decimal', () => {
      expect(LocationService.formatDistance(1.0)).toBe('1.0km away');
      expect(LocationService.formatDistance(5.5)).toBe('5.5km away');
      expect(LocationService.formatDistance(9.9)).toBe('9.9km away');
    });

    it('should format distances over 10km as rounded integers', () => {
      expect(LocationService.formatDistance(10)).toBe('10km away');
      expect(LocationService.formatDistance(15.7)).toBe('16km away');
      expect(LocationService.formatDistance(100.4)).toBe('100km away');
      expect(LocationService.formatDistance(1000)).toBe('1000km away');
    });

    it('should handle very small distances', () => {
      expect(LocationService.formatDistance(0.001)).toBe('1m away');
      expect(LocationService.formatDistance(0.0001)).toBe('0m away');
    });

    it('should handle edge cases around boundaries', () => {
      expect(LocationService.formatDistance(0.9999)).toBe('1000m away');
      expect(LocationService.formatDistance(1.0001)).toBe('1.0km away');
      expect(LocationService.formatDistance(9.9999)).toBe('10.0km away');
      expect(LocationService.formatDistance(10.001)).toBe('10km away');
    });

    it('should handle zero distance', () => {
      expect(LocationService.formatDistance(0)).toBe('0m away');
    });
  });

  describe('Integration Tests', () => {
    it('should get location and calculate distance to a point', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        timestamp: Date.now(),
      });
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          city: 'New York',
          region: 'NY',
        },
      ]);

      const currentLocation = await LocationService.getCurrentLocation();
      expect(currentLocation).not.toBeNull();

      if (currentLocation) {
        // Calculate distance to Los Angeles
        const distance = LocationService.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          34.0522,
          -118.2437
        );

        expect(distance).toBeGreaterThan(3900);
        expect(distance).toBeLessThan(4000);
        // Distance formatting will vary slightly based on calculation precision
        const formatted = LocationService.formatDistance(distance);
        expect(formatted).toMatch(/^39\d\dkm away$/);
      }
    });

    it('should handle permission denial gracefully', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const location = await LocationService.getCurrentLocation();

      expect(location).toBeNull();
      expect(logger.error).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('should get location with partial geocoding', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        timestamp: Date.now(),
      });
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          city: 'San Francisco',
          // Missing other fields
        },
      ]);

      const location = await LocationService.getCurrentLocation();

      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        address: '',
        city: 'San Francisco',
        state: undefined,
        postalCode: undefined,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle coordinates at poles', () => {
      // North Pole to South Pole
      const distance = LocationService.calculateDistance(90, 0, -90, 0);

      // Should be approximately half Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });

    it('should handle coordinates at date line', () => {
      // International Date Line crossing
      const distance = LocationService.calculateDistance(0, 179, 0, -179);

      // Should be a small distance (about 222 km)
      expect(distance).toBeGreaterThan(200);
      expect(distance).toBeLessThan(250);
    });

    it('should handle very precise coordinates', () => {
      const distance = LocationService.calculateDistance(
        40.712776123456,
        -74.005974123456,
        40.712776223456,
        -74.005974223456
      );

      // Very small distance
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(0.1);
    });

    it('should handle empty address results from geocoding', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        {
          // All fields empty/null
          streetNumber: null,
          street: null,
          city: null,
          region: null,
          postalCode: null,
        },
      ]);

      const result = await LocationService.reverseGeocode(0, 0);

      expect(result).toEqual({
        address: '',
        city: undefined,
        state: undefined,
        postalCode: undefined,
      });
    });
  });
});
