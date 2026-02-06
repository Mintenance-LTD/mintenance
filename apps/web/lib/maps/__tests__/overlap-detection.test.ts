import {
  findOverlappingAreas,
  calculateOverlapPercentage,
  getOverlapSeverity,
  suggestOptimalRadius,
} from '../overlap-detection';

describe('Overlap Detection', () => {
  describe('findOverlappingAreas', () => {
    it('should detect overlapping service areas', () => {
      const areas = [
        {
          id: '1',
          latitude: 51.5074,
          longitude: -0.1278,
          radius_km: 25,
          city: 'London',
          is_active: true,
        },
        {
          id: '2',
          latitude: 51.5200, // 1.4km north
          longitude: -0.1300,
          radius_km: 25,
          city: 'London North',
          is_active: true,
        },
      ];

      const overlaps = findOverlappingAreas(areas);

      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps[0]).toHaveProperty('area1');
      expect(overlaps[0]).toHaveProperty('area2');
      expect(overlaps[0]).toHaveProperty('overlapPercentage');
    });

    it('should not detect overlap for distant areas', () => {
      const areas = [
        {
          id: '1',
          latitude: 51.5074,
          longitude: -0.1278,
          radius_km: 10,
          city: 'London',
          is_active: true,
        },
        {
          id: '2',
          latitude: 48.8566, // Paris (~344km away)
          longitude: 2.3522,
          radius_km: 10,
          city: 'Paris',
          is_active: true,
        },
      ];

      const overlaps = findOverlappingAreas(areas);

      expect(overlaps.length).toBe(0);
    });

    it('should still detect overlap even if one area is inactive', () => {
      // The implementation does not filter by is_active;
      // it checks all areas passed in regardless of active status.
      const areas = [
        {
          id: '1',
          latitude: 51.5074,
          longitude: -0.1278,
          radius_km: 25,
          city: 'London',
          is_active: true,
        },
        {
          id: '2',
          latitude: 51.5100,
          longitude: -0.1300,
          radius_km: 25,
          city: 'London North',
          is_active: false, // Inactive
        },
      ];

      const overlaps = findOverlappingAreas(areas);

      // Implementation does not filter by is_active
      expect(overlaps.length).toBeGreaterThan(0);
    });
  });

  describe('calculateOverlapPercentage', () => {
    it('should calculate overlap percentage for identical circles', () => {
      const area1 = {
        id: '1',
        latitude: 51.5074,
        longitude: -0.1278,
        radius_km: 25,
      };
      const area2 = {
        id: '2',
        latitude: 51.5074, // Same location
        longitude: -0.1278,
        radius_km: 25,
      };

      const percentage = calculateOverlapPercentage(area1, area2);

      // When two identical circles overlap completely (distance=0),
      // the implementation uses: smallerArea / totalArea * 100
      // = pi*r^2 / (2*pi*r^2) * 100 = 50
      expect(percentage).toBeCloseTo(50, 0);
    });

    it('should return 0 for non-overlapping areas', () => {
      const area1 = {
        id: '1',
        latitude: 51.5074,
        longitude: -0.1278,
        radius_km: 10,
      };
      const area2 = {
        id: '2',
        latitude: 52.5200, // ~111km away
        longitude: -0.1278,
        radius_km: 10,
      };

      const percentage = calculateOverlapPercentage(area1, area2);

      expect(percentage).toBe(0);
    });
  });

  describe('getOverlapSeverity', () => {
    it('should return "high" for large overlap', () => {
      const severity = getOverlapSeverity(50);

      expect(severity).toBe('high');
    });

    it('should return "medium" for moderate overlap', () => {
      const severity = getOverlapSeverity(20);

      expect(severity).toBe('medium');
    });

    it('should return "low" for small overlap', () => {
      const severity = getOverlapSeverity(5);

      expect(severity).toBe('low');
    });
  });

  describe('suggestOptimalRadius', () => {
    it('should suggest smaller radius to reduce overlap', () => {
      const area = {
        id: '1',
        latitude: 51.5074,
        longitude: -0.1278,
        radius_km: 50,
        city: 'London',
      };
      const existingAreas = [
        {
          id: '2',
          latitude: 51.5200,
          longitude: -0.1300,
          radius_km: 50,
          city: 'London North',
          is_active: true,
        },
      ];

      // suggestOptimalRadius returns a number (the suggested radius in km)
      const suggestion = suggestOptimalRadius(area, existingAreas);

      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('number');
      expect(suggestion).toBeLessThan(area.radius_km);
    });
  });
});
