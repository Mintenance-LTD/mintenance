/**
 * Integration tests for PricingAgent with LocationPricingService
 *
 * Tests the end-to-end flow of location-based pricing adjustments
 */

import { PricingAgent } from '../PricingAgent';
import { LocationPricingService } from '../../location/LocationPricingService';

// Mock dependencies
jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        gte: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0 })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
  },
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch for postcodes.io
global.fetch = jest.fn();

describe('PricingAgent - Location Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationPricingService.clearCaches();
  });

  afterEach(() => {
    LocationPricingService.clearCaches();
  });

  describe('Location factor calculation', () => {
    it('should apply London premium to pricing recommendations', async () => {
      // Mock job in London
      const mockJob = {
        id: 'job-1',
        title: 'Plumbing repair',
        description: 'Fix leaking pipe',
        category: 'plumbing',
        budget: 500,
        location: 'London, SW1A 1AA',
        homeowner_id: 'user-1',
      };

      // Mock market data
      const mockBids = [
        { amount: 300 },
        { amount: 350 },
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'plumbing', location: 'London' },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-1' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

      // Mock postcodes.io API
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

      const recommendation = await PricingAgent.generateRecommendation('job-1');

      expect(recommendation).not.toBeNull();

      // Market median is 400 (middle of 300, 350, 400, 450, 500)
      // London multiplier is 1.30
      // Expected: 400 * 1.30 = 520 (plus other factors)
      const marketMedian = 400;
      const expectedMin = marketMedian * 1.20; // At least 20% premium
      const expectedMax = marketMedian * 1.50; // At most 50% premium

      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(expectedMin);
      expect(recommendation!.recommendedOptimalPrice).toBeLessThan(expectedMax);

      // Verify location factor was applied
      expect(recommendation!.factors.locationFactor).toBeGreaterThan(1.20);
      expect(recommendation!.factors.locationFactor).toBeLessThanOrEqual(1.35);

      // Reasoning should mention location
      expect(recommendation!.reasoning).toContain('location');
    });

    it('should apply North East discount to pricing recommendations', async () => {
      const mockJob = {
        id: 'job-2',
        title: 'Electrical work',
        description: 'Install new sockets',
        category: 'electrical',
        budget: 300,
        location: 'Newcastle, NE1 1AA',
        homeowner_id: 'user-2',
      };

      const mockBids = [
        { amount: 200 },
        { amount: 250 },
        { amount: 300 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'electrical', location: 'Newcastle' },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-2' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

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

      const recommendation = await PricingAgent.generateRecommendation('job-2');

      expect(recommendation).not.toBeNull();

      // Market median is 250
      // North East multiplier is 0.90
      // Expected: 250 * 0.90 = 225 (plus other factors)
      const marketMedian = 250;
      const expectedMin = marketMedian * 0.70; // At least 30% discount possible
      const expectedMax = marketMedian * 1.00; // At most national average

      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(expectedMin);
      expect(recommendation!.recommendedOptimalPrice).toBeLessThan(expectedMax);

      // Verify location factor was applied (discount)
      expect(recommendation!.factors.locationFactor).toBeLessThan(1.0);
      expect(recommendation!.factors.locationFactor).toBeGreaterThanOrEqual(0.85);
    });

    it('should handle multiple locations in same request', async () => {
      const locations = [
        { location: 'London, SW1A 1AA', expectedRange: [1.25, 1.35] },
        { location: 'Manchester, M1 1AA', expectedRange: [1.00, 1.10] },
        { location: 'Newcastle, NE1 1AA', expectedRange: [0.85, 0.95] },
        { location: 'Birmingham, B1 1AA', expectedRange: [0.95, 1.05] },
      ];

      for (const { location, expectedRange } of locations) {
        LocationPricingService.clearCaches();

        const mockJob = {
          id: `job-${location}`,
          title: 'Test job',
          description: 'Test',
          category: 'plumbing',
          budget: 500,
          location,
          homeowner_id: 'user-1',
        };

        const mockBids = [
          { amount: 400 },
          { amount: 450 },
          { amount: 500 },
        ];

        const { serverSupabase } = require('@/lib/api/supabaseServer');
        serverSupabase.from.mockImplementation((table: string) => {
          if (table === 'jobs') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
                })),
              })),
            };
          }
          if (table === 'bids') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: mockBids.map(b => ({
                        amount: b.amount,
                        jobs: { category: 'plumbing', location },
                      })),
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }
          if (table === 'pricing_recommendations') {
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: { id: `rec-${location}` }, error: null })),
                })),
              })),
            };
          }
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ count: 0 })),
                })),
              })),
            })),
          };
        });

        // Mock postcode API responses
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 200,
            result: {
              postcode: location.split(', ')[1] || location,
              region: location.includes('London') ? 'London' :
                      location.includes('Manchester') ? 'North West' :
                      location.includes('Newcastle') ? 'North East' :
                      'West Midlands',
              latitude: 51.5,
              longitude: -0.1,
              country: 'England',
            },
          }),
        });

        const recommendation = await PricingAgent.generateRecommendation(`job-${location}`);

        expect(recommendation).not.toBeNull();
        expect(recommendation!.factors.locationFactor).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(recommendation!.factors.locationFactor).toBeLessThanOrEqual(expectedRange[1]);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle missing location gracefully', async () => {
      const mockJob = {
        id: 'job-no-location',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: '',
        homeowner_id: 'user-1',
      };

      const mockBids = [
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'plumbing', location: '' },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-no-loc' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

      const recommendation = await PricingAgent.generateRecommendation('job-no-location');

      expect(recommendation).not.toBeNull();
      // Should use default location factor of 1.0
      expect(recommendation!.factors.locationFactor).toBe(1.0);
    });

    it('should handle invalid postcode format', async () => {
      const mockJob = {
        id: 'job-invalid-postcode',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'Some Place, INVALID123',
        homeowner_id: 'user-1',
      };

      const mockBids = [
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'plumbing', location: mockJob.location },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-invalid' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const recommendation = await PricingAgent.generateRecommendation('job-invalid-postcode');

      expect(recommendation).not.toBeNull();
      // Should fall back to default
      expect(recommendation!.factors.locationFactor).toBe(1.0);
    });

    it('should cap location factor within valid range', async () => {
      // Test that even if service returns extreme value, it's capped
      const mockJob = {
        id: 'job-cap-test',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'Test Location',
        homeowner_id: 'user-1',
      };

      const mockBids = [
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'plumbing', location: mockJob.location },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-cap' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

      const recommendation = await PricingAgent.generateRecommendation('job-cap-test');

      expect(recommendation).not.toBeNull();
      // Factor should be within 0.8 - 1.5 range
      expect(recommendation!.factors.locationFactor).toBeGreaterThanOrEqual(0.8);
      expect(recommendation!.factors.locationFactor).toBeLessThanOrEqual(1.5);
    });
  });

  describe('Performance', () => {
    it('should cache location lookups for performance', async () => {
      const mockJob = {
        id: 'job-cache-test',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'London, SW1A 1AA',
        homeowner_id: 'user-1',
      };

      const mockBids = [
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      const { serverSupabase } = require('@/lib/api/supabaseServer');
      serverSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: mockJob, error: null })),
              })),
            })),
          };
        }
        if (table === 'bids') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockBids.map(b => ({
                      amount: b.amount,
                      jobs: { category: 'plumbing', location: 'London' },
                    })),
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'pricing_recommendations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'rec-cache' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0 })),
              })),
            })),
          })),
        };
      });

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

      // Make two recommendations for same location
      await PricingAgent.generateRecommendation('job-cache-test');
      await PricingAgent.generateRecommendation('job-cache-test');

      // Should only call postcodes.io API once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
