import { LocationPricingService } from '../LocationPricingService';

// Mock fetch for postcodes.io API
global.fetch = jest.fn();

describe('LocationPricingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationPricingService.clearCaches();
  });

  afterEach(() => {
    LocationPricingService.clearCaches();
  });

  describe('getLocationFactor', () => {
    describe('Postcode-based pricing', () => {
      it('should return high multiplier for central London postcode', async () => {
        // Mock postcodes.io API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: 'SW1A 1AA',
              region: 'London',
              admin_district: 'Westminster',
              latitude: 51.5014,
              longitude: -0.1419,
              country: 'England',
            },
          }),
        });

        const factor = await LocationPricingService.getLocationFactor('SW1A 1AA');

        // Westminster should have premium pricing (1.35)
        expect(factor).toBeGreaterThan(1.25);
        expect(factor).toBeLessThanOrEqual(1.35);
      });

      it('should return moderate multiplier for South East postcode', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: 'RG1 1AA',
              region: 'South East',
              admin_district: 'Reading',
              latitude: 51.4542,
              longitude: -0.9731,
              country: 'England',
            },
          }),
        });

        const factor = await LocationPricingService.getLocationFactor('Reading, RG1 1AA');

        // Reading should have moderate premium (1.15)
        expect(factor).toBeGreaterThan(1.10);
        expect(factor).toBeLessThanOrEqual(1.20);
      });

      it('should return low multiplier for North East postcode', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: 'NE1 1AA',
              region: 'North East',
              admin_district: 'Newcastle upon Tyne',
              latitude: 54.9783,
              longitude: -1.6178,
              country: 'England',
            },
          }),
        });

        const factor = await LocationPricingService.getLocationFactor('Newcastle, NE1 1AA');

        // North East should have discount (0.90)
        expect(factor).toBeLessThan(1.0);
        expect(factor).toBeGreaterThanOrEqual(0.85);
      });

      it('should handle postcode without spaces', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: 'M1 1AA',
              region: 'North West',
              admin_district: 'Manchester',
              latitude: 53.4808,
              longitude: -2.2426,
              country: 'England',
            },
          }),
        });

        const factor = await LocationPricingService.getLocationFactor('M11AA');

        // Manchester should be slightly above average (1.05)
        expect(factor).toBeGreaterThan(0.95);
        expect(factor).toBeLessThanOrEqual(1.10);
      });

      it('should use postcode area fallback when API fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        const factor = await LocationPricingService.getLocationFactor('SW1 1AA');

        // Should use postcode area multiplier for SW1 (1.35)
        expect(factor).toBeGreaterThan(1.25);
      });
    });

    describe('City-based pricing', () => {
      it('should detect London and apply premium', async () => {
        const factor = await LocationPricingService.getLocationFactor('London, UK');
        expect(factor).toBe(1.30);
      });

      it('should detect Birmingham and apply multiplier', async () => {
        const factor = await LocationPricingService.getLocationFactor('Birmingham, West Midlands');
        expect(factor).toBe(1.02);
      });

      it('should detect Brighton and apply premium', async () => {
        const factor = await LocationPricingService.getLocationFactor('Brighton, East Sussex');
        expect(factor).toBe(1.20);
      });

      it('should detect Edinburgh and apply premium', async () => {
        const factor = await LocationPricingService.getLocationFactor('Edinburgh, Scotland');
        expect(factor).toBe(1.08);
      });

      it('should detect Cardiff and apply national average', async () => {
        const factor = await LocationPricingService.getLocationFactor('Cardiff, Wales');
        expect(factor).toBe(1.00);
      });
    });

    describe('Region-based pricing', () => {
      it('should detect Greater London region', async () => {
        const factor = await LocationPricingService.getLocationFactor('Greater London');
        expect(factor).toBe(1.30);
      });

      it('should detect South East region', async () => {
        const factor = await LocationPricingService.getLocationFactor('South East England');
        expect(factor).toBe(1.15);
      });

      it('should detect Yorkshire region', async () => {
        const factor = await LocationPricingService.getLocationFactor('Yorkshire and The Humber');
        expect(factor).toBe(0.95);
      });

      it('should detect Scotland region', async () => {
        const factor = await LocationPricingService.getLocationFactor('Scotland');
        expect(factor).toBe(1.00);
      });

      it('should detect Wales region', async () => {
        const factor = await LocationPricingService.getLocationFactor('Wales');
        expect(factor).toBe(0.95);
      });
    });

    describe('Fallback behavior', () => {
      it('should return 1.0 for empty location', async () => {
        const factor = await LocationPricingService.getLocationFactor('');
        expect(factor).toBe(1.0);
      });

      it('should return 1.0 for unknown location', async () => {
        const factor = await LocationPricingService.getLocationFactor('Unknown Place, Nowhere');
        expect(factor).toBe(1.0);
      });

      it('should return 1.0 on API error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
        const factor = await LocationPricingService.getLocationFactor('Test Location');
        expect(factor).toBe(1.0);
      });
    });

    describe('Caching', () => {
      it('should cache location factors', async () => {
        const factor1 = await LocationPricingService.getLocationFactor('London');
        const factor2 = await LocationPricingService.getLocationFactor('London');

        expect(factor1).toBe(factor2);
        expect(factor1).toBe(1.30);
      });

      it('should cache postcode lookups', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: 'SW1A 1AA',
              region: 'London',
              admin_district: 'Westminster',
              latitude: 51.5014,
              longitude: -0.1419,
              country: 'England',
            },
          }),
        });

        await LocationPricingService.getLocationFactor('SW1A 1AA');
        await LocationPricingService.getLocationFactor('SW1A 1AA');

        // Should only call API once due to caching
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should provide cache statistics', () => {
        const stats = LocationPricingService.getCacheStats();
        expect(stats).toHaveProperty('postcode');
        expect(stats).toHaveProperty('region');
      });
    });
  });

  describe('getLocationData', () => {
    it('should return comprehensive location data for valid postcode', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            region: 'London',
            admin_district: 'Westminster',
            latitude: 51.5014,
            longitude: -0.1419,
            country: 'England',
          },
        }),
      });

      const data = await LocationPricingService.getLocationData('SW1A1AA');

      expect(data).not.toBeNull();
      expect(data?.postcode).toBe('SW1A 1AA');
      expect(data?.region).toBe('London');
      expect(data?.costOfLivingIndex).toBeGreaterThan(1.0);
      expect(data?.laborRateMultiplier).toBeGreaterThan(1.0);
      expect(data?.materialCostMultiplier).toBeGreaterThan(1.0);
      expect(data?.confidenceScore).toBeGreaterThan(0.8);
    });

    it('should return null for invalid postcode', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const data = await LocationPricingService.getLocationData('INVALID');
      expect(data).toBeNull();
    });

    it('should prefer city multipliers over regional multipliers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'BN1 1AA',
            region: 'South East',
            admin_district: 'Brighton',
            latitude: 50.8225,
            longitude: -0.1372,
            country: 'England',
          },
        }),
      });

      const data = await LocationPricingService.getLocationData('BN1 1AA');

      // Brighton city multiplier (1.20) should override South East region (1.15)
      expect(data?.costOfLivingIndex).toBe(1.20);
    });
  });

  describe('Postcode extraction and normalization', () => {
    it('should extract postcode from location string', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'M1 1AA',
            region: 'North West',
            admin_district: 'Manchester',
            latitude: 53.4808,
            longitude: -2.2426,
            country: 'England',
          },
        }),
      });

      const factor = await LocationPricingService.getLocationFactor('123 Main Street, Manchester, M1 1AA');
      expect(factor).toBeGreaterThan(0.95);
    });

    it('should normalize postcode format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            region: 'London',
            latitude: 51.5014,
            longitude: -0.1419,
            country: 'England',
          },
        }),
      });

      // Test various formats
      await LocationPricingService.getLocationFactor('sw1a1aa'); // No space, lowercase
      await LocationPricingService.getLocationFactor('SW1A1AA'); // No space, uppercase
      await LocationPricingService.getLocationFactor('SW1A 1AA'); // With space

      // All should normalize to same format
      expect(global.fetch).toHaveBeenCalledTimes(1); // Cached after first call
    });
  });

  describe('Regional multiplier accuracy', () => {
    it('should have multipliers in valid range', async () => {
      const testLocations = [
        'London',
        'Manchester',
        'Birmingham',
        'Newcastle',
        'Brighton',
        'Edinburgh',
        'Cardiff',
        'Belfast',
      ];

      for (const location of testLocations) {
        const factor = await LocationPricingService.getLocationFactor(location);

        // All multipliers should be between 0.85 and 1.40
        expect(factor).toBeGreaterThanOrEqual(0.85);
        expect(factor).toBeLessThanOrEqual(1.40);
      }
    });

    it('should have London as highest multiplier', async () => {
      const londonFactor = await LocationPricingService.getLocationFactor('London');
      const manchesterFactor = await LocationPricingService.getLocationFactor('Manchester');
      const newcastleFactor = await LocationPricingService.getLocationFactor('Newcastle');

      expect(londonFactor).toBeGreaterThan(manchesterFactor);
      expect(manchesterFactor).toBeGreaterThanOrEqual(newcastleFactor);
    });

    it('should have North East as lowest multiplier', async () => {
      const northEastFactor = await LocationPricingService.getLocationFactor('North East');
      const londonFactor = await LocationPricingService.getLocationFactor('London');
      const midlandsFactor = await LocationPricingService.getLocationFactor('West Midlands');

      expect(northEastFactor).toBeLessThan(londonFactor);
      expect(northEastFactor).toBeLessThanOrEqual(midlandsFactor);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex location strings', async () => {
      const locations = [
        '10 Downing Street, Westminster, London, SW1A 2AA',
        'Brighton Marina, Brighton, East Sussex, BN2 5UF',
        'Flat 5, 123 High Street, Manchester, M1 1AA',
        'Edinburgh Castle, Edinburgh, Scotland, EH1 2NG',
      ];

      for (const location of locations) {
        (global.fetch as jest.Mock).mockClear();
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: location.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)?.[0],
              region: 'Test Region',
              latitude: 51.5,
              longitude: -0.1,
              country: 'England',
            },
          }),
        });

        const factor = await LocationPricingService.getLocationFactor(location);

        // Should successfully extract and process
        expect(factor).toBeGreaterThan(0.8);
        expect(factor).toBeLessThan(1.5);
      }
    });

    it('should handle mixed case and spacing variations', async () => {
      const variations = [
        'london',
        'LONDON',
        'London',
        '  London  ',
        'london, uk',
        'London, United Kingdom',
      ];

      for (const variation of variations) {
        const factor = await LocationPricingService.getLocationFactor(variation);
        expect(factor).toBe(1.30); // All should resolve to London multiplier
      }
    });
  });

  describe('Error handling', () => {
    it('should handle API timeout gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const factor = await LocationPricingService.getLocationFactor('SW1A 1AA');

      // Should fall back to postcode area or default
      expect(factor).toBeGreaterThan(0.8);
      expect(factor).toBeLessThan(1.5);
    });

    it('should handle malformed API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 500,
          error: 'Internal server error',
        }),
      });

      const factor = await LocationPricingService.getLocationFactor('SW1A 1AA');

      // Should use postcode area fallback
      expect(factor).toBeGreaterThan(0.8);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const factor = await LocationPricingService.getLocationFactor('Test Location');
      expect(factor).toBe(1.0); // Safe default
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            region: 'London',
            latitude: 51.5014,
            longitude: -0.1419,
            country: 'England',
          },
        }),
      });

      const promises = Array(10).fill(null).map(() =>
        LocationPricingService.getLocationFactor('London, SW1A 1AA')
      );

      const results = await Promise.all(promises);

      // All should return same result
      results.forEach(result => expect(result).toBe(1.30));

      // Note: Due to concurrent execution, multiple API calls might happen
      // before caching takes effect. The important thing is that all
      // subsequent calls will be cached.
      expect(global.fetch).toHaveBeenCalled();

      // Verify caching works for subsequent calls
      (global.fetch as jest.Mock).mockClear();
      await LocationPricingService.getLocationFactor('London, SW1A 1AA');
      expect(global.fetch).toHaveBeenCalledTimes(0); // Should use cache
    });
  });
});
