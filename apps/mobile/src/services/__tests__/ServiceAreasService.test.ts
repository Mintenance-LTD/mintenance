/**
 * Unit tests for ServiceAreasService (validation + formatting helpers).
 *
 * validateServiceArea / formatServiceArea are pure logic. Externals mocked
 * only because the module re-exports ServiceAreasGeo (which pulls supabase
 * transitively); the helpers under test touch none of it.
 */
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ServiceAreasService, type ServiceArea } from '../ServiceAreasService';

const validRadius: Partial<ServiceArea> = {
  area_name: 'North London',
  area_type: 'radius',
  center_latitude: 51.5,
  center_longitude: -0.1,
  radius_km: 10,
  per_km_rate: 2,
  priority_level: 3,
};

describe('ServiceAreasService.validateServiceArea', () => {
  it('accepts a fully-valid radius area', async () => {
    const r = await ServiceAreasService.validateServiceArea(validRadius);
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('requires an area name (missing)', async () => {
    const { area_name, ...rest } = validRadius;
    void area_name;
    const r = await ServiceAreasService.validateServiceArea(rest);
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Area name is required');
  });

  it('rejects a whitespace-only area name', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      area_name: '   ',
    });
    expect(r.errors).toContain('Area name is required');
  });

  describe('radius area_type', () => {
    it('requires center coordinates', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'radius',
        radius_km: 5,
      });
      expect(r.errors).toContain(
        'Center coordinates are required for radius areas'
      );
    });

    it('requires a positive radius (missing)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'radius',
        center_latitude: 51,
        center_longitude: -0.1,
      });
      expect(r.errors).toContain('Radius must be greater than 0');
    });

    it('requires a positive radius (zero)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'radius',
        center_latitude: 51,
        center_longitude: -0.1,
        radius_km: 0,
      });
      expect(r.errors).toContain('Radius must be greater than 0');
    });
  });

  describe('postal_codes area_type', () => {
    it('requires at least one postal code (missing)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'postal_codes',
      });
      expect(r.errors).toContain('At least one postal code is required');
    });

    it('requires at least one postal code (empty array)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'postal_codes',
        postal_codes: [],
      });
      expect(r.errors).toContain('At least one postal code is required');
    });

    it('accepts a populated postal_codes list', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'postal_codes',
        postal_codes: ['N1', 'N2'],
      });
      expect(r.isValid).toBe(true);
    });
  });

  describe('cities area_type', () => {
    it('requires at least one city (missing)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'cities',
      });
      expect(r.errors).toContain('At least one city is required');
    });

    it('requires at least one city (empty array)', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'cities',
        cities: [],
      });
      expect(r.errors).toContain('At least one city is required');
    });

    it('accepts a populated cities list', async () => {
      const r = await ServiceAreasService.validateServiceArea({
        area_name: 'A',
        area_type: 'cities',
        cities: ['London'],
      });
      expect(r.isValid).toBe(true);
    });
  });

  it('rejects a negative per-km rate', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      per_km_rate: -1,
    });
    expect(r.errors).toContain('Per-km rate cannot be negative');
  });

  it('ignores a zero per-km rate (falsy, skipped)', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      per_km_rate: 0,
    });
    expect(r.errors).not.toContain('Per-km rate cannot be negative');
  });

  it('rejects priority_level below 1', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      priority_level: 0.5,
    });
    expect(r.errors).toContain('Priority level must be between 1 and 5');
  });

  it('rejects priority_level above 5', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      priority_level: 6,
    });
    expect(r.errors).toContain('Priority level must be between 1 and 5');
  });

  it('accepts priority_level within 1-5', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      ...validRadius,
      priority_level: 5,
    });
    expect(r.isValid).toBe(true);
  });

  it('accumulates multiple errors', async () => {
    const r = await ServiceAreasService.validateServiceArea({
      area_type: 'radius',
      per_km_rate: -2,
      priority_level: 9,
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ServiceAreasService.formatServiceArea', () => {
  it('passes a populated object through as a ServiceArea', () => {
    const input = { id: 'a1', area_name: 'X' };
    expect(ServiceAreasService.formatServiceArea(input)).toBe(input);
  });

  it('throws on null', () => {
    expect(() => ServiceAreasService.formatServiceArea(null)).toThrow(
      'Service area data cannot be null or undefined'
    );
  });

  it('throws on undefined', () => {
    expect(() => ServiceAreasService.formatServiceArea(undefined)).toThrow(
      'Service area data cannot be null or undefined'
    );
  });
});

describe('geo utility re-exports', () => {
  it('exposes the delegated geo helpers as static members', () => {
    expect(typeof ServiceAreasService.calculateDistance).toBe('function');
    expect(typeof ServiceAreasService.haversineDistance).toBe('function');
    expect(typeof ServiceAreasService.isLocationInServiceArea).toBe('function');
    expect(typeof ServiceAreasService.findContractorsForLocation).toBe(
      'function'
    );
    expect(typeof ServiceAreasService.calculateTravelCharge).toBe('function');
  });
});
