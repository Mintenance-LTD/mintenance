import React from 'react';
import { LocationService, UserLocation } from '../../services/LocationService';
import * as Location from 'expo-location';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  LocationAccuracy: {
    High: 'High'
  }
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('LocationService', () => {
  const mockLocation: Location.LocationObject = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  };

  const mockGeocodingResult: Location.LocationGeocodedAddress = {
    city: 'New York',
    country: 'United States',
    district: 'Manhattan',
    isoCountryCode: 'US',
    name: '123 Main St',
    postalCode: '10001',
    region: 'NY',
    street: 'Main St',
    streetNumber: '123',
    subregion: 'New York County',
    timezone: 'America/New_York'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should request and return location permission status', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted'
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied'
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
    });

    it('should handle permission request error', async () => {
      const error = new Error('Permission request failed');
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(error);

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error requesting location permission:', error);
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location with address', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([mockGeocodingResult]);

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      });

      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.LocationAccuracy.High
      });
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 40.7128,
        longitude: -74.0060
      });
    });

    it('should get current location without address when geocoding fails', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(new Error('Geocoding failed'));

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Error getting address for location:',
        expect.any(Error)
      );
    });

    it('should handle location request error', async () => {
      const error = new Error('Location unavailable');
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(error);

      await expect(LocationService.getCurrentLocation()).rejects.toThrow('Location unavailable');
      expect(logger.error).toHaveBeenCalledWith('Error getting current location:', error);
    });

    it('should handle empty geocoding results', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060
      });
    });
  });

  describe('geocodeAddress', () => {
    it('should geocode address successfully', async () => {
      const mockGeocodeResult: Location.LocationGeocodedLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: null
      };

      (Location.geocodeAsync as jest.Mock).mockResolvedValue([mockGeocodeResult]);

      const result = await LocationService.geocodeAddress('123 Main St, New York, NY 10001');

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St, New York, NY 10001'
      });

      expect(Location.geocodeAsync).toHaveBeenCalledWith('123 Main St, New York, NY 10001');
    });

    it('should return null for invalid address', async () => {
      (Location.geocodeAsync as jest.Mock).mockResolvedValue([]);

      const result = await LocationService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });

    it('should handle geocoding error', async () => {
      const error = new Error('Geocoding service error');
      (Location.geocodeAsync as jest.Mock).mockRejectedValue(error);

      const result = await LocationService.geocodeAddress('123 Main St');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error geocoding address:', error);
    });
  });

  describe('updateUserLocation', () => {
    it('should update user location in database', async () => {
      const userLocation: UserLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      };

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        update: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => ({
          data: { id: 'user-1', ...userLocation },
          error: null
        }))
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await LocationService.updateUserLocation('user-1', userLocation);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        updated_at: expect.any(String)
      });
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('should handle database update error', async () => {
      const userLocation: UserLocation = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        update: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => ({
          data: null,
          error: { message: 'Update failed' }
        }))
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await expect(LocationService.updateUserLocation('user-1', userLocation))
        .rejects.toThrow('Update failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating user location:',
        expect.any(Object)
      );
    });
  });

  describe('getUserLocation', () => {
    it('should get user location from database', async () => {
      const mockUserData = {
        id: 'user-1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001'
      };

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: mockUserData,
          error: null
        }))
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await LocationService.getUserLocation('user-1');

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      });

      expect(mockSupabaseChain.select).toHaveBeenCalledWith(
        'latitude, longitude, address, city, state, postal_code'
      );
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('should return null when user location not found', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: null,
          error: { code: 'PGRST116' } // Not found error code
        }))
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await LocationService.getUserLocation('user-1');

      expect(result).toBeNull();
    });

    it('should handle database query error', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: null,
          error: { message: 'Database error' }
        }))
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await expect(LocationService.getUserLocation('user-1'))
        .rejects.toThrow('Database error');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two locations', () => {
      const location1: UserLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const location2: UserLocation = { latitude: 40.7589, longitude: -73.9851 }; // Times Square

      const distance = LocationService.calculateDistance(location1, location2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same location', () => {
      const location: UserLocation = { latitude: 40.7128, longitude: -74.0060 };

      const distance = LocationService.calculateDistance(location, location);

      expect(distance).toBe(0);
    });

    it('should calculate large distances correctly', () => {
      const nyc: UserLocation = { latitude: 40.7128, longitude: -74.0060 };
      const la: UserLocation = { latitude: 34.0522, longitude: -118.2437 };

      const distance = LocationService.calculateDistance(nyc, la);

      expect(distance).toBeGreaterThan(3000); // Should be > 3000km
      expect(distance).toBeLessThan(5000); // Should be < 5000km
    });

    it('should handle edge coordinates', () => {
      const northPole: UserLocation = { latitude: 90, longitude: 0 };
      const southPole: UserLocation = { latitude: -90, longitude: 0 };

      const distance = LocationService.calculateDistance(northPole, southPole);

      expect(distance).toBeCloseTo(20015, 0); // Approximately half Earth's circumference
    });
  });

  describe('isLocationWithinRadius', () => {
    it('should return true for locations within radius', () => {
      const center: UserLocation = { latitude: 40.7128, longitude: -74.0060 };
      const nearby: UserLocation = { latitude: 40.7589, longitude: -73.9851 }; // ~5km away

      const result = LocationService.isLocationWithinRadius(center, nearby, 10);

      expect(result).toBe(true);
    });

    it('should return false for locations outside radius', () => {
      const center: UserLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const distant: UserLocation = { latitude: 34.0522, longitude: -118.2437 }; // LA

      const result = LocationService.isLocationWithinRadius(center, distant, 1000);

      expect(result).toBe(false);
    });

    it('should return true for exact same location', () => {
      const location: UserLocation = { latitude: 40.7128, longitude: -74.0060 };

      const result = LocationService.isLocationWithinRadius(location, location, 1);

      expect(result).toBe(true);
    });

    it('should handle zero radius', () => {
      const center: UserLocation = { latitude: 40.7128, longitude: -74.0060 };
      const nearby: UserLocation = { latitude: 40.7129, longitude: -74.0061 }; // Very close

      const result = LocationService.isLocationWithinRadius(center, nearby, 0);

      expect(result).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle invalid coordinates in distance calculation', () => {
      const invalidLocation1: UserLocation = { latitude: NaN, longitude: -74.0060 };
      const validLocation2: UserLocation = { latitude: 40.7589, longitude: -73.9851 };

      const distance = LocationService.calculateDistance(invalidLocation1, validLocation2);

      expect(distance).toBeNaN();
    });

    it('should handle null/undefined locations gracefully', () => {
      const location: UserLocation = { latitude: 40.7128, longitude: -74.0060 };

      expect(() => {
        LocationService.calculateDistance(null as any, location);
      }).toThrow();

      expect(() => {
        LocationService.calculateDistance(location, undefined as any);
      }).toThrow();
    });

    it('should handle extreme latitude/longitude values', () => {
      const extreme1: UserLocation = { latitude: 180, longitude: 360 }; // Invalid
      const extreme2: UserLocation = { latitude: -180, longitude: -360 }; // Invalid

      // Should not throw, but may return unexpected results
      const distance = LocationService.calculateDistance(extreme1, extreme2);
      expect(typeof distance).toBe('number');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete location workflow', async () => {
      // Mock permission granted
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted'
      });

      // Mock location retrieval
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([mockGeocodingResult]);

      // Mock database update
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        update: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => ({
          data: { id: 'user-1' },
          error: null
        }))
      };
      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      // Execute workflow
      const hasPermission = await LocationService.requestLocationPermission();
      expect(hasPermission).toBe(true);

      const currentLocation = await LocationService.getCurrentLocation();
      expect(currentLocation).toBeDefined();

      await LocationService.updateUserLocation('user-1', currentLocation);

      // Verify all steps were executed
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(mockSupabaseChain.update).toHaveBeenCalled();
    });

    it('should handle permission denied gracefully', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied'
      });

      const hasPermission = await LocationService.requestLocationPermission();
      expect(hasPermission).toBe(false);

      // Should not attempt to get location without permission
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });
  });
});