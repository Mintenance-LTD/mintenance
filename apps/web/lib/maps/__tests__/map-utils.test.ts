import {
  calculateDistance,
  calculateBounds,
  isPointInServiceArea,
} from '../map-utils';

describe('Map Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // London to Paris (approximately 344 km)
      const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);

      // Allow 5km margin of error
      expect(distance).toBeGreaterThan(339);
      expect(distance).toBeLessThan(349);
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);

      expect(distance).toBe(0);
    });

    it('should calculate distance for antipodal points', () => {
      // Approximately half Earth's circumference
      const distance = calculateDistance(0, 0, 0, 180);

      // Half of Earth's circumference is ~20,000 km
      expect(distance).toBeGreaterThan(19900);
      expect(distance).toBeLessThan(20100);
    });
  });

  describe('calculateBounds', () => {
    let mockExtend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockExtend = vi.fn();

      // Must use function (not arrow) so it can be called with `new`
      function MockLatLngBounds() {
        return { extend: mockExtend };
      }
      function MockLatLng(lat: number, lng: number) {
        return { lat, lng };
      }

      vi.stubGlobal('google', {
        maps: {
          LatLngBounds: MockLatLngBounds,
          LatLng: MockLatLng,
        },
      });
    });

    it('should calculate bounds for multiple points', () => {
      const points = [
        { lat: 51.5074, lng: -0.1278 }, // London
        { lat: 48.8566, lng: 2.3522 },  // Paris
        { lat: 52.5200, lng: 13.4050 }, // Berlin
      ];

      const bounds = calculateBounds(points);

      expect(bounds).toBeDefined();
      expect(bounds).not.toBeNull();
      expect(mockExtend).toHaveBeenCalledTimes(3);
    });

    it('should return null for empty array', () => {
      const bounds = calculateBounds([]);

      expect(bounds).toBeNull();
    });

    it('should handle single point', () => {
      const points = [{ lat: 51.5074, lng: -0.1278 }];

      const bounds = calculateBounds(points);

      expect(bounds).toBeDefined();
      expect(mockExtend).toHaveBeenCalledTimes(1);
    });
  });

  describe('isPointInServiceArea', () => {
    it('should detect point inside service area', () => {
      // Very close to center - well within 10km radius
      const isInside = isPointInServiceArea(51.5100, -0.1300, 51.5074, -0.1278, 10);

      expect(isInside).toBe(true);
    });

    it('should detect point outside service area', () => {
      // London to Paris (~344km) - outside 100km radius
      const isInside = isPointInServiceArea(48.8566, 2.3522, 51.5074, -0.1278, 100);

      expect(isInside).toBe(false);
    });

    it('should handle point near circle edge', () => {
      // ~111.19km away (1 degree of latitude)
      // Use radius of 112 to ensure the point is just inside
      const isInside = isPointInServiceArea(1, 0, 0, 0, 112);

      expect(isInside).toBe(true);
    });
  });
});
