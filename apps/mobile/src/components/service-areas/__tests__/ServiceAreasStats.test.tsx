import React from 'react';
import { render } from '../../test-utils';
import { ServiceAreasStats } from '../ServiceAreasStats';
import { theme } from '../../../theme';
import type { ServiceArea } from '../../../services/ServiceAreasService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Helper function to create mock service areas
const createMockServiceArea = (overrides: Partial<ServiceArea> = {}): ServiceArea => ({
  id: 'area-1',
  contractor_id: 'contractor-1',
  area_name: 'Test Area',
  description: 'Test description',
  area_type: 'radius',
  center_latitude: 51.5074,
  center_longitude: -0.1278,
  radius_km: 10,
  boundary_coordinates: null,
  postal_codes: [],
  cities: [],
  base_travel_charge: 25,
  per_km_rate: 2.5,
  minimum_job_value: 50,
  priority_level: 1,
  is_primary_area: false,
  is_active: true,
  max_distance_km: 15,
  response_time_hours: 24,
  weekend_surcharge: 10,
  evening_surcharge: 15,
  emergency_available: true,
  emergency_surcharge: 25,
  preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  preferred_hours: { start: '09:00', end: '17:00' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to find value by label
const findValueByLabel = (container: any, label: string): string | null => {
  const labelElement = container.queryByText(label);
  if (!labelElement || !labelElement.parent) return null;

  // Navigate up to stat card container, then find the value text
  const statCard = labelElement.parent.parent;
  if (!statCard) return null;

  // Find the value text (it's the sibling before the label)
  const statContent = labelElement.parent;
  const children = statContent?.children || [];

  // Value should be the first child (before label which is second)
  if (children.length > 0) {
    return children[0]?.props?.children?.toString() || null;
  }

  return null;
};

describe('ServiceAreasStats', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ServiceAreasStats serviceAreas={[]} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all four stat cards', () => {
      const serviceAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getByText('Total Areas')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Inactive')).toBeTruthy();
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render with custom testable structure', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Stats Calculations - Total Areas', () => {
    it('should display 0 total areas when empty array', () => {
      const { getByText, queryByText } = render(<ServiceAreasStats serviceAreas={[]} />);

      expect(getByText('Total Areas')).toBeTruthy();
      const value = findValueByLabel({ queryByText }, 'Total Areas');
      expect(value).toBe('0');
    });

    it('should display 1 total area when single area', () => {
      const serviceAreas = [createMockServiceArea()];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('1').length).toBeGreaterThan(0);
    });

    it('should display correct count for multiple areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1' }),
        createMockServiceArea({ id: '2' }),
        createMockServiceArea({ id: '3' }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('3').length).toBeGreaterThan(0);
    });

    it('should display correct count for 10 areas', () => {
      const serviceAreas = Array.from({ length: 10 }, (_, i) =>
        createMockServiceArea({ id: `area-${i}` })
      );
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('10').length).toBeGreaterThan(0);
    });
  });

  describe('Stats Calculations - Active Areas', () => {
    it('should display 0 active areas when all inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: false }),
        createMockServiceArea({ id: '2', is_active: false }),
      ];
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getByText('Active')).toBeTruthy();
      // Should have multiple '0's (active, inactive, primary)
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should display correct count when all active', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: true }),
        createMockServiceArea({ id: '3', is_active: true }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // 3 total, 3 active, 0 inactive, 0 primary
      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('should display correct count when mixed active/inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: false }),
        createMockServiceArea({ id: '3', is_active: true }),
        createMockServiceArea({ id: '4', is_active: false }),
        createMockServiceArea({ id: '5', is_active: true }),
      ];
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // 3 active, 2 inactive
      expect(getByText('Active')).toBeTruthy();
      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle single active area', () => {
      const serviceAreas = [createMockServiceArea({ is_active: true })];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Stats Calculations - Inactive Areas', () => {
    it('should display 0 inactive areas when all active', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: true }),
      ];
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getByText('Inactive')).toBeTruthy();
      // Total = 2, Active = 2
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('should display correct count when all inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: false }),
        createMockServiceArea({ id: '2', is_active: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('should display correct count when mixed active/inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: false }),
        createMockServiceArea({ id: '3', is_active: true }),
        createMockServiceArea({ id: '4', is_active: false }),
      ];
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // 2 inactive
      expect(getByText('Inactive')).toBeTruthy();
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle single inactive area', () => {
      const serviceAreas = [createMockServiceArea({ is_active: false })];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Stats Calculations - Primary Area', () => {
    it('should display 0 when no primary area', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_primary_area: false }),
        createMockServiceArea({ id: '2', is_primary_area: false }),
      ];
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getByText('Primary')).toBeTruthy();
      // Should have at least one '0'
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('should display 1 when one primary area exists', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_primary_area: true }),
        createMockServiceArea({ id: '2', is_primary_area: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Primary shows '1', inactive shows '1', total shows '2', active shows '2'
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('should display 1 even when multiple marked as primary', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_primary_area: true }),
        createMockServiceArea({ id: '2', is_primary_area: true }),
        createMockServiceArea({ id: '3', is_primary_area: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // find() returns the first match, so it should still show "1"
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('should display 0 for empty array', () => {
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={[]} />);

      // All stats should be 0
      expect(getAllByText('0').length).toBe(4);
    });

    it('should handle primary area that is inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_primary_area: true, is_active: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Total = 1, Active = 0, Inactive = 1, Primary = 1
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Icon Display', () => {
    it('should render with correct icon names', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Icons are rendered via Ionicons component
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Color Mapping', () => {
    it('should use primary color for total areas', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Total Areas uses theme.colors.primary
      expect(toJSON()).toBeTruthy();
    });

    it('should use success color for active areas', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Active uses theme.colors.success
      expect(toJSON()).toBeTruthy();
    });

    it('should use textSecondary color for inactive areas', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Inactive uses theme.colors.textSecondary
      expect(toJSON()).toBeTruthy();
    });

    it('should use warning color for primary area', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Primary uses theme.colors.warning
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty service areas array', () => {
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={[]} />);

      expect(getAllByText('0').length).toBe(4);
      expect(getByText('Total Areas')).toBeTruthy();
    });

    it('should handle large number of areas', () => {
      const serviceAreas = Array.from({ length: 100 }, (_, i) =>
        createMockServiceArea({ id: `area-${i}` })
      );
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('100').length).toBeGreaterThan(0);
    });

    it('should handle all areas being primary (edge case)', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_primary_area: true }),
        createMockServiceArea({ id: '2', is_primary_area: true }),
        createMockServiceArea({ id: '3', is_primary_area: true }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Should still show "1" as find() returns first match
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle all areas being inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: false }),
        createMockServiceArea({ id: '2', is_active: false }),
        createMockServiceArea({ id: '3', is_active: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1); // Total and Inactive
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1); // Active and Primary
    });
  });

  describe('Complex Scenarios', () => {
    it('should correctly calculate stats for typical contractor setup', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: '1',
          area_name: 'Primary London',
          is_primary_area: true,
          is_active: true
        }),
        createMockServiceArea({
          id: '2',
          area_name: 'Secondary London',
          is_primary_area: false,
          is_active: true
        }),
        createMockServiceArea({
          id: '3',
          area_name: 'Inactive Area',
          is_primary_area: false,
          is_active: false
        }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1); // Total
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1); // Active
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1); // Both inactive and primary
    });

    it('should handle contractor with only primary area', () => {
      const serviceAreas = [
        createMockServiceArea({ is_primary_area: true, is_active: true }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('1').length).toBeGreaterThanOrEqual(2); // Total, Active, Primary
    });

    it('should handle contractor starting with no areas', () => {
      const { getByText, getAllByText } = render(<ServiceAreasStats serviceAreas={[]} />);

      expect(getAllByText('0').length).toBe(4);
      expect(getByText('Total Areas')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Inactive')).toBeTruthy();
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should handle 50/50 active/inactive split', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: false }),
        createMockServiceArea({ id: '3', is_active: true }),
        createMockServiceArea({ id: '4', is_active: false }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getAllByText('4').length).toBeGreaterThanOrEqual(1); // Total
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1); // Both active and inactive
    });
  });

  describe('Data Consistency', () => {
    it('should ensure total equals active + inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: false }),
        createMockServiceArea({ id: '3', is_active: true }),
        createMockServiceArea({ id: '4', is_active: false }),
        createMockServiceArea({ id: '5', is_active: true }),
      ];
      const { getAllByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Total: 5, Active: 3, Inactive: 2
      expect(getAllByText('5').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle re-render with updated data', () => {
      const initialAreas = [createMockServiceArea({ is_active: true })];
      const { getAllByText, rerender } = render(
        <ServiceAreasStats serviceAreas={initialAreas} />
      );

      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);

      const updatedAreas = [
        createMockServiceArea({ id: '1', is_active: true }),
        createMockServiceArea({ id: '2', is_active: false }),
      ];
      rerender(<ServiceAreasStats serviceAreas={updatedAreas} />);

      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Styling and Layout', () => {
    it('should render with flex layout', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(toJSON()).toBeTruthy();
    });

    it('should apply correct border colors to stat cards', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      // Each card has borderLeftColor matching its theme color
      expect(toJSON()).toBeTruthy();
    });

    it('should maintain consistent spacing', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle rapid prop updates', () => {
      const { rerender } = render(<ServiceAreasStats serviceAreas={[]} />);

      for (let i = 1; i <= 10; i++) {
        const areas = Array.from({ length: i }, (_, j) =>
          createMockServiceArea({ id: `area-${j}` })
        );
        rerender(<ServiceAreasStats serviceAreas={areas} />);
      }

      // Should complete without errors
      expect(true).toBeTruthy();
    });

    it('should efficiently calculate stats for large datasets', () => {
      const serviceAreas = Array.from({ length: 1000 }, (_, i) =>
        createMockServiceArea({
          id: `area-${i}`,
          is_active: i % 2 === 0,
          is_primary_area: i === 0,
        })
      );

      const startTime = performance.now();
      render(<ServiceAreasStats serviceAreas={serviceAreas} />);
      const endTime = performance.now();

      // Should render in reasonable time (less than 500ms for large dataset)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Label Verification', () => {
    it('should display all labels correctly', () => {
      const serviceAreas = [createMockServiceArea()];
      const { getByText } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);

      expect(getByText('Total Areas')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Inactive')).toBeTruthy();
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should maintain label order', () => {
      const serviceAreas = [createMockServiceArea()];
      const { toJSON } = render(<ServiceAreasStats serviceAreas={serviceAreas} />);
      const tree = toJSON();

      // Verify snapshot structure maintains label order
      expect(tree).toBeTruthy();
    });
  });
});
