import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateDistance,
  calculateBounds,
  isPointInCircle,
} from '../map-utils';

describe('Map Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // London to Paris (approximately 344 km)
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      
      const distance = calculateDistance(london, paris);
      
      // Allow 5km margin of error
      expect(distance).toBeGreaterThan(339);
      expect(distance).toBeLessThan(349);
    });

    it('should return 0 for same location', () => {
      const location = { lat: 51.5074, lng: -0.1278 };
      
      const distance = calculateDistance(location, location);
      
      expect(distance).toBe(0);
    });

    it('should calculate distance for antipodal points', () => {
      // Approximately half Earth's circumference
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 0, lng: 180 };
      
      const distance = calculateDistance(point1, point2);
      
      // Half of Earth's circumference is ~20,000 km
      expect(distance).toBeGreaterThan(19900);
      expect(distance).toBeLessThan(20100);
    });
  });

  describe('calculateBounds', () => {
    it('should calculate bounds for multiple points', () => {
      const points = [
        { lat: 51.5074, lng: -0.1278 }, // London
        { lat: 48.8566, lng: 2.3522 },  // Paris
        { lat: 52.5200, lng: 13.4050 }, // Berlin
      ];
      
      const bounds = calculateBounds(points);
      
      expect(bounds).toBeDefined();
      expect(bounds?.north).toBeGreaterThan(52);
      expect(bounds?.south).toBeLessThan(49);
      expect(bounds?.east).toBeGreaterThan(13);
      expect(bounds?.west).toBeLessThan(0);
    });

    it('should return null for empty array', () => {
      const bounds = calculateBounds([]);
      
      expect(bounds).toBeNull();
    });

    it('should handle single point', () => {
      const points = [{ lat: 51.5074, lng: -0.1278 }];
      
      const bounds = calculateBounds(points);
      
      expect(bounds).toBeDefined();
      expect(bounds?.north).toBe(51.5074);
      expect(bounds?.south).toBe(51.5074);
      expect(bounds?.east).toBe(-0.1278);
      expect(bounds?.west).toBe(-0.1278);
    });
  });

  describe('isPointInCircle', () => {
    it('should detect point inside circle', () => {
      const center = { lat: 51.5074, lng: -0.1278 };
      const point = { lat: 51.5100, lng: -0.1300 }; // Very close to center
      const radius = 10; // 10km radius
      
      const isInside = isPointInCircle(point, center, radius);
      
      expect(isInside).toBe(true);
    });

    it('should detect point outside circle', () => {
      const center = { lat: 51.5074, lng: -0.1278 }; // London
      const point = { lat: 48.8566, lng: 2.3522 }; // Paris (~344km away)
      const radius = 100; // 100km radius
      
      const isInside = isPointInCircle(point, center, radius);
      
      expect(isInside).toBe(false);
    });

    it('should handle point exactly on circle edge', () => {
      const center = { lat: 0, lng: 0 };
      const point = { lat: 1, lng: 0 }; // ~111km away
      const radius = 111; // Exactly at edge
      
      const isInside = isPointInCircle(point, center, radius);
      
      // Should be true or very close
      expect(isInside).toBe(true);
    });
  });
});

