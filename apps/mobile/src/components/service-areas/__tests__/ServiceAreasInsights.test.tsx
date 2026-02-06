
import React from 'react';
import { render } from '../../test-utils';
import { ServiceAreasInsights } from '../ServiceAreasInsights';
import type { ServiceArea } from '../../../services/ServiceAreasService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Helper function to create mock service area
const createMockServiceArea = (overrides: Partial<ServiceArea> = {}): ServiceArea => ({
  id: 'area-1',
  contractor_id: 'contractor-1',
  area_name: 'Central London',
  description: 'Main coverage area',
  area_type: 'radius',
  center_latitude: 51.5074,
  center_longitude: -0.1278,
  radius_km: 10,
  boundary_coordinates: null,
  postal_codes: [],
  cities: [],
  base_travel_charge: 25.50,
  per_km_rate: 1.50,
  minimum_job_value: 100,
  priority_level: 1,
  is_primary_area: false,
  is_active: true,
  max_distance_km: 20,
  response_time_hours: 24,
  weekend_surcharge: 10,
  evening_surcharge: 15,
  emergency_available: true,
  emergency_surcharge: 50,
  preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  preferred_hours: { start: '09:00', end: '17:00' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ServiceAreasInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // RENDERING TESTS
  // ==========================================

  describe('Rendering', () => {
    it('should render without crashing with valid data', () => {
      const mockAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render null when serviceAreas is empty array', () => {
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('should render Coverage Overview title', () => {
      const mockAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Coverage Overview')).toBeTruthy();
    });
  });

  // ==========================================
  // PRIMARY AREA DISPLAY TESTS
  // ==========================================

  describe('Primary Area Display', () => {
    it('should display primary area when one exists', () => {
      const mockAreas = [
        createMockServiceArea({ area_name: 'Primary Area', is_primary_area: true }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Primary area: Primary Area')).toBeTruthy();
    });

    it('should not display primary area section when none exists', () => {
      const mockAreas = [
        createMockServiceArea({ area_name: 'Regular Area', is_primary_area: false }),
      ];
      const { queryByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(queryByText(/Primary area:/)).toBeNull();
    });

    it('should display first primary area when multiple exist', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', area_name: 'First Primary', is_primary_area: true }),
        createMockServiceArea({ id: 'area-2', area_name: 'Second Primary', is_primary_area: true }),
      ];
      const { getByText, queryByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Primary area: First Primary')).toBeTruthy();
      expect(queryByText('Primary area: Second Primary')).toBeNull();
    });

    it('should handle area names with special characters', () => {
      const mockAreas = [
        createMockServiceArea({ area_name: "St. John's & O'Brien", is_primary_area: true }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText("Primary area: St. John's & O'Brien")).toBeTruthy();
    });

    it('should handle very long area names', () => {
      const longName = 'A'.repeat(100);
      const mockAreas = [
        createMockServiceArea({ area_name: longName, is_primary_area: true }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText(`Primary area: ${longName}`)).toBeTruthy();
    });
  });

  // ==========================================
  // AVERAGE RESPONSE TIME CALCULATION TESTS
  // ==========================================

  describe('Average Response Time Calculation', () => {
    it('should calculate average response time for single area', () => {
      const mockAreas = [createMockServiceArea({ response_time_hours: 24 })];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 24h')).toBeTruthy();
    });

    it('should calculate average response time for multiple areas', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', response_time_hours: 24 }),
        createMockServiceArea({ id: 'area-2', response_time_hours: 48 }),
        createMockServiceArea({ id: 'area-3', response_time_hours: 12 }),
      ];
      // Average: (24 + 48 + 12) / 3 = 28
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 28h')).toBeTruthy();
    });

    it('should round average response time to nearest integer', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', response_time_hours: 10 }),
        createMockServiceArea({ id: 'area-2', response_time_hours: 15 }),
      ];
      // Average: (10 + 15) / 2 = 12.5 → rounds to 13
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 13h')).toBeTruthy();
    });

    it('should handle response time of 0 hours', () => {
      const mockAreas = [
        createMockServiceArea({ response_time_hours: 0 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 0h')).toBeTruthy();
    });

    it('should handle very large response times', () => {
      const mockAreas = [
        createMockServiceArea({ response_time_hours: 168 }), // 1 week
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 168h')).toBeTruthy();
    });

    it('should round down when average is exactly 0.5', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', response_time_hours: 1 }),
        createMockServiceArea({ id: 'area-2', response_time_hours: 2 }),
      ];
      // Average: (1 + 2) / 2 = 1.5 → rounds to 2
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 2h')).toBeTruthy();
    });
  });

  // ==========================================
  // TOTAL TRAVEL CHARGES CALCULATION TESTS
  // ==========================================

  describe('Total Travel Charges Calculation', () => {
    it('should calculate total travel charges for single area', () => {
      const mockAreas = [createMockServiceArea({ base_travel_charge: 25.50 })];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £25.50 total')).toBeTruthy();
    });

    it('should calculate total travel charges for multiple areas', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', base_travel_charge: 25.50 }),
        createMockServiceArea({ id: 'area-2', base_travel_charge: 30.75 }),
        createMockServiceArea({ id: 'area-3', base_travel_charge: 15.25 }),
      ];
      // Total: 25.50 + 30.75 + 15.25 = 71.50
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £71.50 total')).toBeTruthy();
    });

    it('should format travel charges to 2 decimal places', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', base_travel_charge: 10.1 }),
        createMockServiceArea({ id: 'area-2', base_travel_charge: 20.2 }),
      ];
      // Total: 10.1 + 20.2 = 30.3 → should display as 30.30
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £30.30 total')).toBeTruthy();
    });

    it('should handle zero travel charges', () => {
      const mockAreas = [
        createMockServiceArea({ base_travel_charge: 0 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £0.00 total')).toBeTruthy();
    });

    it('should handle very large travel charges', () => {
      const mockAreas = [
        createMockServiceArea({ base_travel_charge: 9999.99 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £9999.99 total')).toBeTruthy();
    });

    it('should handle multiple areas with zero charges', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', base_travel_charge: 0 }),
        createMockServiceArea({ id: 'area-2', base_travel_charge: 0 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £0.00 total')).toBeTruthy();
    });

    it('should handle mixed zero and non-zero charges', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', base_travel_charge: 0 }),
        createMockServiceArea({ id: 'area-2', base_travel_charge: 50.50 }),
        createMockServiceArea({ id: 'area-3', base_travel_charge: 0 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £50.50 total')).toBeTruthy();
    });
  });

  // ==========================================
  // COMBINED DISPLAY TESTS
  // ==========================================

  describe('Combined Display', () => {
    it('should display all insights for single area with primary status', () => {
      const mockAreas = [
        createMockServiceArea({
          area_name: 'Main Area',
          is_primary_area: true,
          response_time_hours: 12,
          base_travel_charge: 35.99,
        }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Coverage Overview')).toBeTruthy();
      expect(getByText('Primary area: Main Area')).toBeTruthy();
      expect(getByText('Average response time: 12h')).toBeTruthy();
      expect(getByText('Base travel charges: £35.99 total')).toBeTruthy();
    });

    it('should display all insights for multiple areas', () => {
      const mockAreas = [
        createMockServiceArea({
          id: 'area-1',
          area_name: 'Primary Zone',
          is_primary_area: true,
          response_time_hours: 24,
          base_travel_charge: 25.00,
        }),
        createMockServiceArea({
          id: 'area-2',
          area_name: 'Secondary Zone',
          is_primary_area: false,
          response_time_hours: 48,
          base_travel_charge: 30.00,
        }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Coverage Overview')).toBeTruthy();
      expect(getByText('Primary area: Primary Zone')).toBeTruthy();
      expect(getByText('Average response time: 36h')).toBeTruthy(); // (24 + 48) / 2 = 36
      expect(getByText('Base travel charges: £55.00 total')).toBeTruthy(); // 25 + 30 = 55
    });

    it('should display insights without primary area', () => {
      const mockAreas = [
        createMockServiceArea({
          id: 'area-1',
          area_name: 'Zone A',
          is_primary_area: false,
          response_time_hours: 20,
          base_travel_charge: 40.00,
        }),
      ];
      const { getByText, queryByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Coverage Overview')).toBeTruthy();
      expect(queryByText(/Primary area:/)).toBeNull();
      expect(getByText('Average response time: 20h')).toBeTruthy();
      expect(getByText('Base travel charges: £40.00 total')).toBeTruthy();
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle single area with all minimum values', () => {
      const mockAreas = [
        createMockServiceArea({
          response_time_hours: 0,
          base_travel_charge: 0,
          is_primary_area: false,
        }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 0h')).toBeTruthy();
      expect(getByText('Base travel charges: £0.00 total')).toBeTruthy();
    });

    it('should handle single area with all maximum values', () => {
      const mockAreas = [
        createMockServiceArea({
          response_time_hours: 999,
          base_travel_charge: 9999.99,
          is_primary_area: true,
        }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 999h')).toBeTruthy();
      expect(getByText('Base travel charges: £9999.99 total')).toBeTruthy();
    });

    it('should handle floating point precision in calculations', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', base_travel_charge: 10.33 }),
        createMockServiceArea({ id: 'area-2', base_travel_charge: 20.33 }),
        createMockServiceArea({ id: 'area-3', base_travel_charge: 30.34 }),
      ];
      // Total: 10.33 + 20.33 + 30.34 = 61.00
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £61.00 total')).toBeTruthy();
    });

    it('should handle area with only required fields', () => {
      const mockAreas = [
        createMockServiceArea({
          description: undefined,
          max_distance_km: undefined,
        }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Coverage Overview')).toBeTruthy();
      expect(getByText(/Average response time:/)).toBeTruthy();
      expect(getByText(/Base travel charges:/)).toBeTruthy();
    });
  });

  // ==========================================
  // COMPONENT STRUCTURE TESTS
  // ==========================================

  describe('Component Structure', () => {
    it('should render insights container', () => {
      const mockAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree).toHaveProperty('type', 'View');
    });

    it('should render title with correct text', () => {
      const mockAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      const title = getByText('Coverage Overview');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Coverage Overview');
    });

    it('should always render response time insight', () => {
      const mockAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText(/Average response time:/)).toBeTruthy();
    });

    it('should always render travel charges insight', () => {
      const mockAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText(/Base travel charges:/)).toBeTruthy();
    });
  });

  // ==========================================
  // DATA VALIDATION TESTS
  // ==========================================

  describe('Data Validation', () => {
    it('should handle negative response time hours gracefully', () => {
      const mockAreas = [
        createMockServiceArea({ response_time_hours: -5 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      // Component doesn't validate, it just calculates
      expect(getByText('Average response time: -5h')).toBeTruthy();
    });

    it('should handle negative travel charges gracefully', () => {
      const mockAreas = [
        createMockServiceArea({ base_travel_charge: -10.50 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      // Component doesn't validate, it just calculates
      expect(getByText('Base travel charges: £-10.50 total')).toBeTruthy();
    });

    it('should handle very small decimal values', () => {
      const mockAreas = [
        createMockServiceArea({ base_travel_charge: 0.01 }),
      ];
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Base travel charges: £0.01 total')).toBeTruthy();
    });

    it('should handle fractional response times correctly', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', response_time_hours: 1 }),
        createMockServiceArea({ id: 'area-2', response_time_hours: 2 }),
        createMockServiceArea({ id: 'area-3', response_time_hours: 3 }),
      ];
      // Average: (1 + 2 + 3) / 3 = 2
      const { getByText } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(getByText('Average response time: 2h')).toBeTruthy();
    });
  });

  // ==========================================
  // SNAPSHOT TESTS
  // ==========================================

  describe('Snapshots', () => {
    it('should match snapshot with single area', () => {
      const mockAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with multiple areas', () => {
      const mockAreas = [
        createMockServiceArea({ id: 'area-1', area_name: 'Area 1', is_primary_area: true }),
        createMockServiceArea({ id: 'area-2', area_name: 'Area 2', is_primary_area: false }),
        createMockServiceArea({ id: 'area-3', area_name: 'Area 3', is_primary_area: false }),
      ];
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={mockAreas} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with empty array (null render)', () => {
      const { toJSON } = render(<ServiceAreasInsights serviceAreas={[]} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
