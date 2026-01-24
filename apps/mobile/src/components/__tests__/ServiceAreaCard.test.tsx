import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServiceAreaCard } from '../ServiceAreaCard';
import { ServiceArea } from '../services/ServiceAreasService';

// Mock theme module
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#0F172A',
      secondary: '#10B981',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      background: '#FFFFFF',
      surfaceSecondary: '#F8FAFC',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
    },
    borderRadius: {
      sm: 4,
      base: 8,
      lg: 12,
    },
    shadows: {
      base: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
    spacing: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      6: 24,
    },
  },
}));

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

describe('ServiceAreaCard', () => {
  let mockOnPress: jest.Mock;
  let mockOnEdit: jest.Mock;
  let mockOnToggleActive: jest.Mock;
  let mockOnDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPress = jest.fn();
    mockOnEdit = jest.fn();
    mockOnToggleActive = jest.fn();
    mockOnDelete = jest.fn();
  });

  describe('Core Rendering', () => {
    it('should render area name', () => {
      const serviceArea = createMockServiceArea({ area_name: 'Downtown Area' });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Downtown Area')).toBeTruthy();
    });

    it('should render description when present', () => {
      const serviceArea = createMockServiceArea({
        description: 'Central business district coverage'
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Central business district coverage')).toBeTruthy();
    });

    it('should render TouchableOpacity container', () => {
      const serviceArea = createMockServiceArea();
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const container = getByText('Test Area').parent?.parent?.parent?.parent?.parent;
      expect(container).toBeTruthy();
    });

    it('should call onPress when card pressed', () => {
      const serviceArea = createMockServiceArea();
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const areaName = getByText('Test Area');
      const touchableContainer = areaName.parent?.parent?.parent?.parent?.parent;
      fireEvent.press(touchableContainer!);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should render all pricing fields', () => {
      const serviceArea = createMockServiceArea({
        base_travel_charge: 30.5,
        per_km_rate: 3.25,
        minimum_job_value: 75.0,
        response_time_hours: 48,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Base Travel')).toBeTruthy();
      expect(getByText('£30.50')).toBeTruthy();
      expect(getByText('Per KM')).toBeTruthy();
      expect(getByText('£3.25')).toBeTruthy();
      expect(getByText('Min Job')).toBeTruthy();
      expect(getByText('£75.00')).toBeTruthy();
      expect(getByText('Response')).toBeTruthy();
      expect(getByText('48h')).toBeTruthy();
    });
  });

  describe('PRIMARY Badge', () => {
    it('should show PRIMARY badge when is_primary_area is true', () => {
      const serviceArea = createMockServiceArea({ is_primary_area: true });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('PRIMARY')).toBeTruthy();
    });

    it('should hide PRIMARY badge when is_primary_area is false', () => {
      const serviceArea = createMockServiceArea({ is_primary_area: false });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('PRIMARY')).toBeNull();
    });

    it('should render badge with correct styles for primary area', () => {
      const serviceArea = createMockServiceArea({ is_primary_area: true });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const badge = getByText('PRIMARY');
      expect(badge).toBeTruthy();
    });
  });

  describe('Active/Inactive Status', () => {
    it('should show Active text when is_active is true', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Active')).toBeTruthy();
    });

    it('should show Inactive text when is_active is false', () => {
      const serviceArea = createMockServiceArea({ is_active: false });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Inactive')).toBeTruthy();
    });

    it('should have success color for active status indicator', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const statusText = getByText('Active');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#10B981' }),
        ])
      );
    });

    it('should have textSecondary color for inactive status indicator', () => {
      const serviceArea = createMockServiceArea({ is_active: false });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const statusText = getByText('Inactive');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#475569' }),
        ])
      );
    });

    it('should have success color for active status text', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const statusText = getByText('Active');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#10B981' }),
        ])
      );
    });

    it('should have textSecondary color for inactive status text', () => {
      const serviceArea = createMockServiceArea({ is_active: false });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const statusText = getByText('Inactive');
      expect(statusText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#475569' }),
        ])
      );
    });
  });

  describe('Area Type Icons & Labels', () => {
    it('should show correct icon for radius type (radio-button-on)', () => {
      const serviceArea = createMockServiceArea({ area_type: 'radius' });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const icon = UNSAFE_getByProps({ name: 'radio-button-on' });
      expect(icon).toBeTruthy();
    });

    it('should show correct icon for polygon type (shapes)', () => {
      const serviceArea = createMockServiceArea({ area_type: 'polygon' });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const icon = UNSAFE_getByProps({ name: 'shapes' });
      expect(icon).toBeTruthy();
    });

    it('should show correct icon for postal_codes type (mail)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: ['SW1A 1AA', 'SW1A 2AA'],
      });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const icon = UNSAFE_getByProps({ name: 'mail' });
      expect(icon).toBeTruthy();
    });

    it('should show correct icon for cities type (location)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'cities',
        cities: ['London', 'Manchester'],
      });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const icon = UNSAFE_getByProps({ name: 'location' });
      expect(icon).toBeTruthy();
    });

    it('should show correct icon for unknown type (map - default)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'custom' as any,
      });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const icon = UNSAFE_getByProps({ name: 'map' });
      expect(icon).toBeTruthy();
    });

    it('should show correct label for radius type (Radius Coverage)', () => {
      const serviceArea = createMockServiceArea({ area_type: 'radius' });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Radius Coverage')).toBeTruthy();
    });

    it('should show correct label for polygon type (Custom Boundary)', () => {
      const serviceArea = createMockServiceArea({ area_type: 'polygon' });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Custom Boundary')).toBeTruthy();
    });

    it('should show correct label for postal_codes type (Postal Codes)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: ['SW1A 1AA'],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Postal Codes')).toBeTruthy();
    });

    it('should show correct label for cities type (City Coverage)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'cities',
        cities: ['London'],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('City Coverage')).toBeTruthy();
    });

    it('should show correct label for unknown type (returns type itself)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'custom_zone' as any,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('custom_zone')).toBeTruthy();
    });
  });

  describe('Distance Formatting', () => {
    it('should return N/A when km is undefined', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: undefined,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: N\/A radius/)).toBeTruthy();
    });

    it('should return N/A when km is 0', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 0,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: N\/A radius/)).toBeTruthy();
    });

    it('should format < 1km as meters (0.5km → 500m)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 0.5,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 500m radius/)).toBeTruthy();
    });

    it('should format < 1km as meters (0.123km → 123m)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 0.123,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 123m radius/)).toBeTruthy();
    });

    it('should format >= 1km as kilometers (1.5km → 1.5km)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 1.5,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 1.5km radius/)).toBeTruthy();
    });

    it('should format >= 1km as kilometers (25km → 25km)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 25,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 25km radius/)).toBeTruthy();
    });

    it('should use Math.round for meters (0.567km → 567m)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 0.567,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 567m radius/)).toBeTruthy();
    });
  });

  describe('Currency Formatting', () => {
    it('should format base_travel_charge as £X.XX', () => {
      const serviceArea = createMockServiceArea({ base_travel_charge: 15 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£15.00')).toBeTruthy();
    });

    it('should format per_km_rate as £X.XX', () => {
      const serviceArea = createMockServiceArea({ per_km_rate: 3.75 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£3.75')).toBeTruthy();
    });

    it('should format minimum_job_value as £X.XX', () => {
      const serviceArea = createMockServiceArea({ minimum_job_value: 100 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£100.00')).toBeTruthy();
    });

    it('should round to 2 decimal places (12.345 → £12.35)', () => {
      const serviceArea = createMockServiceArea({ base_travel_charge: 12.345 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£12.35')).toBeTruthy();
    });

    it('should handle whole numbers with .00', () => {
      const serviceArea = createMockServiceArea({ per_km_rate: 5 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£5.00')).toBeTruthy();
    });
  });

  describe('Radius Info', () => {
    it('should show radius info when area_type is radius', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 10,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 10km radius/)).toBeTruthy();
    });

    it('should display formatted radius_km (5km → 5km radius)', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 5,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 5km radius/)).toBeTruthy();
    });

    it('should show max distance when max_distance_km exists', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 10,
        max_distance_km: 20,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Coverage: 10km radius • Max: 20km/)).toBeTruthy();
    });

    it('should hide max distance when max_distance_km is undefined', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 10,
        max_distance_km: undefined,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Max:/)).toBeNull();
    });

    it('should hide radius info for non-radius types', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'polygon',
        radius_km: 10,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/radius/)).toBeNull();
    });
  });

  describe('Postal Codes / Cities Info', () => {
    it('should show postal codes count when area_type is postal_codes', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: ['SW1A 1AA', 'SW1A 2AA', 'W1A 1AA'],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('3 postal codes')).toBeTruthy();
    });

    it('should show cities count when area_type is cities', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'cities',
        cities: ['London', 'Manchester', 'Birmingham'],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('3 cities')).toBeTruthy();
    });

    it('should display 0 postal codes when postal_codes is undefined', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: undefined,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('0 postal codes')).toBeTruthy();
    });

    it('should display 0 cities when cities is undefined', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'cities',
        cities: undefined,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('0 cities')).toBeTruthy();
    });

    it('should display 1 postal code correctly', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: ['SW1A 1AA'],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('1 postal codes')).toBeTruthy();
    });

    it('should hide postal/cities info for other area types', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        postal_codes: ['SW1A 1AA'],
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/postal codes/)).toBeNull();
      expect(queryByText(/cities/)).toBeNull();
    });
  });

  describe('Surcharge Chips', () => {
    it('should show weekend chip when weekend_surcharge > 0', () => {
      const serviceArea = createMockServiceArea({ weekend_surcharge: 20 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Weekend +20%')).toBeTruthy();
    });

    it('should show evening chip when evening_surcharge > 0', () => {
      const serviceArea = createMockServiceArea({ evening_surcharge: 15 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Evening +15%')).toBeTruthy();
    });

    it('should show emergency chip when emergency_available is true', () => {
      const serviceArea = createMockServiceArea({
        emergency_available: true,
        emergency_surcharge: 50,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Emergency +50%')).toBeTruthy();
    });

    it('should hide weekend chip when weekend_surcharge is 0', () => {
      const serviceArea = createMockServiceArea({ weekend_surcharge: 0 });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Weekend/)).toBeNull();
    });

    it('should hide evening chip when evening_surcharge is 0', () => {
      const serviceArea = createMockServiceArea({ evening_surcharge: 0 });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Evening/)).toBeNull();
    });

    it('should hide emergency chip when emergency_available is false', () => {
      const serviceArea = createMockServiceArea({
        emergency_available: false,
        emergency_surcharge: 50,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Emergency/)).toBeNull();
    });

    it('should hide surcharges row when all surcharges are 0/false', () => {
      const serviceArea = createMockServiceArea({
        weekend_surcharge: 0,
        evening_surcharge: 0,
        emergency_available: false,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Weekend/)).toBeNull();
      expect(queryByText(/Evening/)).toBeNull();
      expect(queryByText(/Emergency/)).toBeNull();
    });

    it('should show surcharges row when at least one surcharge exists', () => {
      const serviceArea = createMockServiceArea({
        weekend_surcharge: 10,
        evening_surcharge: 0,
        emergency_available: false,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Weekend +10%')).toBeTruthy();
    });

    it('should handle decimal surcharges', () => {
      const serviceArea = createMockServiceArea({
        weekend_surcharge: 12.5,
        evening_surcharge: 7.25,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Weekend +12.5%')).toBeTruthy();
      expect(getByText('Evening +7.25%')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should call onEdit when Edit button pressed', () => {
      const serviceArea = createMockServiceArea();
      const { UNSAFE_getAllByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const editButton = UNSAFE_getAllByProps({ name: 'pencil' })[0].parent;
      fireEvent.press(editButton!);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleActive when Toggle button pressed', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { UNSAFE_getAllByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const toggleButton = UNSAFE_getAllByProps({ name: 'pause' })[0].parent;
      fireEvent.press(toggleButton!);

      expect(mockOnToggleActive).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when Delete button pressed', () => {
      const serviceArea = createMockServiceArea();
      const { UNSAFE_getAllByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = UNSAFE_getAllByProps({ name: 'trash' })[0].parent;
      fireEvent.press(deleteButton!);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should show pause icon when active', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const pauseIcon = UNSAFE_getByProps({ name: 'pause' });
      expect(pauseIcon).toBeTruthy();
    });

    it('should show play icon when inactive', () => {
      const serviceArea = createMockServiceArea({ is_active: false });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const playIcon = UNSAFE_getByProps({ name: 'play' });
      expect(playIcon).toBeTruthy();
    });

    it('should have warning color for toggle icon when active', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { UNSAFE_getByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const pauseIcon = UNSAFE_getByProps({ name: 'pause' });
      expect(pauseIcon.props.color).toBe('#F59E0B');
    });
  });

  describe('Priority Display', () => {
    it('should show priority level text', () => {
      const serviceArea = createMockServiceArea({ priority_level: 1 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Priority 1')).toBeTruthy();
    });

    it('should display different priority values', () => {
      const serviceArea = createMockServiceArea({ priority_level: 5 });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Priority 5')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing description', () => {
      const serviceArea = createMockServiceArea({ description: undefined });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('Test description')).toBeNull();
    });

    it('should handle missing max_distance_km', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'radius',
        radius_km: 10,
        max_distance_km: undefined,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Max:/)).toBeNull();
    });

    it('should handle zero surcharges', () => {
      const serviceArea = createMockServiceArea({
        weekend_surcharge: 0,
        evening_surcharge: 0,
        emergency_surcharge: 0,
        emergency_available: false,
      });
      const { queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Weekend/)).toBeNull();
      expect(queryByText(/Evening/)).toBeNull();
      expect(queryByText(/Emergency/)).toBeNull();
    });

    it('should handle very large numbers', () => {
      const serviceArea = createMockServiceArea({
        base_travel_charge: 999999.99,
        per_km_rate: 8888.88,
        minimum_job_value: 777777.77,
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£999999.99')).toBeTruthy();
      expect(getByText('£8888.88')).toBeTruthy();
      expect(getByText('£777777.77')).toBeTruthy();
    });

    it('should handle empty postal codes array', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'postal_codes',
        postal_codes: [],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('0 postal codes')).toBeTruthy();
    });

    it('should handle empty cities array', () => {
      const serviceArea = createMockServiceArea({
        area_type: 'cities',
        cities: [],
      });
      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('0 cities')).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should render complete active radius area with all features', () => {
      const serviceArea = createMockServiceArea({
        area_name: 'Premium Downtown Area',
        description: 'Central business district with premium coverage',
        area_type: 'radius',
        is_active: true,
        is_primary_area: true,
        radius_km: 15,
        max_distance_km: 25,
        base_travel_charge: 35.0,
        per_km_rate: 4.5,
        minimum_job_value: 100.0,
        priority_level: 1,
        response_time_hours: 12,
        weekend_surcharge: 25,
        evening_surcharge: 20,
        emergency_available: true,
        emergency_surcharge: 100,
      });

      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Premium Downtown Area')).toBeTruthy();
      expect(getByText('Central business district with premium coverage')).toBeTruthy();
      expect(getByText('PRIMARY')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Radius Coverage')).toBeTruthy();
      expect(getByText(/Coverage: 15km radius • Max: 25km/)).toBeTruthy();
      expect(getByText('£35.00')).toBeTruthy();
      expect(getByText('£4.50')).toBeTruthy();
      expect(getByText('£100.00')).toBeTruthy();
      expect(getByText('12h')).toBeTruthy();
      expect(getByText('Weekend +25%')).toBeTruthy();
      expect(getByText('Evening +20%')).toBeTruthy();
      expect(getByText('Emergency +100%')).toBeTruthy();
      expect(getByText('Priority 1')).toBeTruthy();
    });

    it('should render complete inactive postal_codes area', () => {
      const serviceArea = createMockServiceArea({
        area_name: 'London Postal Coverage',
        description: 'Selected London postal codes',
        area_type: 'postal_codes',
        is_active: false,
        is_primary_area: false,
        postal_codes: ['SW1A 1AA', 'SW1A 2AA', 'W1A 1AA', 'WC1A 1AA'],
        base_travel_charge: 20.0,
        per_km_rate: 2.0,
        minimum_job_value: 60.0,
        priority_level: 2,
        response_time_hours: 24,
        weekend_surcharge: 0,
        evening_surcharge: 0,
        emergency_available: false,
      });

      const { getByText, queryByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('London Postal Coverage')).toBeTruthy();
      expect(getByText('Selected London postal codes')).toBeTruthy();
      expect(queryByText('PRIMARY')).toBeNull();
      expect(getByText('Inactive')).toBeTruthy();
      expect(getByText('Postal Codes')).toBeTruthy();
      expect(getByText('4 postal codes')).toBeTruthy();
      expect(getByText('£20.00')).toBeTruthy();
      expect(getByText('Priority 2')).toBeTruthy();
      expect(queryByText(/Weekend/)).toBeNull();
      expect(queryByText(/Evening/)).toBeNull();
      expect(queryByText(/Emergency/)).toBeNull();
    });

    it('should render complete cities area', () => {
      const serviceArea = createMockServiceArea({
        area_name: 'Multi-City Coverage',
        area_type: 'cities',
        is_active: true,
        cities: ['London', 'Manchester', 'Birmingham'],
        base_travel_charge: 40.0,
        per_km_rate: 5.0,
        minimum_job_value: 150.0,
        priority_level: 3,
        response_time_hours: 48,
      });

      const { getByText } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Multi-City Coverage')).toBeTruthy();
      expect(getByText('City Coverage')).toBeTruthy();
      expect(getByText('3 cities')).toBeTruthy();
      expect(getByText('£40.00')).toBeTruthy();
      expect(getByText('£5.00')).toBeTruthy();
      expect(getByText('Priority 3')).toBeTruthy();
    });

    it('should handle multiple button presses correctly', () => {
      const serviceArea = createMockServiceArea({ is_active: true });
      const { UNSAFE_getAllByProps } = render(
        <ServiceAreaCard
          serviceArea={serviceArea}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onToggleActive={mockOnToggleActive}
          onDelete={mockOnDelete}
        />
      );

      const editButton = UNSAFE_getAllByProps({ name: 'pencil' })[0].parent;
      const toggleButton = UNSAFE_getAllByProps({ name: 'pause' })[0].parent;
      const deleteButton = UNSAFE_getAllByProps({ name: 'trash' })[0].parent;

      fireEvent.press(editButton!);
      fireEvent.press(toggleButton!);
      fireEvent.press(deleteButton!);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnToggleActive).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should render all area types correctly in sequence', () => {
      const types: Array<'radius' | 'polygon' | 'postal_codes' | 'cities'> = [
        'radius',
        'polygon',
        'postal_codes',
        'cities'
      ];

      types.forEach(type => {
        const serviceArea = createMockServiceArea({
          area_type: type,
          postal_codes: type === 'postal_codes' ? ['SW1A'] : undefined,
          cities: type === 'cities' ? ['London'] : undefined,
        });

        const { getByText } = render(
          <ServiceAreaCard
            serviceArea={serviceArea}
            onPress={mockOnPress}
            onEdit={mockOnEdit}
            onToggleActive={mockOnToggleActive}
            onDelete={mockOnDelete}
          />
        );

        if (type === 'radius') {
          expect(getByText('Radius Coverage')).toBeTruthy();
        } else if (type === 'polygon') {
          expect(getByText('Custom Boundary')).toBeTruthy();
        } else if (type === 'postal_codes') {
          expect(getByText('Postal Codes')).toBeTruthy();
        } else if (type === 'cities') {
          expect(getByText('City Coverage')).toBeTruthy();
        }
      });
    });
  });
});
