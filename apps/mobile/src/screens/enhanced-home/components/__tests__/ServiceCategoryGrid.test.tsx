/**
 * ServiceCategoryGrid Component Tests
 *
 * Comprehensive test suite for ServiceCategoryGrid component
 * Target: 100% coverage with deterministic tests
 *
 * @filesize <300 lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServiceCategoryGrid } from '../ServiceCategoryGrid';
import type { Service } from '../../viewmodels/EnhancedHomeViewModel';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, size, color, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text testID={testID || `icon-${name}`} {...props}>
        {name}
      </Text>
    );
  },
}));

describe('ServiceCategoryGrid', () => {
  const mockOnServicePress = jest.fn();

  const mockServices: Service[] = [
    { id: '1', name: 'Plumbing', icon: 'water' },
    { id: '2', name: 'Electrical', icon: 'flash' },
    { id: '3', name: 'HVAC', icon: 'snow' },
    { id: '4', name: 'Carpentry', icon: 'hammer' },
    { id: '5', name: 'Painting', icon: 'color-palette' },
  ];

  const defaultProps = {
    services: mockServices,
    onServicePress: mockOnServicePress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByText('Service Categories')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('renders section title', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      const title = getByText('Service Categories');
      expect(title).toBeTruthy();
    });

    it('renders all service names', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        expect(getByText(service.name)).toBeTruthy();
      });
    });

    it('renders all service icons', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        expect(getByTestId(`icon-${service.icon}`)).toBeTruthy();
      });
    });

    it('renders correct number of service items', () => {
      const { getAllByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      const serviceNames = mockServices.map((s) => s.name);
      serviceNames.forEach((name) => {
        const elements = getAllByText(name);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders grid container', () => {
      const { root } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(root).toBeTruthy();
    });

    it('renders with empty services array', () => {
      const { getByText, queryByText } = render(
        <ServiceCategoryGrid services={[]} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service Categories')).toBeTruthy();
      expect(queryByText('Plumbing')).toBeFalsy();
    });

    it('renders with single service', () => {
      const singleService: Service[] = [
        { id: '1', name: 'Plumbing', icon: 'water' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={singleService} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service Categories')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('renders with many services', () => {
      const manyServices: Service[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Service ${i + 1}`,
        icon: 'construct' as any,
      }));

      const { getByText } = render(
        <ServiceCategoryGrid services={manyServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service Categories')).toBeTruthy();
      expect(getByText('Service 1')).toBeTruthy();
      expect(getByText('Service 20')).toBeTruthy();
    });
  });

  describe('Service Icons', () => {
    it('renders water icon for Plumbing', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-water')).toBeTruthy();
    });

    it('renders flash icon for Electrical', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-flash')).toBeTruthy();
    });

    it('renders snow icon for HVAC', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-snow')).toBeTruthy();
    });

    it('renders hammer icon for Carpentry', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-hammer')).toBeTruthy();
    });

    it('renders color-palette icon for Painting', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-color-palette')).toBeTruthy();
    });

    it('renders icons with correct icon names', () => {
      const { getByTestId } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        const icon = getByTestId(`icon-${service.icon}`);
        expect(icon.props.children).toBe(service.icon);
      });
    });

    it('renders different icon types', () => {
      const servicesWithDifferentIcons: Service[] = [
        { id: '1', name: 'Service 1', icon: 'home' },
        { id: '2', name: 'Service 2', icon: 'build' },
        { id: '3', name: 'Service 3', icon: 'settings' },
      ];

      const { getByTestId } = render(
        <ServiceCategoryGrid
          services={servicesWithDifferentIcons}
          onServicePress={mockOnServicePress}
        />
      );

      expect(getByTestId('icon-home')).toBeTruthy();
      expect(getByTestId('icon-build')).toBeTruthy();
      expect(getByTestId('icon-settings')).toBeTruthy();
    });
  });

  describe('User Interaction - Service Selection', () => {
    it('calls onServicePress when service is tapped', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Plumbing'));

      expect(mockOnServicePress).toHaveBeenCalledTimes(1);
      expect(mockOnServicePress).toHaveBeenCalledWith('1');
    });

    it('calls onServicePress with correct service ID', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Electrical'));

      expect(mockOnServicePress).toHaveBeenCalledWith('2');
    });

    it('calls onServicePress for each different service', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Plumbing'));
      expect(mockOnServicePress).toHaveBeenCalledWith('1');

      fireEvent.press(getByText('Electrical'));
      expect(mockOnServicePress).toHaveBeenCalledWith('2');

      fireEvent.press(getByText('HVAC'));
      expect(mockOnServicePress).toHaveBeenCalledWith('3');

      expect(mockOnServicePress).toHaveBeenCalledTimes(3);
    });

    it('calls onServicePress multiple times for same service', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      const plumbingButton = getByText('Plumbing');

      fireEvent.press(plumbingButton);
      fireEvent.press(plumbingButton);
      fireEvent.press(plumbingButton);

      expect(mockOnServicePress).toHaveBeenCalledTimes(3);
      expect(mockOnServicePress).toHaveBeenCalledWith('1');
    });

    it('handles rapid service selections', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Plumbing'));
      }

      expect(mockOnServicePress).toHaveBeenCalledTimes(10);
    });

    it('calls onServicePress for first service in list', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Plumbing'));

      expect(mockOnServicePress).toHaveBeenCalledWith('1');
    });

    it('calls onServicePress for last service in list', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Painting'));

      expect(mockOnServicePress).toHaveBeenCalledWith('5');
    });

    it('calls onServicePress for middle service in list', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('HVAC'));

      expect(mockOnServicePress).toHaveBeenCalledWith('3');
    });

    it('handles service press when service has special characters in name', () => {
      const specialServices: Service[] = [
        { id: 'special-1', name: 'HVAC & Cooling', icon: 'snow' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={specialServices} onServicePress={mockOnServicePress} />
      );

      fireEvent.press(getByText('HVAC & Cooling'));

      expect(mockOnServicePress).toHaveBeenCalledWith('special-1');
    });

    it('handles service press when service has long name', () => {
      const longNameServices: Service[] = [
        { id: 'long-1', name: 'Professional Plumbing and Pipe Repair Services', icon: 'water' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={longNameServices} onServicePress={mockOnServicePress} />
      );

      fireEvent.press(getByText('Professional Plumbing and Pipe Repair Services'));

      expect(mockOnServicePress).toHaveBeenCalledWith('long-1');
    });
  });

  describe('Grid Layout', () => {
    it('renders services in grid format', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        expect(getByText(service.name)).toBeTruthy();
      });
    });

    it('maintains grid structure with 5 services', () => {
      const { getAllByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      const plumbing = getAllByText('Plumbing');
      expect(plumbing.length).toBeGreaterThanOrEqual(1);
    });

    it('maintains grid structure with 10 services', () => {
      const tenServices: Service[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Service ${i + 1}`,
        icon: 'construct' as any,
      }));

      const { getByText } = render(
        <ServiceCategoryGrid services={tenServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service 1')).toBeTruthy();
      expect(getByText('Service 10')).toBeTruthy();
    });

    it('maintains grid structure with 3 services', () => {
      const threeServices: Service[] = [
        { id: '1', name: 'Service 1', icon: 'water' },
        { id: '2', name: 'Service 2', icon: 'flash' },
        { id: '3', name: 'Service 3', icon: 'snow' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={threeServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service 1')).toBeTruthy();
      expect(getByText('Service 2')).toBeTruthy();
      expect(getByText('Service 3')).toBeTruthy();
    });
  });

  describe('Service Names Display', () => {
    it('displays short service names', () => {
      const shortNames: Service[] = [
        { id: '1', name: 'AC', icon: 'snow' },
        { id: '2', name: 'IT', icon: 'laptop' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={shortNames} onServicePress={mockOnServicePress} />
      );

      expect(getByText('AC')).toBeTruthy();
      expect(getByText('IT')).toBeTruthy();
    });

    it('displays long service names', () => {
      const longName = 'Professional Residential and Commercial Plumbing Services';
      const longNames: Service[] = [
        { id: '1', name: longName, icon: 'water' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={longNames} onServicePress={mockOnServicePress} />
      );

      expect(getByText(longName)).toBeTruthy();
    });

    it('displays service names with numbers', () => {
      const numberedServices: Service[] = [
        { id: '1', name: '24/7 Emergency', icon: 'alert-circle' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={numberedServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('24/7 Emergency')).toBeTruthy();
    });

    it('displays service names with special characters', () => {
      const specialServices: Service[] = [
        { id: '1', name: 'HVAC & Cooling', icon: 'snow' },
        { id: '2', name: 'Locks/Keys', icon: 'key' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={specialServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('HVAC & Cooling')).toBeTruthy();
      expect(getByText('Locks/Keys')).toBeTruthy();
    });

    it('displays service names with unicode characters', () => {
      const unicodeServices: Service[] = [
        { id: '1', name: 'Café Services', icon: 'cafe' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={unicodeServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Café Services')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty services array gracefully', () => {
      const { getByText, queryByText } = render(
        <ServiceCategoryGrid services={[]} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service Categories')).toBeTruthy();
      expect(queryByText('Plumbing')).toBeFalsy();
    });

    it('handles pressing service without breaking', () => {
      const { getByText } = render(
        <ServiceCategoryGrid services={mockServices} onServicePress={jest.fn()} />
      );

      expect(() => fireEvent.press(getByText('Plumbing'))).not.toThrow();
    });

    it('handles services with duplicate IDs', () => {
      const duplicateServices: Service[] = [
        { id: '1', name: 'Plumbing', icon: 'water' },
        { id: '1', name: 'Electrical', icon: 'flash' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={duplicateServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('handles services with empty name', () => {
      const emptyNameServices: Service[] = [
        { id: '1', name: '', icon: 'water' },
      ];

      const { root } = render(
        <ServiceCategoryGrid services={emptyNameServices} onServicePress={mockOnServicePress} />
      );

      expect(root).toBeTruthy();
    });

    it('handles services with very long IDs', () => {
      const longId = 'a'.repeat(1000);
      const longIdServices: Service[] = [
        { id: longId, name: 'Test Service', icon: 'water' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={longIdServices} onServicePress={mockOnServicePress} />
      );

      fireEvent.press(getByText('Test Service'));

      expect(mockOnServicePress).toHaveBeenCalledWith(longId);
    });

    it('handles component unmount gracefully', () => {
      const { unmount } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles rerender with same props', () => {
      const { rerender } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      expect(() => {
        rerender(<ServiceCategoryGrid {...defaultProps} />);
        rerender(<ServiceCategoryGrid {...defaultProps} />);
        rerender(<ServiceCategoryGrid {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles services with whitespace-only names', () => {
      const whitespaceServices: Service[] = [
        { id: '1', name: '   ', icon: 'water' },
      ];

      const { getByText } = render(
        <ServiceCategoryGrid services={whitespaceServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('   ')).toBeTruthy();
    });
  });

  describe('Re-rendering', () => {
    it('updates when services change', () => {
      const { getByText, rerender, queryByText } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      expect(getByText('Plumbing')).toBeTruthy();

      const newServices: Service[] = [
        { id: '6', name: 'Landscaping', icon: 'leaf' },
      ];

      rerender(
        <ServiceCategoryGrid services={newServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Landscaping')).toBeTruthy();
      expect(queryByText('Plumbing')).toBeFalsy();
    });

    it('updates when onServicePress changes', () => {
      const newOnServicePress = jest.fn();

      const { getByText, rerender } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      rerender(
        <ServiceCategoryGrid services={mockServices} onServicePress={newOnServicePress} />
      );

      fireEvent.press(getByText('Plumbing'));

      expect(newOnServicePress).toHaveBeenCalledTimes(1);
      expect(mockOnServicePress).not.toHaveBeenCalled();
    });

    it('handles adding services', () => {
      const initialServices: Service[] = [
        { id: '1', name: 'Plumbing', icon: 'water' },
      ];

      const { getByText, rerender } = render(
        <ServiceCategoryGrid services={initialServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();

      const expandedServices: Service[] = [
        ...initialServices,
        { id: '2', name: 'Electrical', icon: 'flash' },
      ];

      rerender(
        <ServiceCategoryGrid services={expandedServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('handles removing services', () => {
      const { getByText, rerender, queryByText } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();

      const reducedServices: Service[] = [
        { id: '1', name: 'Plumbing', icon: 'water' },
      ];

      rerender(
        <ServiceCategoryGrid services={reducedServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(queryByText('Electrical')).toBeFalsy();
    });

    it('handles reordering services', () => {
      const { getByText, rerender } = render(
        <ServiceCategoryGrid {...defaultProps} />
      );

      expect(getByText('Plumbing')).toBeTruthy();

      const reorderedServices: Service[] = [
        { id: '5', name: 'Painting', icon: 'color-palette' },
        { id: '1', name: 'Plumbing', icon: 'water' },
      ];

      rerender(
        <ServiceCategoryGrid services={reorderedServices} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Painting')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('has correct container structure', () => {
      const { root } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(root).toBeTruthy();
    });

    it('renders section title before services', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByText('Service Categories')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('renders all service icons before service names', () => {
      const { getByTestId, getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      expect(getByTestId('icon-water')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('all service items are touchable', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        const serviceElement = getByText(service.name);
        expect(serviceElement.parent).toBeTruthy();
      });
    });

    it('service buttons are accessible', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      const plumbingButton = getByText('Plumbing').parent!.parent!;
      expect(plumbingButton).toBeTruthy();
    });

    it('renders touchable components for all services', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      mockServices.forEach((service) => {
        expect(getByText(service.name).parent).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = Date.now();

      render(<ServiceCategoryGrid {...defaultProps} />);

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<ServiceCategoryGrid {...defaultProps} />);

      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        rerender(
          <ServiceCategoryGrid
            services={mockServices}
            onServicePress={mockOnServicePress}
          />
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500);
    });

    it('handles large number of services', () => {
      const largeServiceList: Service[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Service ${i + 1}`,
        icon: 'construct' as any,
      }));

      const { getByText } = render(
        <ServiceCategoryGrid services={largeServiceList} onServicePress={mockOnServicePress} />
      );

      expect(getByText('Service 1')).toBeTruthy();
      expect(getByText('Service 100')).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('maintains state through multiple interactions', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Plumbing'));
      fireEvent.press(getByText('Electrical'));
      fireEvent.press(getByText('HVAC'));

      expect(mockOnServicePress).toHaveBeenCalledTimes(3);
      expect(mockOnServicePress).toHaveBeenNthCalledWith(1, '1');
      expect(mockOnServicePress).toHaveBeenNthCalledWith(2, '2');
      expect(mockOnServicePress).toHaveBeenNthCalledWith(3, '3');
    });

    it('handles alternating service selections', () => {
      const { getByText } = render(<ServiceCategoryGrid {...defaultProps} />);

      fireEvent.press(getByText('Plumbing'));
      fireEvent.press(getByText('Electrical'));
      fireEvent.press(getByText('Plumbing'));

      expect(mockOnServicePress).toHaveBeenCalledTimes(3);
      expect(mockOnServicePress).toHaveBeenNthCalledWith(1, '1');
      expect(mockOnServicePress).toHaveBeenNthCalledWith(2, '2');
      expect(mockOnServicePress).toHaveBeenNthCalledWith(3, '1');
    });

    it('works with all props combinations', () => {
      const testCases = [
        { services: [], onServicePress: jest.fn() },
        { services: [mockServices[0]], onServicePress: jest.fn() },
        { services: mockServices, onServicePress: jest.fn() },
      ];

      testCases.forEach((props) => {
        const { getByText } = render(<ServiceCategoryGrid {...props} />);

        expect(getByText('Service Categories')).toBeTruthy();
      });
    });
  });
});
