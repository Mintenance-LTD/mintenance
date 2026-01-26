import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServiceAreasList } from '../ServiceAreasList';
import { ServiceArea } from '../../../services/ServiceAreasService';

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
  ServiceAreaCard: ({ serviceArea, onPress, onEdit, onToggleActive, onDelete }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`service-area-card-${serviceArea.id}`}>
        <Text>{serviceArea.area_name}</Text>
        <Text>{serviceArea.is_active ? 'Active' : 'Inactive'}</Text>
        <TouchableOpacity testID={`card-press-${serviceArea.id}`} onPress={onPress}>
          <Text>Card Press</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`edit-btn-${serviceArea.id}`} onPress={onEdit}>
          <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`toggle-btn-${serviceArea.id}`} onPress={onToggleActive}>
          <Text>Toggle</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`delete-btn-${serviceArea.id}`} onPress={onDelete}>
          <Text>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock Button component
jest.mock('../../ui/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, onPress, testID }: any) => (
      <TouchableOpacity testID={testID || 'button'} onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

// Helper function to create mock service area
const createMockServiceArea = (overrides?: Partial<ServiceArea>): ServiceArea => ({
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
  let mockNavigation: any;
  let mockOnToggleActive: jest.Mock;
  let mockOnDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = {
      navigate: jest.fn(),
    };
    mockOnToggleActive = jest.fn();
    mockOnDelete = jest.fn();
  });

  describe('Empty State', () => {
    it('should render empty state when serviceAreas is empty array', () => {
      const { getByText, queryByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('No service areas defined')).toBeTruthy();
      expect(getByText('Create your first service area to start accepting jobs in your preferred locations')).toBeTruthy();
      expect(queryByText('Your Service Areas')).toBeNull();
    });

    it('should render map icon in empty state', () => {
      const { UNSAFE_getByProps } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const mapIcon = UNSAFE_getByProps({ name: 'map-outline' });
      expect(mapIcon).toBeTruthy();
      expect(mapIcon.props.size).toBe(64);
    });

    it('should render Create Service Area button in empty state', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Create Service Area')).toBeTruthy();
    });

    it('should navigate to CreateServiceArea when button pressed', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const button = getByText('Create Service Area');
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateServiceArea');
    });

    it('should not render any ServiceAreaCard components in empty state', () => {
      const { queryByTestId } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByTestId(/service-area-card-/)).toBeNull();
    });

    it('should not render section titles in empty state', () => {
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('Your Service Areas')).toBeNull();
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByText('Downtown')).toBeTruthy();
      expect(getByText('Active Areas (1)')).toBeTruthy();
    });

    it('should render multiple active areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', area_name: 'Area One', is_active: true }),
        createMockServiceArea({ id: 'area-2', area_name: 'Area Two', is_active: true }),
        createMockServiceArea({ id: 'area-3', area_name: 'Area Three', is_active: true }),
      ];
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Inactive Areas/)).toBeNull();
    });

    it('should not render empty state when active areas exist', () => {
      const serviceAreas = [createMockServiceArea({ is_active: true })];
      const { queryByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('No service areas defined')).toBeNull();
      expect(queryByText('Create Service Area')).toBeNull();
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByTestId('service-area-card-area-1')).toBeTruthy();
      expect(getByText('Inactive Zone')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();
    });

    it('should render multiple inactive areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', area_name: 'Inactive One', is_active: false }),
        createMockServiceArea({ id: 'area-2', area_name: 'Inactive Two', is_active: false }),
        createMockServiceArea({ id: 'area-3', area_name: 'Inactive Three', is_active: false }),
      ];
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();
    });

    it('should separate active and inactive areas correctly', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'active-1', area_name: 'Active One', is_active: true }),
        createMockServiceArea({ id: 'inactive-1', area_name: 'Inactive One', is_active: false }),
        createMockServiceArea({ id: 'active-2', area_name: 'Active Two', is_active: true }),
        createMockServiceArea({ id: 'inactive-2', area_name: 'Inactive Two', is_active: false }),
      ];
      const { getByText, getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Active Areas (3)')).toBeTruthy();
      expect(getByText('Inactive Areas (2)')).toBeTruthy();
    });

    it('should render active areas before inactive areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'inactive-1', area_name: 'Inactive First', is_active: false }),
        createMockServiceArea({ id: 'active-1', area_name: 'Active First', is_active: true }),
      ];
      const { getAllByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const sectionTitles = getAllByText(/Areas \(\d+\)/);
      expect(sectionTitles[0].children[0]).toContain('Active');
      expect(sectionTitles[1].children[0]).toContain('Inactive');
    });
  });

  describe('Navigation - Card Press', () => {
    it('should navigate to ServiceAreaDetail when card pressed', () => {
      const serviceArea = createMockServiceArea({ id: 'area-123', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const cardPress = getByTestId('card-press-area-123');
      fireEvent.press(cardPress);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'area-123',
      });
    });

    it('should navigate with correct areaId for multiple areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: true }),
      ];
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('card-press-area-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'area-1',
      });

      fireEvent.press(getByTestId('card-press-area-2'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'area-2',
      });
    });
  });

  describe('Navigation - Edit Button', () => {
    it('should navigate to EditServiceArea when edit button pressed', () => {
      const serviceArea = createMockServiceArea({ id: 'area-123', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const editButton = getByTestId('edit-btn-area-123');
      fireEvent.press(editButton);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditServiceArea', {
        areaId: 'area-123',
      });
    });

    it('should navigate to correct edit page for multiple areas', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'area-1', is_active: true }),
        createMockServiceArea({ id: 'area-2', is_active: false }),
      ];
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('edit-btn-area-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditServiceArea', {
        areaId: 'area-1',
      });

      fireEvent.press(getByTestId('edit-btn-area-2'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditServiceArea', {
        areaId: 'area-2',
      });
    });
  });

  describe('Toggle Active Callback', () => {
    it('should call onToggleActive with correct area when toggle button pressed', () => {
      const serviceArea = createMockServiceArea({ id: 'area-123', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const toggleButton = getByTestId('toggle-btn-area-123');
      fireEvent.press(toggleButton);

      expect(mockOnToggleActive).toHaveBeenCalledTimes(1);
      expect(mockOnToggleActive).toHaveBeenCalledWith(serviceArea);
    });

    it('should call onToggleActive for active areas', () => {
      const activeArea = createMockServiceArea({ id: 'active-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[activeArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-active-1'));

      expect(mockOnToggleActive).toHaveBeenCalledWith(activeArea);
    });

    it('should call onToggleActive for inactive areas', () => {
      const inactiveArea = createMockServiceArea({ id: 'inactive-1', is_active: false });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[inactiveArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-inactive-1'));

      expect(mockOnToggleActive).toHaveBeenCalledWith(inactiveArea);
    });

    it('should handle multiple toggle presses', () => {
      const serviceArea = createMockServiceArea({ id: 'area-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
      const serviceArea = createMockServiceArea({ id: 'area-123', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = getByTestId('delete-btn-area-123');
      fireEvent.press(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(serviceArea);
    });

    it('should call onDelete for active areas', () => {
      const activeArea = createMockServiceArea({ id: 'active-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[activeArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('delete-btn-active-1'));

      expect(mockOnDelete).toHaveBeenCalledWith(activeArea);
    });

    it('should call onDelete for inactive areas', () => {
      const inactiveArea = createMockServiceArea({ id: 'inactive-1', is_active: false });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[inactiveArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('No service areas defined')).toBeTruthy();
    });

    it('should handle very large number of areas (10 active, 10 inactive)', () => {
      const serviceAreas = [
        ...Array(10).fill(null).map((_, i) =>
          createMockServiceArea({ id: `active-${i}`, is_active: true })
        ),
        ...Array(10).fill(null).map((_, i) =>
          createMockServiceArea({ id: `inactive-${i}`, is_active: false })
        ),
      ];
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByTestId('service-area-card-full-1')).toBeTruthy();
    });

    it('should handle different area_type values', () => {
      const serviceAreas = [
        createMockServiceArea({ id: 'radius-1', area_type: 'radius', is_active: true }),
        createMockServiceArea({ id: 'polygon-1', area_type: 'polygon', is_active: true }),
        createMockServiceArea({ id: 'postal-1', area_type: 'postal_codes', postal_codes: ['SW1'], is_active: true }),
        createMockServiceArea({ id: 'cities-1', area_type: 'cities', cities: ['London'], is_active: true }),
      ];
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByTestId('service-area-card-radius-1')).toBeTruthy();
      expect(getByTestId('service-area-card-polygon-1')).toBeTruthy();
      expect(getByTestId('service-area-card-postal-1')).toBeTruthy();
      expect(getByTestId('service-area-card-cities-1')).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: view, edit, toggle, delete', () => {
      const serviceArea = createMockServiceArea({ id: 'area-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      // View (press card)
      fireEvent.press(getByTestId('card-press-area-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'area-1',
      });

      // Edit
      fireEvent.press(getByTestId('edit-btn-area-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditServiceArea', {
        areaId: 'area-1',
      });

      // Toggle
      fireEvent.press(getByTestId('toggle-btn-area-1'));
      expect(mockOnToggleActive).toHaveBeenCalledWith(serviceArea);

      // Delete
      fireEvent.press(getByTestId('delete-btn-area-1'));
      expect(mockOnDelete).toHaveBeenCalledWith(serviceArea);
    });

    it('should render mixed list and handle all interactions correctly', () => {
      const activeArea = createMockServiceArea({ id: 'active-1', area_name: 'Active Zone', is_active: true });
      const inactiveArea = createMockServiceArea({ id: 'inactive-1', area_name: 'Inactive Zone', is_active: false });
      const { getByTestId, getByText } = render(
        <ServiceAreasList
          serviceAreas={[activeArea, inactiveArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      // Check sections exist
      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (1)')).toBeTruthy();

      // Check both cards rendered
      expect(getByTestId('service-area-card-active-1')).toBeTruthy();
      expect(getByTestId('service-area-card-inactive-1')).toBeTruthy();

      // Test active area interactions
      fireEvent.press(getByTestId('card-press-active-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'active-1',
      });

      fireEvent.press(getByTestId('toggle-btn-active-1'));
      expect(mockOnToggleActive).toHaveBeenCalledWith(activeArea);

      // Test inactive area interactions
      fireEvent.press(getByTestId('card-press-inactive-1'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaDetail', {
        areaId: 'inactive-1',
      });

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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
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
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Active Areas (1)')).toBeTruthy();
      expect(getByText('Inactive Areas (2)')).toBeTruthy();
    });
  });

  describe('Prop Validation', () => {
    it('should accept valid navigation prop', () => {
      const { getByText } = render(
        <ServiceAreasList
          serviceAreas={[]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('No service areas defined')).toBeTruthy();
    });

    it('should accept valid onToggleActive callback', () => {
      const customToggle = jest.fn();
      const serviceArea = createMockServiceArea({ id: 'area-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={customToggle}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('toggle-btn-area-1'));
      expect(customToggle).toHaveBeenCalledWith(serviceArea);
    });

    it('should accept valid onDelete callback', () => {
      const customDelete = jest.fn();
      const serviceArea = createMockServiceArea({ id: 'area-1', is_active: true });
      const { getByTestId } = render(
        <ServiceAreasList
          serviceAreas={[serviceArea]}
          navigation={mockNavigation}
          onToggleActive={mockOnToggleActive}
          onDelete={customDelete}
        />
      );

      fireEvent.press(getByTestId('delete-btn-area-1'));
      expect(customDelete).toHaveBeenCalledWith(serviceArea);
    });
  });
});
