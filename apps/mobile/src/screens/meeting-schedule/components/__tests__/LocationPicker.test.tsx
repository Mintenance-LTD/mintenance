/**
 * LocationPicker Component Tests
 *
 * Comprehensive test suite for LocationPicker component
 * Target: 100% coverage
 *
 * @filesize Target: <300 lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LocationPicker } from '../LocationPicker';
import type { LocationData } from '@mintenance/types';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textInverse: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceTertiary: '#F5F5F5',
      success: '#10B981',
      error: '#EF4444',
    },
    spacing: {
      sm: 8,
      md: 12,
      lg: 16,
    },
    borderRadius: {
      lg: 12,
      md: 8,
    },
    typography: {
      fontSize: {
        sm: 12,
        md: 14,
        xl: 20,
      },
      fontWeight: {
        medium: '500',
        semibold: '600',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
  },
}));

// Extended LocationData interface with address field
interface ExtendedLocationData extends LocationData {
  address: string;
}

describe('LocationPicker Component', () => {
  const mockOnRetry = jest.fn();

  // Mock location data
  const mockLocation: ExtendedLocationData = {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Main St, New York, NY 10001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render root element with correct structure', () => {
      const { root } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(root).toBeTruthy();
    });

    it('should always render section title "Location"', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Location')).toBeTruthy();
    });

    it('should render section title in all states', () => {
      const states: ('loading' | 'success' | 'error')[] = ['loading', 'success', 'error'];

      states.forEach(status => {
        const { getByText } = render(
          <LocationPicker
            location={mockLocation}
            locationStatus={status}
            onRetry={mockOnRetry}
          />
        );
        expect(getByText('Location')).toBeTruthy();
      });
    });

    it('should match snapshot in loading state', () => {
      const { toJSON } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Loading State', () => {
    it('should show ActivityIndicator when loading', () => {
      const { UNSAFE_getByType } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(UNSAFE_getByType('ActivityIndicator' as any)).toBeTruthy();
    });

    it('should show loading text "Getting your location..."', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Getting your location...')).toBeTruthy();
    });

    it('should use correct ActivityIndicator size', () => {
      const { UNSAFE_getByType } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      const indicator = UNSAFE_getByType('ActivityIndicator' as any);
      expect(indicator.props.size).toBe('small');
    });

    it('should use correct ActivityIndicator color', () => {
      const { UNSAFE_getByType } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      const indicator = UNSAFE_getByType('ActivityIndicator' as any);
      expect(indicator.props.color).toBe('#007AFF');
    });

    it('should not show error or success states when loading', () => {
      const { queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Failed to get location')).toBeNull();
      expect(queryByText('Meeting Location')).toBeNull();
    });

    it('should not show retry button when loading', () => {
      const { queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Retry')).toBeNull();
    });

    it('should ignore location prop when loading', () => {
      const { queryByText } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText(mockLocation.address)).toBeNull();
    });

    it('should match snapshot with location but loading state', () => {
      const { toJSON } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Error State', () => {
    it('should show error message when status is error', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Failed to get location')).toBeTruthy();
    });

    it('should show error icon when status is error', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const errorIcon = icons.find((icon: any) => icon.props.name === 'location-outline');
      expect(errorIcon).toBeTruthy();
    });

    it('should use correct error icon size', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const errorIcon = icons.find((icon: any) => icon.props.name === 'location-outline');
      expect(errorIcon.props.size).toBe(24);
    });

    it('should use correct error icon color', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const errorIcon = icons.find((icon: any) => icon.props.name === 'location-outline');
      expect(errorIcon.props.color).toBe('#EF4444');
    });

    it('should show Retry button when error', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should call onRetry when Retry button is pressed', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      fireEvent.press(getByText('Retry'));
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry multiple times on multiple presses', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });

    it('should not show loading or success states when error', () => {
      const { queryByText, UNSAFE_queryByType } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeNull();
      expect(UNSAFE_queryByType('ActivityIndicator' as any)).toBeNull();
      expect(queryByText('Meeting Location')).toBeNull();
    });

    it('should ignore location prop when error', () => {
      const { queryByText } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText(mockLocation.address)).toBeNull();
    });

    it('should match snapshot in error state', () => {
      const { toJSON } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot in error state with location data', () => {
      const { toJSON } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Success State', () => {
    it('should show location when success and location is provided', () => {
      const { getByText } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Meeting Location')).toBeTruthy();
      expect(getByText(mockLocation.address)).toBeTruthy();
    });

    it('should not show anything when success but location is null', () => {
      const { queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Meeting Location')).toBeNull();
    });

    it('should show success icon when location is provided', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const successIcon = icons.find((icon: any) => icon.props.name === 'location');
      expect(successIcon).toBeTruthy();
    });

    it('should use correct success icon size', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const successIcon = icons.find((icon: any) => icon.props.name === 'location');
      expect(successIcon.props.size).toBe(20);
    });

    it('should use correct success icon color', () => {
      const { UNSAFE_getAllByType } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const successIcon = icons.find((icon: any) => icon.props.name === 'location');
      expect(successIcon.props.color).toBe('#10B981');
    });

    it('should not show loading or error states when success', () => {
      const { queryByText, UNSAFE_queryByType } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeNull();
      expect(UNSAFE_queryByType('ActivityIndicator' as any)).toBeNull();
      expect(queryByText('Failed to get location')).toBeNull();
      expect(queryByText('Retry')).toBeNull();
    });

    it('should display address with short format', () => {
      const shortLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
      };
      const { getByText } = render(
        <LocationPicker
          location={shortLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('123 Main St')).toBeTruthy();
    });

    it('should display address with long format', () => {
      const longLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main Street, Apartment 4B, New York, NY 10001, United States',
      };
      const { getByText } = render(
        <LocationPicker
          location={longLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('123 Main Street, Apartment 4B, New York, NY 10001, United States')).toBeTruthy();
    });

    it('should display address with special characters', () => {
      const specialLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: "O'Brien's Café & Restaurant, 42nd St",
      };
      const { getByText } = render(
        <LocationPicker
          location={specialLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText("O'Brien's Café & Restaurant, 42nd St")).toBeTruthy();
    });

    it('should display address with numbers only', () => {
      const numericLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123',
      };
      const { getByText } = render(
        <LocationPicker
          location={numericLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('123')).toBeTruthy();
    });

    it('should match snapshot in success state', () => {
      const { toJSON } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot in success state without location', () => {
      const { toJSON } = render(
        <LocationPicker
          location={null}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to success', () => {
      const { rerender, queryByText, UNSAFE_queryByType } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeTruthy();
      expect(UNSAFE_queryByType('ActivityIndicator' as any)).toBeTruthy();

      rerender(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeNull();
      expect(UNSAFE_queryByType('ActivityIndicator' as any)).toBeNull();
      expect(queryByText(mockLocation.address)).toBeTruthy();
    });

    it('should transition from loading to error', () => {
      const { rerender, queryByText, UNSAFE_queryByType } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeTruthy();

      rerender(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Getting your location...')).toBeNull();
      expect(UNSAFE_queryByType('ActivityIndicator' as any)).toBeNull();
      expect(queryByText('Failed to get location')).toBeTruthy();
    });

    it('should transition from error to loading on retry', () => {
      const { rerender, queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Failed to get location')).toBeTruthy();

      rerender(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Failed to get location')).toBeNull();
      expect(queryByText('Getting your location...')).toBeTruthy();
    });

    it('should transition from error to success', () => {
      const { rerender, queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Failed to get location')).toBeTruthy();

      rerender(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Failed to get location')).toBeNull();
      expect(queryByText(mockLocation.address)).toBeTruthy();
    });

    it('should handle rapid state changes', () => {
      const { rerender, queryByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <LocationPicker
            location={null}
            locationStatus="error"
            onRetry={mockOnRetry}
          />
        );
        rerender(
          <LocationPicker
            location={null}
            locationStatus="loading"
            onRetry={mockOnRetry}
          />
        );
      }

      rerender(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );

      expect(queryByText(mockLocation.address)).toBeTruthy();
    });

    it('should update address when location changes', () => {
      const { rerender, getByText, queryByText } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText(mockLocation.address)).toBeTruthy();

      const newLocation: ExtendedLocationData = {
        latitude: 34.0522,
        longitude: -118.2437,
        address: '456 Sunset Blvd, Los Angeles, CA 90028',
      };
      rerender(
        <LocationPicker
          location={newLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText(mockLocation.address)).toBeNull();
      expect(getByText(newLocation.address)).toBeTruthy();
    });
  });

  describe('Callback Reference Changes', () => {
    it('should handle onRetry callback changes', () => {
      const newOnRetry = jest.fn();
      const { rerender, getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );

      rerender(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={newOnRetry}
        />
      );

      fireEvent.press(getByText('Retry'));
      expect(newOnRetry).toHaveBeenCalledTimes(1);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should use latest callback when changed multiple times', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      const { rerender, getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={callback1}
        />
      );

      rerender(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={callback2}
        />
      );

      rerender(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={callback3}
        />
      );

      fireEvent.press(getByText('Retry'));
      expect(callback3).toHaveBeenCalledTimes(1);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount without errors', () => {
      expect(() =>
        render(
          <LocationPicker
            location={null}
            locationStatus="loading"
            onRetry={mockOnRetry}
          />
        )
      ).not.toThrow();
    });

    it('should unmount without errors', () => {
      const { unmount } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple mount/unmount cycles', () => {
      const { unmount: unmount1 } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      unmount1();

      const { unmount: unmount2 } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      unmount2();

      const { unmount: unmount3 } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(() => unmount3()).not.toThrow();
    });
  });

  describe('Rendering Consistency', () => {
    it('should render consistently across multiple renders', () => {
      const { toJSON: toJSON1 } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      const { toJSON: toJSON2 } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON1()).toEqual(toJSON2());
    });

    it('should maintain structure across all states', () => {
      const states: ('loading' | 'success' | 'error')[] = ['loading', 'success', 'error'];

      states.forEach(status => {
        const { getByText } = render(
          <LocationPicker
            location={mockLocation}
            locationStatus={status}
            onRetry={mockOnRetry}
          />
        );
        expect(getByText('Location')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty address', () => {
      const emptyLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '',
      };
      const { queryByText } = render(
        <LocationPicker
          location={emptyLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Meeting Location')).toBeTruthy();
    });

    it('should handle whitespace-only address', () => {
      const whitespaceLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '   ',
      };
      const { getByText } = render(
        <LocationPicker
          location={whitespaceLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('   ')).toBeTruthy();
    });

    it('should handle unicode characters in address', () => {
      const unicodeLocation: ExtendedLocationData = {
        latitude: 48.8566,
        longitude: 2.3522,
        address: 'Café de Flore, 172 Boulevard Saint-Germain, Paris 🇫🇷',
      };
      const { getByText } = render(
        <LocationPicker
          location={unicodeLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Café de Flore, 172 Boulevard Saint-Germain, Paris 🇫🇷')).toBeTruthy();
    });

    it('should handle very long address', () => {
      const longAddress = 'A'.repeat(500);
      const longLocation: ExtendedLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: longAddress,
      };
      const { getByText } = render(
        <LocationPicker
          location={longLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText(longAddress)).toBeTruthy();
    });

    it('should handle undefined location gracefully', () => {
      const { queryByText } = render(
        <LocationPicker
          location={undefined as any}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(queryByText('Meeting Location')).toBeNull();
    });

    it('should not crash with missing onRetry', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={undefined as any}
        />
      );
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should accept all valid locationStatus values', () => {
      const statuses: ('loading' | 'success' | 'error')[] = ['loading', 'success', 'error'];

      statuses.forEach(status => {
        expect(() =>
          render(
            <LocationPicker
              location={mockLocation}
              locationStatus={status}
              onRetry={mockOnRetry}
            />
          )
        ).not.toThrow();
      });
    });

    it('should accept null location', () => {
      expect(() =>
        render(
          <LocationPicker
            location={null}
            locationStatus="loading"
            onRetry={mockOnRetry}
          />
        )
      ).not.toThrow();
    });

    it('should accept valid location object', () => {
      expect(() =>
        render(
          <LocationPicker
            location={mockLocation}
            locationStatus="success"
            onRetry={mockOnRetry}
          />
        )
      ).not.toThrow();
    });

    it('should accept function as onRetry', () => {
      const fn = () => {};
      expect(() =>
        render(
          <LocationPicker
            location={null}
            locationStatus="error"
            onRetry={fn}
          />
        )
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible text content in loading state', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="loading"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Getting your location...')).toBeTruthy();
    });

    it('should have accessible text content in error state', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Failed to get location')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should have accessible text content in success state', () => {
      const { getByText } = render(
        <LocationPicker
          location={mockLocation}
          locationStatus="success"
          onRetry={mockOnRetry}
        />
      );
      expect(getByText('Meeting Location')).toBeTruthy();
      expect(getByText(mockLocation.address)).toBeTruthy();
    });

    it('should have touchable retry button', () => {
      const { getByText } = render(
        <LocationPicker
          location={null}
          locationStatus="error"
          onRetry={mockOnRetry}
        />
      );
      const retryButton = getByText('Retry').parent;
      expect(retryButton?.type).toBe('TouchableOpacity');
    });
  });
});
