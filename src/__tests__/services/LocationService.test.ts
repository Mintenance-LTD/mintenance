import { LocationService } from '../../services/LocationService';
import * as Location from 'expo-location';
import { logger } from '../../utils/logger';

// Get mocked modules
const mockLocation = Location as jest.Mocked<typeof Location>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should return true when permission is granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(true);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false and log error when permission request fails', async () => {
      const error = new Error('Permission request failed');
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValueOnce(error);

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error requesting location permission:', error);
    });

    it('should handle undefined status gracefully', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });

      const result = await LocationService.requestLocationPermission();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('should return location with address when everything succeeds', async () => {
      // Mock permission granted
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Mock location coordinates
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10,
          accuracy: 10,
          altitudeAccuracy: 10,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      // Mock reverse geocoding
      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce([
        {
          streetNumber: '123',
          street: 'Main St',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94103',
          country: 'US',
        },
      ]);

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
      });

      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: mockLocation.LocationAccuracy.Balanced,
      });
    });

    it('should return location without address when reverse geocoding fails', async () => {
      // Mock permission granted
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Mock location coordinates
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10,
          accuracy: 10,
          altitudeAccuracy: 10,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      // Mock reverse geocoding failure
      mockLocation.reverseGeocodeAsync.mockRejectedValueOnce(new Error('Geocoding failed'));

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error reverse geocoding:',
        expect.any(Error)
      );
    });

    it('should return null when permission is denied', async () => {
      // Mock permission denied
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      const result = await LocationService.getCurrentLocation();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting current location:',
        expect.any(Error)
      );
    });

    it('should return null when location retrieval fails', async () => {
      // Mock permission granted
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Mock location failure
      const locationError = new Error('Location unavailable');
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(locationError);

      const result = await LocationService.getCurrentLocation();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting current location:',
        locationError
      );
    });

    it('should handle empty address components gracefully', async () => {
      // Mock permission granted
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Mock location coordinates
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10,
          accuracy: 10,
          altitudeAccuracy: 10,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      // Mock reverse geocoding with empty/null values
      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce([
        {
          streetNumber: null,
          street: '',
          city: 'San Francisco',
          region: null,
          postalCode: '94103',
          country: 'US',
        },
      ]);

      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        address: '',
        city: 'San Francisco',
        postalCode: '94103',
      });
    });
  });

  describe('reverseGeocode', () => {
    it('should return formatted address information', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce([
        {
          streetNumber: '456',
          street: 'Oak Ave',
          city: 'Berkeley',
          region: 'CA',
          postalCode: '94704',
          country: 'US',
        },
      ]);

      const result = await LocationService.reverseGeocode(37.8715, -122.2730);

      expect(result).toEqual({
        address: '456 Oak Ave',
        city: 'Berkeley',
        state: 'CA',
        postalCode: '94704',
      });

      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 37.8715,
        longitude: -122.2730,
      });
    });

    it('should return empty object when no results found', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce([]);

      const result = await LocationService.reverseGeocode(0, 0);

      expect(result).toEqual({});
    });

    it('should return empty object when reverse geocoding fails', async () => {
      const error = new Error('Reverse geocoding failed');
      mockLocation.reverseGeocodeAsync.mockRejectedValueOnce(error);

      const result = await LocationService.reverseGeocode(37.7749, -122.4194);

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith('Error reverse geocoding:', error);
    });

    it('should handle null results gracefully', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce(null);

      const result = await LocationService.reverseGeocode(37.7749, -122.4194);

      expect(result).toEqual({});
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between San Francisco and Berkeley (approximately 13.5 km)
      const distance = LocationService.calculateDistance(
        37.7749, -122.4194, // San Francisco
        37.8715, -122.2730  // Berkeley
      );

      expect(distance).toBeCloseTo(16.8, 0); // Within 1 km accuracy
    });

    it('should return 0 for identical coordinates', () => {
      const distance = LocationService.calculateDistance(
        37.7749, -122.4194,
        37.7749, -122.4194
      );

      expect(distance).toBeCloseTo(0, 3);
    });

    it('should handle coordinates on opposite sides of the world', () => {
      // Distance between San Francisco and Sydney (approximately 11,935 km)
      const distance = LocationService.calculateDistance(
        37.7749, -122.4194, // San Francisco
        -33.8688, 151.2093  // Sydney
      );

      expect(distance).toBeCloseTo(11935, -2); // Within 100 km accuracy for long distances
    });

    it('should handle edge cases with extreme coordinates', () => {
      // North pole to south pole
      const distance = LocationService.calculateDistance(90, 0, -90, 0);
      expect(distance).toBeCloseTo(20015, -2); // Approximately half Earth circumference
    });
  });

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      expect(LocationService.formatDistance(0.5)).toBe('500m away');
      expect(LocationService.formatDistance(0.123)).toBe('123m away');
      expect(LocationService.formatDistance(0.999)).toBe('999m away');
    });

    it('should format distances between 1-10km with 1 decimal place', () => {
      expect(LocationService.formatDistance(1.5)).toBe('1.5km away');
      expect(LocationService.formatDistance(5.67)).toBe('5.7km away');
      expect(LocationService.formatDistance(9.99)).toBe('10.0km away');
    });

    it('should format distances over 10km as rounded integers', () => {
      expect(LocationService.formatDistance(15.4)).toBe('15km away');
      expect(LocationService.formatDistance(99.7)).toBe('100km away');
      expect(LocationService.formatDistance(1234.56)).toBe('1235km away');
    });

    it('should handle edge cases', () => {
      expect(LocationService.formatDistance(0)).toBe('0m away');
      expect(LocationService.formatDistance(1.0)).toBe('1.0km away');
      expect(LocationService.formatDistance(10.0)).toBe('10km away');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle negative coordinates correctly', () => {
      const distance = LocationService.calculateDistance(
        -37.7749, -122.4194,
        -37.8715, -122.2730
      );
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle coordinates at the international date line', () => {
      const distance = LocationService.calculateDistance(
        0, 179,
        0, -179
      );
      expect(distance).toBeCloseTo(222, 0); // Approximately 222 km across date line
    });

    it('should handle very small distances accurately', () => {
      const distance = LocationService.calculateDistance(
        37.7749, -122.4194,
        37.7750, -122.4195
      );
      expect(distance).toBeLessThan(0.1); // Very small distance
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete location workflow with all services', async () => {
      // Setup mocks for complete workflow
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10,
          accuracy: 10,
          altitudeAccuracy: 10,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      mockLocation.reverseGeocodeAsync.mockResolvedValueOnce([
        {
          streetNumber: '100',
          street: 'Market St',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94105',
          country: 'US',
        },
      ]);

      const location = await LocationService.getCurrentLocation();
      
      expect(location).toBeTruthy();
      if (location) {
        const distance = LocationService.calculateDistance(
          location.latitude,
          location.longitude,
          37.8715, -122.2730 // Berkeley
        );
        
        const formattedDistance = LocationService.formatDistance(distance);
        
        expect(distance).toBeGreaterThan(0);
        expect(formattedDistance).toContain('away');
        expect(location.address).toBe('100 Market St');
        expect(location.city).toBe('San Francisco');
      }
    });
  });
});