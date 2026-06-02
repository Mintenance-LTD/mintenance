import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServiceAreasList } from '../ServiceAreasList';
import { ServiceArea } from '../../../services/ServiceAreasService';

// The shared react-native mock stubs FlatList as a host string, so its
// data/renderItem/ListHeaderComponent/ListEmptyComponent never render.
// Provide a functional FlatList that actually renders its content so the
// list-rendering and callback wiring can be exercised.
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const React = require('react');
  const FlatList = ({
    data,
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListEmptyComponent,
    contentContainerStyle,
  }: any) => {
    const items = data ?? [];
    const header =
      typeof ListHeaderComponent === 'function'
        ? React.createElement(ListHeaderComponent)
        : (ListHeaderComponent ?? null);
    const empty =
      typeof ListEmptyComponent === 'function'
        ? React.createElement(ListEmptyComponent)
        : (ListEmptyComponent ?? null);
    return React.createElement(
      'View',
      { style: contentContainerStyle, testID: 'flat-list' },
      header,
      items.length === 0
        ? empty
        : items.map((item: any, index: number) =>
            React.createElement(
              React.Fragment,
              { key: keyExtractor ? keyExtractor(item, index) : index },
              renderItem({ item, index })
            )
          )
    );
  };
  return { ...ReactNative, FlatList };
});

// Mock theme module
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      primary: '#0F172A',
      secondary: '#10B981',
      success: '#10B981',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textTertiary: '#94A3B8',
      background: '#FFFFFF',
    },
  },
}));

// Mock ServiceAreaCard component
jest.mock('../../ServiceAreaCard', () => ({
  ServiceAreaCard: ({
    serviceArea,
    onPress,
    onEdit,
    onToggleActive,
    onDelete,
  }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`service-area-card-${serviceArea.id}`}>
        <Text>{serviceArea.area_name}</Text>
        <Text>{serviceArea.is_active ? 'Active' : 'Inactive'}</Text>
        <TouchableOpacity
          testID={`card-press-${serviceArea.id}`}
          onPress={onPress}
        >
          <Text>Card Press</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`edit-btn-${serviceArea.id}`}
          onPress={onEdit}
        >
          <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`toggle-btn-${serviceArea.id}`}
          onPress={onToggleActive}
        >
          <Text>Toggle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`delete-btn-${serviceArea.id}`}
          onPress={onDelete}
        >
          <Text>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock Button component (named export `Button`)
jest.mock('../../ui/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    Button: ({ title, onPress, testID }: any) => (
      <TouchableOpacity testID={testID || 'button'} onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

// Helper function to create mock service area
const createMockServiceArea = (
  overrides?: Partial<ServiceArea>
): ServiceArea => ({
  id: 'area-123',
  contractor_id: 'contractor-456',
  area_name: 'Test Area',
  description: 'Test description',
  area_type: 'radius',
  center_latitude: 51.5074,
  center_longitude: -0.1278,
  radius_km: 10,
  boundary_coordinates: null,
  postal_codes: undefined,
  cities: undefined,
  base_travel_charge: 25.0,
  per_km_rate: 2.5,
  minimum_job_value: 50.0,
  priority_level: 1,
  is_primary_area: false,
  is_active: true,
  max_distance_km: 15,
  response_time_hours: 24,
  weekend_surcharge: 0,
  evening_surcharge: 0,
  emergency_available: false,
  emergency_surcharge: 0,
  preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  preferred_hours: { start: '09:00', end: '17:00' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ServiceAreasList', () => {
  let mockOnToggleActive: jest.Mock;
  let mockOnDelete: jest.Mock;
  let mockOnCreatePress: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnToggleActive = jest.fn();
    mockOnDelete = jest.fn();
    mockOnCreatePress = jest.fn();
  });

  describe('Empty State', () => {
    it('should render empty state when serviceAreas is empty array', () => {
      const { getByText, queryByTestId } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('No service areas yet')).toBeTruthy();
      expect(
        getByText(
          'Add your first service area so homeowners nearby can find you for jobs in your preferred locations.'
        )
      ).toBeTruthy();
      // No area cards render in the empty state.
      expect(queryByTestId(/service-area-card-/)).toBeNull();
    });

    it('should render map icon in empty state', () => {
      const { UNSAFE_getByProps } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const mapIcon = UNSAFE_getByProps({ name: 'map-outline' });
      expect(mapIcon).toBeTruthy();
      expect(mapIcon.props.size).toBe(64);
    });

    it('should render Add Service Area button in empty state', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Add Service Area')).toBeTruthy();
    });

    it('should call onCreatePress when button pressed', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const button = getByText('Add Service Area');
      fireEvent.press(button);

      expect(mockOnCreatePress).toHaveBeenCalledTimes(1);
    });

    it('should not render any ServiceAreaCard components in empty state', () => {
      const { queryByTestId } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(queryByTestId(/service-area-card-/)).toBeNull();
    });

    it('should not render section sub-titles in empty state', () => {
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      // The Active/Inactive section sub-headers only render when there are
      // areas in those sections, so they are absent in the empty state.
      expect(queryByText(/Active Areas/)).toBeNull();
      expect(queryByText(/Inactive Areas/)).toBeNull();
    });
  });

  describe('List Rendering - Active Areas Only', () => {
    it('should render Your Service Areas title when areas exist', () => {
      const serviceAreas = [createMockServiceArea({ is_active: true })];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Your Service Areas')).toBeTruthy();
    });

    it('should render Active Areas section with count', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: true }),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (2)')).toBeTruthy();
    });

    it('should render single active area', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        area_name: 'Downtown',
        is_active: true,
      });
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByText('Downtown')).toBeTruthy();
      expect(getByText('Active Areas (1)')).toBeTruthy();
    });

    it('should render multiple active areas', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: 'area-1',
          area_name: 'Area One',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'area-2',
          area_name: 'Area Two',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'area-3',
          area_name: 'Area Three',
          is_active: true,
        }),
      ];
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByTestId('service-area-card-area-2')).toBeTruthy();
      expect(getByTestId('service-area-card-area-3')).toBeTruthy();
      expect(getByText('Active Areas (3)')).toBeTruthy();
    });

    it('should not render Inactive Areas section when all areas are active', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: true }),
      ];
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(queryByText(/Inactive Areas/)).toBeNull();
    });

    it('should not render empty state when active areas exist', () => {
      const serviceAreas = [createMockServiceArea({ is_active: true })];
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(queryByText('No service areas yet')).toBeNull();
      expect(queryByText('Add Service Area')).toBeNull();
    });
  });

  describe('List Rendering - Inactive Areas Only', () => {
    it('should render Inactive Areas section with count', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: false }),
        createMockServiceArea({ id: 'area-2', is_active: false }),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Inactive Areas (2)')).toBeTruthy();
    });

    it('should render single inactive area', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        area_name: 'Inactive Zone',
        is_active: false,
      });
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByText('Inactive Zone')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();
    });

    it('should render multiple inactive areas', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: 'area-1',
          area_name: 'Inactive One',
          is_active: false,
        }),
        createMockServiceArea({
          id: 'area-2',
          area_name: 'Inactive Two',
          is_active: false,
        }),
        createMockServiceArea({
          id: 'area-3',
          area_name: 'Inactive Three',
          is_active: false,
        }),
      ];
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByTestId('service-area-card-area-2')).toBeTruthy();
      expect(getByTestId('service-area-card-area-3')).toBeTruthy();
      expect(getByText('Inactive Areas (3)')).toBeTruthy();
    });

    it('should not render Active Areas section when all areas are inactive', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: false }),
        createMockServiceArea({ id: 'area-2', is_active: false }),
      ];
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(queryByText(/Active Areas/)).toBeNull();
    });
  });

  describe('List Rendering - Mixed Active and Inactive', () => {
    it('should render both Active and Inactive sections', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: false }),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();
    });

    it('should separate active and inactive areas correctly', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: 'active-1',
          area_name: 'Active One',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'inactive-1',
          area_name: 'Inactive One',
          is_active: false,
        }),
        createMockServiceArea({
          id: 'active-2',
          area_name: 'Active Two',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'inactive-2',
          area_name: 'Inactive Two',
          is_active: false,
        }),
      ];
      const { getByText, getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (2)')).toBeTruthy();
      expect(getByText('Inactive Areas (2)')).toBeTruthy();
      expect(getByTestId('service-area-card-active-1')).toBeTruthy();
      expect(getByTestId('service-area-card-active-2')).toBeTruthy();
      expect(getByTestId('service-area-card-inactive-1')).toBeTruthy();
      expect(getByTestId('service-area-card-inactive-2')).toBeTruthy();
    });

    it('should correctly count active vs inactive areas (3 active, 2 inactive)', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: true }),
        createMockServiceArea({ id: 'area-3', is_active: true }),
        createMockServiceArea({ id: 'area-4', is_active: false }),
        createMockServiceArea({ id: 'area-5', is_active: false }),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (3)')).toBeTruthy();
      expect(getByText('Inactive Areas (2)')).toBeTruthy();
    });

    it('should render active areas before inactive areas', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: 'inactive-1',
          area_name: 'Inactive First',
          is_active: false,
        }),
        createMockServiceArea({
          id: 'active-1',
          area_name: 'Active First',
          is_active: true,
        }),
      ];
      const { getAllByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const sectionTitles = getAllByText(/Areas \(\d+\)/);
      expect(sectionTitles[0].children[0]).toContain('Active');
      expect(sectionTitles[1].children[0]).toContain('Inactive');
    });
  });

  describe('Toggle Active Callback', () => {
    it('should call onToggleActive with correct area when toggle button pressed', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-123',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const toggleButton = getByTestId('toggle-btn-area-123');
      fireEvent.press(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledTimes(1);
      expect(mockOnToggleActive).toHaveBeenCalledWith(serviceArea);
    });

    it('should call onToggleActive for active areas', () => {
      const activeArea = createMockServiceArea({
        id: 'active-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[activeArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-active-1'));

      expect(mockOnToggleActive).toHaveBeenCalledWith(activeArea);
    });

    it('should call onToggleActive for inactive areas', () => {
      const inactiveArea = createMockServiceArea({
        id: 'inactive-1',
        is_active: false,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[inactiveArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-inactive-1'));

      expect(mockOnToggleActive).toHaveBeenCalledWith(inactiveArea);
    });

    it('should handle multiple toggle presses', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const toggleButton = getByTestId('toggle-btn-area-1');
      fireEvent.press(toggleButton);
      fireEvent.press(toggleButton);
      fireEvent.press(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledTimes(3);
      expect(mockOnToggleActive).toHaveBeenCalledWith(serviceArea);
    });
  });

  describe('Delete Callback', () => {
    it('should call onDelete with correct area when delete button pressed', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-123',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      const deleteButton = getByTestId('delete-btn-area-123');
      fireEvent.press(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(serviceArea);
    });

    it('should call onDelete for active areas', () => {
      const activeArea = createMockServiceArea({
        id: 'active-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[activeArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('delete-btn-active-1'));

      expect(mockOnDelete).toHaveBeenCalledWith(activeArea);
    });

    it('should call onDelete for inactive areas', () => {
      const inactiveArea = createMockServiceArea({
        id: 'inactive-1',
        is_active: false,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[inactiveArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('delete-btn-inactive-1'));

      expect(mockOnDelete).toHaveBeenCalledWith(inactiveArea);
    });

    it('should handle multiple delete calls on different areas', () => {
      const area1 = createMockServiceArea({ id: 'area-1', is_active: true });
      const area2 = createMockServiceArea({ id: 'area-2', is_active: false });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[area1, area2]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('delete-btn-area-1'));
      fireEvent.press(getByTestId('delete-btn-area-2'));

      expect(mockOnDelete).toHaveBeenCalledTimes(2);
      expect(mockOnDelete).toHaveBeenNthCalledWith(1, area1);
      expect(mockOnDelete).toHaveBeenNthCalledWith(2, area2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle serviceAreas with length 0', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('No service areas yet')).toBeTruthy();
    });

    it('should handle very large number of areas (10 active, 10 inactive)', () => {
      const serviceAreas = [
        ...Array(10)
          .fill(null)
          .map((_, i) =>
            createMockServiceArea({ id: `active-${i}`, is_active: true })
          ),
        ...Array(10)
          .fill(null)
          .map((_, i) =>
            createMockServiceArea({ id: `inactive-${i}`, is_active: false })
          ),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (10)')).toBeTruthy();
      expect(getByText('Inactive Areas (10)')).toBeTruthy();
    });

    it('should handle areas with minimal data', () => {
      const minimalArea = createMockServiceArea({
        id: 'minimal-1',
        area_name: 'Min',
        description: undefined,
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[minimalArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-minimal-1')).toBeTruthy();
    });

    it('should handle areas with all fields populated', () => {
      const fullArea = createMockServiceArea({
        id: 'full-1',
        area_name: 'Complete Area',
        description: 'Full description',
        is_active: true,
        is_primary_area: true,
        weekend_surcharge: 20,
        evening_surcharge: 15,
        emergency_available: true,
        emergency_surcharge: 50,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[fullArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-full-1')).toBeTruthy();
    });

    it('should handle different area_type values', () => {
      const serviceAreas = [
        createMockServiceArea({
          id: 'radius-1',
          area_type: 'radius',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'polygon-1',
          area_type: 'polygon',
          is_active: true,
        }),
        createMockServiceArea({
          id: 'postal-1',
          area_type: 'postal_codes',
          postal_codes: ['SW1'],
          is_active: true,
        }),
        createMockServiceArea({
          id: 'cities-1',
          area_type: 'cities',
          cities: ['London'],
          is_active: true,
        }),
      ];
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByTestId('service-area-card-radius-1')).toBeTruthy();
      expect(getByTestId('service-area-card-polygon-1')).toBeTruthy();
      expect(getByTestId('service-area-card-postal-1')).toBeTruthy();
      expect(getByTestId('service-area-card-cities-1')).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: toggle, delete', () => {
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      // Toggle
      fireEvent.press(getByTestId('toggle-btn-area-1'));
      expect(mockOnToggleActive).toHaveBeenCalledWith(serviceArea);

      // Delete
      fireEvent.press(getByTestId('delete-btn-area-1'));
      expect(mockOnDelete).toHaveBeenCalledWith(serviceArea);
    });

    it('should render mixed list and handle all interactions correctly', () => {
      const activeArea = createMockServiceArea({
        id: 'active-1',
        area_name: 'Active Zone',
        is_active: true,
      });
      const inactiveArea = createMockServiceArea({
        id: 'inactive-1',
        area_name: 'Inactive Zone',
        is_active: false,
      });
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={[activeArea, inactiveArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      // Check sections exist
      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();

      // Check both cards rendered
      expect(getByTestId('service-area-card-active-1')).toBeTruthy();
      expect(getByTestId('service-area-card-inactive-1')).toBeTruthy();

      // Test active area interactions
      fireEvent.press(getByTestId('toggle-btn-active-1'));
      expect(mockOnToggleActive).toHaveBeenCalledWith(activeArea);

      // Test inactive area interactions
      fireEvent.press(getByTestId('toggle-btn-inactive-1'));
      expect(mockOnToggleActive).toHaveBeenCalledWith(inactiveArea);
    });

    it('should maintain correct counts after multiple renders', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: true }),
        createMockServiceArea({ id: 'area-3', is_active: false }),
      ];

      const { getByText, rerender } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (2)')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();

      // Rerender with updated areas
      const updatedAreas = [
        { ...serviceAreas[0], is_active: false }, // Toggle first to inactive
        serviceAreas[1],
        serviceAreas[2],
      ];

      rerender(
        <ServiceAreasList
          serviceAreas={updatedAreas}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (2)')).toBeTruthy();
    });
  });

  describe('Prop Validation', () => {
    it('should accept valid onCreatePress callback', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      expect(getByText('No service areas yet')).toBeTruthy();
    });

    it('should accept valid onToggleActive callback', () => {
      const customToggle = jest.fn();
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={customToggle}
          onDelete={mockOnDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-area-1'));
      expect(customToggle).toHaveBeenCalledWith(serviceArea);
    });

    it('should accept valid onDelete callback', () => {
      const customDelete = jest.fn();
      const serviceArea = createMockServiceArea({
        id: 'area-1',
        is_active: true,
      });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          onToggleActive={mockOnToggleActive}
          onDelete={customDelete}
          onCreatePress={mockOnCreatePress}
        />
      );

      fireEvent.press(getByTestId('delete-btn-area-1'));
      expect(customDelete).toHaveBeenCalledWith(serviceArea);
    });
  });
});
